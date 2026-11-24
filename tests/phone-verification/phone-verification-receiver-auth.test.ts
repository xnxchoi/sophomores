import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadZohoReceiverConfig, previewSandboxAttestation } from '@/lib/phone-verification/server/receiver-config';
import { receiverProcessEnvironment } from '../../scripts/member-auth-receiver';
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

const preview = { ...environment, PHONE_VERIFICATION_MODE: 'production', PHONE_VERIFICATION_ORIGIN: 'https://preview.sophomores.co',
  PREVIEW_RUNTIME: 'sandbox', PHONE_VERIFICATION_CARRIER_POLICY: 'preview-trial-zoho-arc-v1' };
const attestation = previewSandboxAttestation({ secret: environment.PHONE_VERIFICATION_STATE_SECRET,
  origin: 'https://preview.sophomores.co', mailboxId: environment.PHONE_VERIFICATION_ZOHO_ACCOUNT_ID });
const sandbox = { ...preview, PHONE_VERIFICATION_PREVIEW_ATTESTATION: attestation };

test('the SKT pilot issues only in local mode, never with a production origin, with or without the legacy key', () => {
  for (const env of [
    { ...preview, PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1' },
    { ...preview, PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1', PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC: '1' },
    { ...preview, PREVIEW_RUNTIME: undefined, PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1' },
  ]) assert.throws(() => loadZohoReceiverConfig(env, secrets));
  assert.equal(loadZohoReceiverConfig({ ...environment, PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1' }, secrets).carrierPolicy,
    'local-skt-zoho-arc-v1');
});

test('the preview trial issues only with the supervisor attestation on the preview sandbox origin', () => {
  assert.equal(loadZohoReceiverConfig(sandbox, secrets).carrierPolicy, 'preview-trial-zoho-arc-v1');
  const { PREVIEW_RUNTIME: _runtime, ...noRuntime } = sandbox;
  for (const env of [
    preview,
    { ...sandbox, PHONE_VERIFICATION_PREVIEW_ATTESTATION: 'f'.repeat(64) },
    { ...sandbox, PHONE_VERIFICATION_PREVIEW_ATTESTATION: attestation.slice(1) },
    noRuntime,
    { ...sandbox, PREVIEW_RUNTIME: 'review-editor' },
    { ...sandbox, PHONE_VERIFICATION_ORIGIN: 'https://sophomores.co' },
    { ...sandbox, PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: '987654321' },
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

const portone = { PORTONE_PAYMENT_MODE: 'test', PORTONE_ORIGIN: 'https://preview.sophomores.co',
  PORTONE_STORE_ID: 'store-sandbox-fixture', PORTONE_CHANNEL_KEY: 'channel-sandbox-fixture',
  PORTONE_API_SECRET: 'api-secret-fixture-value', PORTONE_WEBHOOK_SECRET: 'whsec_' + Buffer.alloc(32, 7).toString('base64'),
  PORTONE_SANDBOX_TEST_STORE_ID: 'store-sandbox-fixture', PORTONE_SANDBOX_TEST_CHANNEL_KEY: 'channel-sandbox-fixture' };
const runtime = { NEXT_PUBLIC_SERVER_URL: 'https://preview.sophomores.co', PREVIEW_RUNTIME: 'sandbox', ...portone,
  PHONE_VERIFICATION_MODE: 'production', PHONE_VERIFICATION_ORIGIN: 'https://preview.sophomores.co',
  MEMBER_AUTH_MODE: 'production', MEMBER_AUTH_ORIGIN: 'https://preview.sophomores.co' };

test('new bindings consume the pilot proof only in local mode and the trial proof only under the preview authority', async () => {
  const { bindablePhonePolicies } = await import('@/lib/member-auth/phone-policies');
  assert.deepEqual(bindablePhonePolicies({ PHONE_VERIFICATION_MODE: 'local', MEMBER_AUTH_MODE: 'local' }), ['local-skt-zoho-arc-v1']);
  assert.deepEqual(bindablePhonePolicies(runtime), ['preview-trial-zoho-arc-v1']);
  for (const env of [
    {},
    { PHONE_VERIFICATION_MODE: 'production', MEMBER_AUTH_MODE: 'production' },
    { PREVIEW_RUNTIME: 'sandbox', PHONE_VERIFICATION_MODE: 'production', PHONE_VERIFICATION_ORIGIN: 'https://preview.sophomores.co' },
    { ...runtime, REVIEW_OWNER_EMAIL: 'x@sophomores.co' },
    { ...runtime, PORTONE_PAYMENT_MODE: 'live' },
    { ...runtime, PORTONE_SANDBOX_TEST_CHANNEL_KEY: 'another-channel' },
    { ...runtime, PHONE_VERIFICATION_ORIGIN: 'https://sophomores.co', MEMBER_AUTH_ORIGIN: 'https://sophomores.co' },
  ]) assert.deepEqual(bindablePhonePolicies(env), [], JSON.stringify(Object.keys(env)));
});

test('existing pilot bindings stay recognised; trial bindings count only under the preview authority', async () => {
  const { recognisedPhonePolicies } = await import('@/lib/member-auth/phone-policies');
  assert.deepEqual(recognisedPhonePolicies({}), ['local-skt-zoho-arc-v1']);
  assert.deepEqual(recognisedPhonePolicies({ ...runtime, REVIEW_OWNER_EMAIL: 'x@sophomores.co' }), ['local-skt-zoho-arc-v1']);
  assert.deepEqual(recognisedPhonePolicies(runtime), ['local-skt-zoho-arc-v1', 'preview-trial-zoho-arc-v1']);
});

test('the preview receiver service starts only on the full sandbox profile and passes an attestation, not PortOne settings', async () => {
  const { previewReceiverServiceEnvironment } = await import('../../scripts/phone-verification-receiver-service');
  const service = { ...preview, ...portone, PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY: '/run/phone-receiver-health' };
  const child = previewReceiverServiceEnvironment(service);
  assert.ok(child);
  assert.equal(child.PHONE_VERIFICATION_PREVIEW_ATTESTATION, attestation);
  const passed = receiverProcessEnvironment(child);
  assert.equal(passed.PHONE_VERIFICATION_PREVIEW_ATTESTATION, attestation);
  assert.equal(Object.keys(passed).some((key) => key.startsWith('PORTONE_') || key === 'REVIEW_OWNER_EMAIL'), false);
  // A forged attestation in the service's own environment is replaced, never trusted.
  assert.equal(previewReceiverServiceEnvironment({ ...service, PHONE_VERIFICATION_PREVIEW_ATTESTATION: 'f'.repeat(64) })?.PHONE_VERIFICATION_PREVIEW_ATTESTATION, attestation);
  for (const env of [
    { ...service, REVIEW_OWNER_EMAIL: 'x@sophomores.co' },
    { ...service, PORTONE_PAYMENT_MODE: 'live' },
    { ...service, PORTONE_SANDBOX_TEST_STORE_ID: undefined },
    { ...service, PREVIEW_RUNTIME: undefined },
    { ...service, PHONE_VERIFICATION_ORIGIN: 'https://sophomores.co' },
    { ...service, PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1' },
    { ...service, PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY: undefined },
    { ...service, PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY: 'relative' },
    { ...service, PHONE_VERIFICATION_TRANSPORT: 'fixture' },
  ]) assert.equal(previewReceiverServiceEnvironment(env), null);
});
