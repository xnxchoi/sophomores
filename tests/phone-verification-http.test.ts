import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { createPhoneVerificationHandlers, SESSION_COOKIE } from '../lib/phone-verification/server/http';
import { loadPhoneVerificationConfig } from '../lib/phone-verification/server/config';

const origin = 'http://127.0.0.1:3217';
const secret = 'synthetic-webhook-secret-for-tests-only';
const session = 'A'.repeat(43);
const id = 'f66cf91b-cf44-4e66-b5fe-609772b17957';
const expiresAt = '2026-10-23T02:05:00.000Z';
function setup() {
  const calls: Array<{ kind: string; input: unknown }> = [];
  const service = {
    async issue(input: unknown) { calls.push({ kind: 'issue', input }); return { id, recipient: 'verify@example.invalid', body: 'SPHMRS synthetic', expiresAt, mode: 'trial' } as const; },
    async status(input: unknown) { calls.push({ kind: 'status', input }); return { id, state: 'verified' as const, expiresAt, mode: 'trial' as const, proofToken: 'must-not-leak' }; },
    async cancel(input: unknown) { calls.push({ kind: 'cancel', input }); },
  };
  const deliveries = { async enqueueDelivery(input: unknown) { calls.push({ kind: 'delivery', input }); return true; } };
  const handlers = createPhoneVerificationHandlers({ service, deliveries, origin, webhookSecret: secret, mailboxId: '123456789', zohoUserId: '123456789', zohoIntegrationId: '234567891' });
  return { calls, handlers, service };
}
const request = (path: string, init: RequestInit = {}) => new Request(origin + path, init);
const issueRequest = (headers: Record<string, string> = {}) => request('/api/phone-verification/challenges', { method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify({ phone: '01012345678' }) });

