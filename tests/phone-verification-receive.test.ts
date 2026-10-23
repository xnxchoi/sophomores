import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseReceiverCommand, receiverFetch, watchReceiver } from '../scripts/phone-verification-receive';

test('receive CLI defaults to one-shot and rejects unbounded runs or credential arguments', () => {
  assert.deepEqual(parseReceiverCommand([]), { command: 'once', seconds: 60 });
  assert.deepEqual(parseReceiverCommand(['watch']), { command: 'watch', seconds: 300 });
  assert.deepEqual(parseReceiverCommand(['watch', '--seconds', '30']), { command: 'watch', seconds: 30 });
  for (const args of [['watch', '--seconds', '301'], ['watch', '--seconds', '0'], ['once', 'token'], ['watch', '--seconds', '3e2'], ['unknown']]) assert.throws(() => parseReceiverCommand(args));
});
test('receiver HTTP budget and cancellation apply across metadata, MIME and OAuth requests', async () => {
  let calls = 0;
  const controller = new AbortController();
  const fetch = receiverFetch({ signal: controller.signal, maximum: 2, fetch: async (_url, init) => {
    calls++; assert.ok(init?.signal); return new Response('{}');
  } });
  await fetch('https://mail.zoho.com'); await fetch('https://accounts.zoho.com');
  await assert.rejects(fetch('https://mail.zoho.com'));
  assert.equal(calls, 2);
  const stopped = receiverFetch({ signal: AbortSignal.abort(), maximum: 2, fetch: async () => { throw Error('must not fetch'); } });
  await assert.rejects(stopped('https://mail.zoho.com'));
  assert.throws(() => receiverFetch({ signal: controller.signal, maximum: 151 }));
});
test('watch interval is serialized and bounded; errors are surfaced without retrying', async () => {
  let clock = 0; let polls = 0;
  await watchReceiver({ signal: new AbortController().signal, seconds: 30, now: () => clock,
    sleep: async (ms) => { clock += ms; }, poll: async () => { polls++; clock += 2000; } });
  assert.equal(polls, 3); assert.equal(clock, 30_000);
  let attempts = 0;
  await assert.rejects(watchReceiver({ signal: new AbortController().signal, seconds: 30, now: () => 0,
    sleep: async () => {}, poll: async () => { attempts++; throw Error('synthetic-provider-error'); } }));
  assert.equal(attempts, 1);
  await watchReceiver({ signal: AbortSignal.abort(), seconds: 30, poll: async () => { throw Error('must not run'); } });
});
test('normal watch expiry during the real abortable sleep is not reported as failure', async () => {
  const controller = new AbortController(); let polls = 0;
  const timer = setTimeout(() => controller.abort('deadline'), 10);
  try {
    await watchReceiver({ signal: controller.signal, seconds: 10, poll: async () => { polls++; } });
    assert.equal(polls, 1);
  } finally { clearTimeout(timer); }
});
