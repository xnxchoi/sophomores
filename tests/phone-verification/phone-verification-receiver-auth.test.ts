import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadZohoReceiverConfig } from '../../lib/phone-verification/server/receiver-config';
import { verifySktZohoArc } from '../../lib/phone-verification/server/skt-arc';
import { receiverCarrierAuthentication } from '../../scripts/phone-verification-receive';

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

test('receiver defaults to the non-granting worker without an authentication callback', () => {
  assert.deepEqual(receiverCarrierAuthentication(loadZohoReceiverConfig(environment, secrets)), {});
});

test('explicit local SKT receiver policy installs the real verifier, not a flag-based approval', () => {
  const config = loadZohoReceiverConfig({ ...environment, PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1' }, secrets);
  const authentication = receiverCarrierAuthentication(config);
  assert.equal(authentication.expectedCarrierPolicy, 'local-skt-zoho-arc-v1');
  assert.equal(authentication.authenticateCarrier, verifySktZohoArc);
});

test('legacy opt-in passes only the explicit exception option to the cryptographic verifier', async () => {
  const config = loadZohoReceiverConfig({ ...environment,
    PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1', PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC: '1' }, secrets);
  let calls = 0;
  const message = { phone: '+821012345678', token: 'test-token', carrier: 'skt' as const, messageId: '<test>' };
  const authentication = receiverCarrierAuthentication(config, async (raw, parsed, options) => {
    calls++;
    assert.equal(raw, 'synthetic-original');
    assert.equal(parsed, message);
    assert.deepEqual(options, { allowLegacyZohoKey: true });
    return { approved: false, policyVersion: 'local-skt-zoho-arc-v1', reason: 'synthetic-deny' };
  });
  assert.equal(authentication.expectedCarrierPolicy, 'local-skt-zoho-arc-v1');
  assert.equal((await authentication.authenticateCarrier?.('synthetic-original', message))?.approved, false);
  assert.equal(calls, 1);
});

test('the disabled policy never invokes the verifier even when supplied by a test adapter', () => {
  const authentication = receiverCarrierAuthentication(loadZohoReceiverConfig(environment, secrets), async () => {
    throw new Error('must not authenticate');
  });
  assert.deepEqual(authentication, {});
});