test('HTTP: creates a separate HttpOnly local session and never trusts forwarded IP headers', async () => {
  const { handlers, calls } = setup();
  const response = await handlers.issue(issueRequest({ 'x-forwarded-for': '203.0.113.25' }));
  assert.equal(response.status, 201);
  assert.match(response.headers.get('set-cookie')!, new RegExp(SESSION_COOKIE + '=[A-Za-z0-9_-]{43};'));
  assert.match(response.headers.get('set-cookie')!, /HttpOnly; SameSite=Strict/);
  assert.match(response.headers.get('cache-control')!, /no-store/);
  assert.equal((calls[0].input as { ipKey: string }).ipKey, 'loopback');
  assert.equal((await response.json()).success, true);
});
test('HTTP: rejects foreign/null origins, methods and non-JSON before service access', async () => {
  const { handlers, calls } = setup();
  for (const value of ['https://attacker.invalid', 'null', '']) assert.equal((await handlers.issue(issueRequest({ origin: value }))).status, 403);
  assert.equal((await handlers.issue(issueRequest({ 'content-type': 'text/plain' }))).status, 415);
  assert.equal((await handlers.issue(request('/api/phone-verification/challenges'))).status, 405);
  assert.equal(calls.length, 0);
});
test('HTTP: rejects duplicate cookies, unknown JSON keys and oversized bodies', async () => {
  const { handlers, calls } = setup();
  assert.equal((await handlers.issue(issueRequest({ cookie: `${SESSION_COOKIE}=${session}; ${SESSION_COOKIE}=${session}` }))).status, 400);
  assert.equal((await handlers.issue(request('/api/phone-verification/challenges', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ phone: '01012345678', approved: true }) }))).status, 400);
  assert.equal((await handlers.issue(request('/api/phone-verification/challenges', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: 'x'.repeat(2049) }))).status, 413);
  assert.equal(calls.length, 0);
});
test('HTTP: status is session-owned and does not expose future-registration proof', async () => {
  const { handlers, calls } = setup();
  assert.equal((await handlers.status(request('/api/phone-verification/challenges/' + id), id)).status, 404);
  const response = await handlers.status(request('/api/phone-verification/challenges/' + id, { headers: { cookie: `${SESSION_COOKIE}=${session}` } }), id);
  assert.equal(response.status, 200);
  assert.equal('proofToken' in (await response.json()).data, false);
  assert.deepEqual(calls[0].input, { sessionToken: session, id });
});
test('HTTP: cancellation requires same origin and authenticated local session', async () => {
  const { handlers, calls } = setup();
  const req = (o: string) => request('/api/phone-verification/challenges/' + id, { method: 'DELETE', headers: { origin: o, cookie: `${SESSION_COOKIE}=${session}` } });
  assert.equal((await handlers.cancel(req('https://attacker.invalid'), id)).status, 403);
  assert.equal((await handlers.cancel(req(origin), id)).status, 200);
  assert.equal(calls.length, 1);
});
test('HTTP: webhook authenticates exact bytes and pinned identity before durable receipt', async () => {
  const { handlers, calls } = setup();
  const body = '{"messageId":1792720110299936736,"receivedTime":1792720110000,"zuid":123456789,"IntegIdList":"234567891,"}';
  const signature = createHmac('sha256', secret).update(body).digest('base64');
  const req = (raw: string, headers: Record<string, string> = {}) => request('/api/phone-verification/webhook', { method: 'POST', body: raw, headers: { 'content-type': 'application/json', 'x-hook-signature': signature, ...headers } });
  assert.equal((await handlers.webhook(req(body + ' '))).status, 401);
  assert.equal((await handlers.webhook(req(body, { 'x-hook-secret': 'unapproved-enrollment' }))).status, 401);
  assert.equal(calls.length, 0);
  assert.equal((await handlers.webhook(req(body))).status, 200);
  const input = calls[0].input as { messageId: string; mailboxId: string };
  assert.equal(input.messageId, '1792720110299936736');
  assert.equal(input.mailboxId, '123456789');
});
test('HTTP: malformed signed notifications and broken storage do not acknowledge receipt', async () => {
  const { handlers, service } = setup();
  const body = '{}';
  const response = await handlers.webhook(request('/api/phone-verification/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hook-signature': createHmac('sha256', secret).update(body).digest('base64') }, body }));
  assert.equal(response.status, 400);
  service.issue = async () => { throw new Error('private database credentials must not appear'); };
  const failure = await handlers.issue(issueRequest());
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /credentials|database/);
});
const env = {
  PHONE_VERIFICATION_MODE: 'local', PHONE_VERIFICATION_ORIGIN: origin,
  PHONE_VERIFICATION_DATABASE_URL: 'postgresql://verification:synthetic@127.0.0.1:5432/sophomores_verification_test',
  PHONE_VERIFICATION_STATE_SECRET: 'a'.repeat(64), PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET: secret,
  PHONE_VERIFICATION_RECIPIENT: 'verify@example.invalid', PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: '123456789',
  PHONE_VERIFICATION_ZOHO_USER_ID: '123456789', PHONE_VERIFICATION_ZOHO_INTEGRATION_ID: '234567891',
};
test('config: disabled by default, explicit local mode validates every boundary', () => {
  assert.equal(loadPhoneVerificationConfig({}), null);
  assert.equal(loadPhoneVerificationConfig({ PHONE_VERIFICATION_MODE: 'disabled' }), null);
  assert.equal(loadPhoneVerificationConfig(env)?.origin, origin);
  for (const patch of [
    { PHONE_VERIFICATION_MODE: 'live' }, { PHONE_VERIFICATION_ORIGIN: 'https://sophomores.co' },
    { PHONE_VERIFICATION_DATABASE_URL: 'postgresql://user@remote.invalid/sophomores_verification_test' },
    { PHONE_VERIFICATION_DATABASE_URL: 'postgresql://user@localhost/production' },
    { PHONE_VERIFICATION_STATE_SECRET: 'short' }, { PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: '' },
    { PHONE_VERIFICATION_RECIPIENT: 'x\r\n@attacker.invalid' },
  ]) assert.throws(() => loadPhoneVerificationConfig({ ...env, ...patch }), /configuration/);
});
