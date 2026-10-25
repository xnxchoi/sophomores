import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, stat, writeFile, chmod, symlink, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createReceiverHealthLease, receiverHealthIsReady, receiverHealthDirectory } from '../lib/phone-verification/server/receiver-health';
import { createPhoneVerificationHandlers, SESSION_COOKIE } from '../lib/phone-verification/server/http';

const config = { origin: 'http://localhost:3240', mailboxId: '123456789',
  databaseUrl: 'postgres://private:synthetic-password@127.0.0.1:5432/sophomores_verification_test',
  recipient: 'verify@example.invalid', secret: 'a'.repeat(64) };
async function fixture(run: (directory: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'receiver-health-'));
  try { await run(join(root, 'health')); } finally { await rm(root, { recursive: true, force: true }); }
}
test('receiver readiness needs a successful poll and expires within thirty seconds', async () => {
  await fixture(async (directory) => {
    let clock = 1_000_000;
    const options = { directory, config, now: () => clock };
    assert.equal(await receiverHealthIsReady(options), false);
    const lease = await createReceiverHealthLease({ ...options, deadline: clock + 300_000 });
    assert.equal(await receiverHealthIsReady(options), false);
    await lease.healthy();
    assert.equal(await receiverHealthIsReady(options), true);
    clock += 30_000;
    assert.equal(await receiverHealthIsReady(options), false);
    await lease.healthy();
    assert.equal(await receiverHealthIsReady(options), true);
    await lease.stop();
    assert.equal(await receiverHealthIsReady(options), false);
    await assert.rejects(lease.healthy());
  });
});
test('watch deadline bounds readiness even after a recent successful poll', async () => {
  await fixture(async (directory) => {
    let clock = 1_000_000;
    const options = { directory, config, now: () => clock };
    const lease = await createReceiverHealthLease({ ...options, deadline: clock + 10_000 });
    await lease.healthy(); clock += 10_000;
    assert.equal(await receiverHealthIsReady(options), false);
    await assert.rejects(lease.healthy());
    await lease.stop();
    await assert.rejects(createReceiverHealthLease({ ...options, deadline: clock + 300_001 }));
  });
});
test('lease scope pins mailbox, origin, database, recipient and secret without exposing private values', async () => {
  await fixture(async (directory) => {
    const options = { directory, config, now: () => 1_000_000 };
    const lease = await createReceiverHealthLease({ ...options, deadline: 1_300_000 });
    await lease.healthy();
    for (const patch of [{ origin: 'http://localhost:3241' }, { mailboxId: '987654321' }, { recipient: 'other@example.invalid' },
      { databaseUrl: config.databaseUrl + '_other' }, { secret: 'b'.repeat(64) }])
      assert.equal(await receiverHealthIsReady({ ...options, config: { ...config, ...patch } }), false);
    const files = await readdir(directory);
    const path = join(directory, files[0]);
    assert.equal((await stat(directory)).mode & 0o777, 0o700);
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    const text = await readFile(path, 'utf8');
    for (const value of [config.origin, config.mailboxId, config.databaseUrl, config.recipient, config.secret])
      assert.equal(text.includes(value), false);
    await lease.stop();
  });
});
test('one receiver stopping cannot invalidate another receiver lease', async () => {
  await fixture(async (directory) => {
    const options = { directory, config, now: () => 1_000_000, deadline: 1_300_000 };
    const first = await createReceiverHealthLease(options);
    const second = await createReceiverHealthLease(options);
    await first.healthy(); await second.healthy(); await first.stop();
    assert.equal(await receiverHealthIsReady(options), true);
    assert.equal((await readdir(directory)).length, 1);
    await second.stop();
    assert.equal(await receiverHealthIsReady(options), false);
  });
});
test('tampered, malformed, future-clock, oversized, public-mode and symlink leases fail closed', async () => {
  await fixture(async (directory) => {
    const options = { directory, config, now: () => 1_000_000 };
    const lease = await createReceiverHealthLease({ ...options, deadline: 1_300_000 });
    await lease.healthy();
    const path = join(directory, (await readdir(directory))[0]);
    const original = await readFile(path, 'utf8');
    assert.equal(await receiverHealthIsReady({ ...options, now: () => 999_999 }), false);
    for (const body of ['{', 'null', original.replace('1300000', '1400000'), 'x'.repeat(4096)]) {
      await writeFile(path, body);
      assert.equal(await receiverHealthIsReady(options), false);
    }
    await writeFile(path, original); await chmod(path, 0o644);
    assert.equal(await receiverHealthIsReady(options), false);
    await rm(path); await writeFile(path + '.target', original, { mode: 0o600 });
    await symlink(path + '.target', path);
    assert.equal(await receiverHealthIsReady(options), false);
    await lease.stop();
  });
});
test('health directories must be absolute and preview roots resolve a stable shared path', () => {
  assert.equal(receiverHealthDirectory({}, '/project'), '/project/.deployment/phone-verification-local/receiver-health');
  assert.equal(receiverHealthDirectory({ PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY: '/private/health' }, '/snapshot'), '/private/health');
  assert.throws(() => receiverHealthDirectory({ PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY: '../health' }, '/project'));
});
test('lease lookup rejects incorrect filenames, insecure directories and a non-finite clock', async () => {
  await fixture(async (directory) => {
    const options = { directory, config, now: () => 1_000_000 };
    const lease = await createReceiverHealthLease({ ...options, deadline: 1_300_000 });
    await lease.healthy();
    assert.equal(await receiverHealthIsReady({ ...options, now: () => NaN }), false);
    const name = (await readdir(directory))[0];
    const incorrect = name.replace('.', 'x');
    await rename(join(directory, name), join(directory, incorrect));
    assert.equal(await receiverHealthIsReady(options), false);
    await rename(join(directory, incorrect), join(directory, name));
    await chmod(directory, 0o755);
    assert.equal(await receiverHealthIsReady(options), false);
    await chmod(directory, 0o700);
    await lease.stop();
  });
});
test('a lease-named FIFO fails closed without hanging the status request', async () => {
  await fixture(async (directory) => {
    const options = { directory, config, now: () => 1_000_000 };
    const lease = await createReceiverHealthLease({ ...options, deadline: 1_300_000 });
    await lease.healthy();
    const path = join(directory, (await readdir(directory))[0]);
    await rm(path);
    execFileSync('mkfifo', ['-m', '600', path]);
    const modulePath = join(process.cwd(), 'lib/phone-verification/server/receiver-health.ts');
    const probe = `const {receiverHealthIsReady}=require(${JSON.stringify(modulePath)});` +
      `receiverHealthIsReady(${JSON.stringify({ directory, config })}).then(ready=>process.exit(ready?1:0));`;
    const result = spawnSync(process.execPath, ['--import', 'tsx', '--eval', probe], { timeout: 3000 });
    assert.equal(result.status, 0, result.error?.message ?? result.stderr.toString());
    await lease.stop();
  });
});

