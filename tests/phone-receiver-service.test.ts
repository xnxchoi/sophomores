import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRotatingReceiverHealth, createSupervisedReceiverFetch, serveReceiver } from '../scripts/phone-receiver-service';

const config = { origin: 'http://localhost:3240', recipient: 'verify@example.invalid', mailboxId: '123',
  databaseUrl: 'postgres://fixture@localhost/sophomores_verification_test', secret: 'a'.repeat(64) };

test('continuous readiness rotates before five minutes without dropping the old healthy lease first', async () => {
  let clock = 0;
  let sequence = 0;
  const events: string[] = [];
  const health = createRotatingReceiverHealth({ config, directory: '/fixture', now: () => clock,
    create: async ({ deadline }) => {
      const id = ++sequence;
      events.push(`create:${id}:${deadline}`);
      return { healthy: async () => { events.push(`healthy:${id}`); }, stop: async () => { events.push(`stop:${id}`); } };
    } });
  assert.deepEqual(events, [], 'startup itself is not readiness');
  await health.healthy();
  clock = 260_000; await health.healthy();
  clock = 270_000; await health.healthy();
  assert.deepEqual(events, ['create:1:300000', 'healthy:1', 'healthy:1', 'create:2:570000', 'healthy:2', 'stop:1']);
  await health.pause();
  clock = 280_000; await health.healthy();
  await health.stop();
  await assert.rejects(health.healthy());
  assert.deepEqual(events.slice(-4), ['stop:2', 'create:3:580000', 'healthy:3', 'stop:3']);
});

test('continuous scans stay serialized, keep ten-second cadence and clear readiness on abort', async () => {
  const controller = new AbortController();
  const events: string[] = [];
  let polls = 0;
  await serveReceiver({ signal: controller.signal, poll: async () => {
    events.push('poll'); if (++polls === 3) controller.abort();
  }, health: { healthy: async () => { events.push('healthy'); }, pause: async () => { events.push('pause'); },
    stop: async () => { events.push('stop'); } },
  sleep: async (ms) => { events.push(`sleep:${ms}`); } });
  assert.deepEqual(events, ['poll', 'healthy', 'sleep:10000', 'poll', 'healthy', 'sleep:10000', 'poll', 'stop']);
});

test('provider failures invalidate readiness before bounded backoff and stop after three failures', async () => {
  const events: string[] = [];
  await assert.rejects(serveReceiver({ signal: new AbortController().signal,
    poll: async () => { events.push('poll'); throw new Error('fixture-provider-secret'); },
    health: { healthy: async () => assert.fail('failed scan is not healthy'), pause: async () => { events.push('pause'); },
      stop: async () => { events.push('stop'); } }, sleep: async (ms) => { events.push(`sleep:${ms}`); }, log: () => {}
  }), /Receiver consecutive scan failures/);
  assert.deepEqual(events, ['poll', 'pause', 'sleep:10000', 'poll', 'pause', 'sleep:30000', 'poll', 'pause', 'stop']);
});

test('budget pause is not a provider retry and a later successful scan may restore readiness', async () => {
  const controller = new AbortController();
  const events: string[] = [];
  let polls = 0;
  let rateDelay = 60_000;
  await serveReceiver({ signal: controller.signal,
    poll: async () => { if (++polls === 1) throw new Error('wrapped-budget-failure'); },
    takeRateDelay: () => { const delay = rateDelay; rateDelay = 0; return delay; },
    health: { healthy: async () => { events.push('healthy'); controller.abort(); },
      pause: async () => { events.push('pause'); }, stop: async () => { events.push('stop'); } },
    sleep: async (ms) => { events.push(`sleep:${ms}`); }, log: () => {} });
  assert.deepEqual(events, ['pause', 'sleep:60000', 'healthy', 'stop']);
});

test('abort invalidates health before a blocked scan resolves and cleanup is awaited once', async () => {
  const controller = new AbortController();
  const events: string[] = [];
  let finish!: () => void;
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const run = serveReceiver({ signal: controller.signal,
    poll: async () => { entered(); await new Promise<void>(resolve => { finish = resolve; }); events.push('poll-ended'); },
    health: { healthy: async () => assert.fail('aborted scan published health'), pause: async () => {},
      stop: async () => { events.push('stop'); } } });
  await started; controller.abort();
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['stop']);
  finish(); await run;
  assert.deepEqual(events, ['stop', 'poll-ended']);
});

test('request timeout starts after IPC budget grant and counts every provider call', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const controller = new AbortController();
  let grant!: () => void;
  let calls = 0;
  let signal: AbortSignal | undefined;
  const fetcher = createSupervisedReceiverFetch({ signal: controller.signal,
    requestBudget: () => new Promise<void>(resolve => { grant = resolve; }),
    timeout: () => { calls++; return AbortSignal.timeout(15_000); },
    fetch: async (_url, init) => { signal = init?.signal ?? undefined; return new Response('{}'); } });
  const pending = fetcher('https://mail.zoho.com');
  assert.equal(calls, 0);
  grant(); await pending;
  assert.equal(calls, 1); assert.equal(signal?.aborted, false);
  controller.abort(); assert.equal(signal?.aborted, true);
});

test('denied budgets and an already aborted receiver never contact a provider', async () => {
  const fetcher = createSupervisedReceiverFetch({ signal: new AbortController().signal,
    requestBudget: async () => { throw new Error('fixture denied'); }, fetch: async () => assert.fail('unexpected provider') });
  await assert.rejects(fetcher('https://mail.zoho.com'), /fixture denied/);
  const stopped = createSupervisedReceiverFetch({ signal: AbortSignal.abort(),
    requestBudget: async () => assert.fail('unexpected budget'), fetch: async () => assert.fail('unexpected provider') });
  await assert.rejects(stopped('https://mail.zoho.com'));
});
