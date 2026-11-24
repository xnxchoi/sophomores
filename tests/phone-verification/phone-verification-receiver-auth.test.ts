import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadZohoReceiverConfig } from '@/lib/phone-verification/server/receiver-config';
import { receiverCarrierAuthentication, carrierTrialLine, receiverSecretsPath } from '../../scripts/phone-verification-receive';

const environment = {
  PHONE_VERIFICATION_MODE: 'local', PHONE_VERIFICATION_TRANSPORT: 'zoho-poll',
  PHONE_VERIFICATION_ORIGIN: 'http://127.0.0.1:3217',
  PHONE_VERIFICATION_DATABASE_URL: 'postgres://test:synthetic@127.0.0.1:5432/sophomores_verification_test',
  PHONE_VERIFICATION_STATE_SECRET: 'a'.repeat(64), PHONE_VERIFICATION_RECIPIENT: 'verify@sophomores.co',
  PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: '123456789',
};
const secrets = {
  PHONE_VERIFICATION_ZOHO_MAIL_ORIGIN: 'https://mail.zoho.com',
  PHONE_VERIFICATION_ZOHO_ACCOUNTS_ORIGIN: 'https://accounts.zoho.com',
  PHONE_VERIFICATION_ZOHO_CLIENT_ID: 'synthetic-client',
  PHONE_VERIFICATION_ZOHO_CLIENT_SECRET: 'synthetic-secret',
  PHONE_VERIFICATION_ZOHO_REFRESH_TOKEN: 'synthetic-refresh',
};
const message = { phone: '+821012345678', token: 'test-token', carrier: 'skt' as const, messageId: '<test>' };
const never = async (): Promise<never> => { throw new Error('must not authenticate'); };
const deny = (policyVersion: string) => ({ approved: false, policyVersion, reason: 'synthetic-deny',
  evidence: { carrier: 'kt' as const, arc: 'pass', spf: 'pass', dmarc: 'none' } });

test('receiver defaults to the non-granting worker without an authentication callback', () => {
  assert.deepEqual(receiverCarrierAuthentication(loadZohoReceiverConfig(environment, secrets)), {});
});