function handlers(state: 'pending' | 'review' | 'verified' = 'pending', ready = false) {
  let issues = 0; let healthChecks = 0; let reads = 0;
  const status = { id: 'f66cf91b-cf44-4e66-b5fe-609772b17957' as const, state, expiresAt: '2026-10-25T01:00:00Z', mode: 'trial' as const };
  const routes = createPhoneVerificationHandlers({ origin: config.origin, transport: 'zoho-poll',
    mailboxId: config.mailboxId, webhookSecret: '', zohoUserId: '', zohoIntegrationId: '',
    receiverReady: async () => { healthChecks++; return ready; },
    deliveries: { enqueueDelivery: async () => true }, service: {
      issue: async () => { issues++; return { ...status, recipient: 'verify@example.invalid', body: 'SPHMRS test' }; },
      status: async () => { reads++; return status; }, cancel: async () => {},
    } });
  const request = (method = 'GET') => new Request(config.origin + '/api/phone-verification/challenges/id', {
    method, headers: { origin: config.origin, 'content-type': 'application/json', cookie: `${SESSION_COOKIE}=${'A'.repeat(43)}` },
    ...(method === 'POST' ? { body: JSON.stringify({ phone: '01012345678' }) } : {}),
  });
  return { routes, request, counts: () => ({ issues, healthChecks, reads }) };
}
test('poll transport rejects new challenges before service issue when receiver is unavailable', async () => {
  const h = handlers(); const response = await h.routes.issue(h.request('POST'));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'RECEIVER_UNAVAILABLE');
  assert.equal(h.counts().issues, 0);
  const live = handlers('pending', true);
  assert.equal((await live.routes.issue(live.request('POST'))).status, 201);
});
test('status authenticates first, checks pending/review receiver health, and preserves verified results/cancellation', async () => {
  for (const state of ['pending', 'review'] as const) {
    const h = handlers(state);
    const missing = new Request(config.origin + '/api/phone-verification/challenges/id');
    assert.equal((await h.routes.status(missing, 'id')).status, 404);
    assert.deepEqual(h.counts(), { issues: 0, healthChecks: 0, reads: 0 });
    assert.equal((await h.routes.status(h.request(), 'id')).status, 503);
    assert.equal(h.counts().reads, 1);
    assert.equal((await h.routes.cancel(h.request('DELETE'), 'id')).status, 200);
  }
  const h = handlers('verified');
  assert.equal((await h.routes.status(h.request(), 'id')).status, 200);
  assert.equal(h.counts().healthChecks, 0);
});