test('explicit local SKT receiver policy runs the local verifier and logs its decision', async () => {
  const config = loadZohoReceiverConfig({ ...environment, PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1' }, secrets);
  const lines: string[] = [];
  let local = 0;
  const authentication = receiverCarrierAuthentication(config, {
    local: async () => { local++; return deny('local-skt-zoho-arc-v1'); }, preview: never,
  }, (line) => lines.push(line));
  assert.equal(authentication.expectedCarrierPolicy, 'local-skt-zoho-arc-v1');
  assert.equal((await authentication.authenticateCarrier?.('synthetic-original', message))?.approved, false);
  assert.equal(local, 1);
  assert.equal(lines.length, 1);
});

test('legacy opt-in passes only the explicit exception option to the cryptographic verifier', async () => {
  const config = loadZohoReceiverConfig({ ...environment,
    PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1', PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC: '1' }, secrets);
  let calls = 0;
  const authentication = receiverCarrierAuthentication(config, { local: async (raw, parsed, options) => {
    calls++;
    assert.equal(raw, 'synthetic-original');
    assert.equal(parsed, message);
    assert.deepEqual(options, { allowLegacyZohoKey: true });
    return deny('local-skt-zoho-arc-v1');
  }, preview: never }, () => {});
  assert.equal(authentication.expectedCarrierPolicy, 'local-skt-zoho-arc-v1');
  assert.equal((await authentication.authenticateCarrier?.('synthetic-original', message))?.approved, false);
  assert.equal(calls, 1);
});

test('the disabled policy never invokes a verifier even when supplied by a test adapter', () => {
  const authentication = receiverCarrierAuthentication(loadZohoReceiverConfig(environment, secrets), { local: never, preview: never });
  assert.deepEqual(authentication, {});
});

const sandbox = { ...environment, PHONE_VERIFICATION_MODE: 'production', PHONE_VERIFICATION_ORIGIN: 'https://preview.sophomores.co',
  PREVIEW_RUNTIME: 'sandbox', PHONE_VERIFICATION_CARRIER_POLICY: 'preview-trial-zoho-arc-v1' };

test('the preview trial policy loads only in the preview sandbox runtime on the preview origin', () => {
  assert.equal(loadZohoReceiverConfig(sandbox, secrets).carrierPolicy, 'preview-trial-zoho-arc-v1');
  const { PREVIEW_RUNTIME: _runtime, ...noRuntime } = sandbox;
  for (const env of [
    noRuntime,
    { ...sandbox, PREVIEW_RUNTIME: 'review-editor' },
    { ...sandbox, PHONE_VERIFICATION_ORIGIN: 'https://sophomores.co' },
    { ...sandbox, PHONE_VERIFICATION_MODE: 'local', PHONE_VERIFICATION_ORIGIN: 'http://127.0.0.1:3217' },
    { ...sandbox, PHONE_VERIFICATION_CARRIER_POLICY: 'production-zoho-arc-v1' },
  ]) assert.throws(() => loadZohoReceiverConfig(env, secrets));
});

test('the preview trial runs the trial verifier and logs carrier and ARC evidence without personal data', async () => {
  const lines: string[] = [];
  const authentication = receiverCarrierAuthentication(loadZohoReceiverConfig(sandbox, secrets), {
    local: never, preview: async () => deny('preview-trial-zoho-arc-v1'),
  }, (line) => lines.push(line));
  assert.equal(authentication.expectedCarrierPolicy, 'preview-trial-zoho-arc-v1');
  await authentication.authenticateCarrier?.('synthetic-original', message);
  assert.equal(lines.length, 1);
  const entry = JSON.parse(lines[0]!);
  assert.deepEqual(Object.keys(entry).sort(), ['approved', 'arc', 'at', 'carrier', 'dmarc', 'event', 'policy', 'spf']);
  assert.equal(entry.event, 'phone_carrier_trial');
  assert.equal(entry.policy, 'preview-trial-zoho-arc-v1');
  assert.equal(entry.carrier, 'kt');
  assert.equal(entry.approved, false);
  assert.equal(entry.dmarc, 'none');
  assert.ok(!lines[0]!.includes('821012345678') && !lines[0]!.includes('test-token'));
});

test('a failing trial log never changes the decision', async () => {
  const authentication = receiverCarrierAuthentication(loadZohoReceiverConfig(sandbox, secrets), {
    local: never, preview: async () => ({ ...deny('preview-trial-zoho-arc-v1'), approved: true }),
  }, () => { throw new Error('log down'); });
  assert.equal((await authentication.authenticateCarrier?.('synthetic-original', message))?.approved, true);
});

test('a decision without evidence logs placeholders, not message contents', () => {
  const entry = JSON.parse(carrierTrialLine('preview-trial-zoho-arc-v1', { approved: false }));
  assert.equal(entry.carrier, 'unknown');
  assert.equal(entry.arc, 'unchecked');
});

test('the receiver secrets file moves only in the preview sandbox runtime, to an absolute path', () => {
  assert.equal(receiverSecretsPath({}, '/app'), '/app/.deployment/phone-verification-local/zoho-receiver.env');
  assert.equal(receiverSecretsPath({ PREVIEW_RUNTIME: 'sandbox', PHONE_VERIFICATION_RECEIVER_SECRETS_FILE: '/run/receiver/zoho.env' }, '/app'),
    '/run/receiver/zoho.env');
  assert.throws(() => receiverSecretsPath({ PHONE_VERIFICATION_RECEIVER_SECRETS_FILE: '/run/receiver/zoho.env' }, '/app'));
  assert.throws(() => receiverSecretsPath({ PREVIEW_RUNTIME: 'sandbox', PHONE_VERIFICATION_RECEIVER_SECRETS_FILE: 'zoho.env' }, '/app'));
});

test('member bindings accept the trial proof only in the preview sandbox runtime', async () => {
  const { memberPhonePolicies } = await import('@/lib/member-auth/phone-policies');
  const portone = { PORTONE_PAYMENT_MODE: 'test', PORTONE_ORIGIN: 'https://preview.sophomores.co',
    PORTONE_STORE_ID: 'store-sandbox-fixture', PORTONE_CHANNEL_KEY: 'channel-sandbox-fixture',
    PORTONE_API_SECRET: 'api-secret-fixture-value', PORTONE_WEBHOOK_SECRET: 'whsec_' + Buffer.alloc(32, 7).toString('base64'),
    PORTONE_SANDBOX_TEST_STORE_ID: 'store-sandbox-fixture', PORTONE_SANDBOX_TEST_CHANNEL_KEY: 'channel-sandbox-fixture' };
  const runtime = { NEXT_PUBLIC_SERVER_URL: 'https://preview.sophomores.co', PREVIEW_RUNTIME: 'sandbox', ...portone };
  assert.deepEqual(memberPhonePolicies({}), ['local-skt-zoho-arc-v1']);
  assert.deepEqual(memberPhonePolicies(runtime), ['local-skt-zoho-arc-v1', 'preview-trial-zoho-arc-v1']);
  // The flag alone, a review owner, or a non-test PortOne setup leaves the trial proof unaccepted.
  assert.deepEqual(memberPhonePolicies({ PREVIEW_RUNTIME: 'sandbox' }), ['local-skt-zoho-arc-v1']);
  assert.deepEqual(memberPhonePolicies({ ...runtime, REVIEW_OWNER_EMAIL: 'x@sophomores.co' }), ['local-skt-zoho-arc-v1']);
  assert.deepEqual(memberPhonePolicies({ ...runtime, PORTONE_PAYMENT_MODE: 'live' }), ['local-skt-zoho-arc-v1']);
});

test('the preview receiver service starts only with the sandbox trial configuration', async () => {
  const { previewReceiverServiceReady } = await import('../../scripts/phone-verification-receiver-service');
  const service = { ...sandbox, PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY: '/run/phone-receiver-health' };
  assert.equal(previewReceiverServiceReady(service), true);
  assert.equal(previewReceiverServiceReady({ ...service, PREVIEW_RUNTIME: undefined }), false);
  assert.equal(previewReceiverServiceReady({ ...service, PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1' }), false);
  assert.equal(previewReceiverServiceReady({ ...service, PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY: undefined }), false);
  assert.equal(previewReceiverServiceReady({ ...service, PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY: 'relative' }), false);
  assert.equal(previewReceiverServiceReady({ ...service, PHONE_VERIFICATION_TRANSPORT: 'fixture' }), false);
});
