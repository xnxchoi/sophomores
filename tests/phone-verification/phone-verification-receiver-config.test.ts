import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm, chmod, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadPhoneVerificationConfig } from '@/lib/phone-verification/server/config';
import { loadZohoReceiverConfig, readReceiverSecrets, writeReceiverSecrets } from '@/lib/phone-verification/server/receiver-config';
import { createPhoneVerificationHandlers } from '@/lib/phone-verification/server/http';
import { localPreviewEnvironment } from '../../scripts/phone-verification-preview';

const base = {
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
test('poll transport needs no fabricated webhook identities; unknown transports fail closed', () => {
  assert.equal(loadPhoneVerificationConfig(base)?.transport, 'zoho-poll');
  assert.throws(() => loadPhoneVerificationConfig({ ...base, PHONE_VERIFICATION_TRANSPORT: 'other' }));
  assert.throws(() => loadPhoneVerificationConfig({ ...base, PHONE_VERIFICATION_TRANSPORT: 'fixture' }));
});
test('real receive config is opt-in, alias pinned, region matched and separate from runtime env', () => {
  const config = loadZohoReceiverConfig(base, secrets);
  assert.equal(config.recipient, 'verify@sophomores.co');
  assert.equal(config.mailboxId, '123456789');
  for (const patch of [
    { PHONE_VERIFICATION_TRANSPORT: 'fixture' }, { PHONE_VERIFICATION_RECIPIENT: 'concierge@sophomores.co' },
    { PHONE_VERIFICATION_MODE: 'disabled' },
  ]) assert.throws(() => loadZohoReceiverConfig({ ...base, ...patch }, secrets));
  for (const patch of [
    { PHONE_VERIFICATION_ZOHO_MAIL_ORIGIN: 'https://mail.zoho.com.attacker.invalid' },
    { PHONE_VERIFICATION_ZOHO_ACCOUNTS_ORIGIN: 'https://accounts.zoho.eu' },
    { PHONE_VERIFICATION_ZOHO_REFRESH_TOKEN: '' }, { PHONE_VERIFICATION_ZOHO_CLIENT_ID: 'bad\r\nvalue' },
  ]) assert.throws(() => loadZohoReceiverConfig(base, { ...secrets, ...patch }));
});
test('carrier authentication policy defaults to deny and accepts only the explicit local SKT policy', () => {
  assert.equal(loadZohoReceiverConfig(base, secrets).carrierPolicy, undefined);
  assert.equal(loadZohoReceiverConfig({ ...base, PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1' }, secrets).carrierPolicy, 'local-skt-zoho-arc-v1');
  for (const policy of ['', 'true', 'carrier-ingress-unreviewed-v1', 'local-skt-zoho-arc-v1 ', 'other-policy']) {
    assert.throws(() => loadZohoReceiverConfig({ ...base, PHONE_VERIFICATION_CARRIER_POLICY: policy }, secrets));
  }
});
test('carrier authentication opt-in cannot bypass local receiver guards or enable fixture transport', () => {
  const enabled = { ...base, PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1' };
  for (const patch of [
    { PHONE_VERIFICATION_MODE: 'production' },
    { PHONE_VERIFICATION_ORIGIN: 'https://preview.sophomores.co' },
    { PHONE_VERIFICATION_DATABASE_URL: 'postgres://test:synthetic@database.invalid:5432/sophomores_verification_test' },
    { PHONE_VERIFICATION_RECIPIENT: 'concierge@sophomores.co' },
    { PHONE_VERIFICATION_TRANSPORT: 'fixture', PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET: 'w'.repeat(32), PHONE_VERIFICATION_ZOHO_USER_ID: '1', PHONE_VERIFICATION_ZOHO_INTEGRATION_ID: '2' }
  ]) assert.throws(() => loadZohoReceiverConfig({ ...enabled, ...patch }, secrets));
});
test('legacy Zoho key exception is disabled by default and requires the explicit local SKT pilot', () => {
  const enabled = { ...base, PHONE_VERIFICATION_CARRIER_POLICY: 'local-skt-zoho-arc-v1' };
  assert.equal(loadZohoReceiverConfig(base, secrets).allowLegacyZohoArc, false);
  assert.equal(loadZohoReceiverConfig(enabled, secrets).allowLegacyZohoArc, false);
  assert.equal(loadZohoReceiverConfig({ ...enabled, PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC: '1' }, secrets).allowLegacyZohoArc, true);
  assert.throws(() => loadZohoReceiverConfig({ ...base, PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC: '1' }, secrets));
  for (const value of ['', '0', 'true', '1 ', 'yes']) {
    assert.throws(() => loadZohoReceiverConfig({ ...enabled, PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC: value }, secrets));
  }
});
test('poll transport rejects callback before reading or acknowledging any notification', async () => {
  let enqueued = false;
  const handlers = createPhoneVerificationHandlers({
    ...loadPhoneVerificationConfig(base)!,
    service: { issue: async () => { throw Error(); }, status: async () => { throw Error(); }, cancel: async () => {} },
    deliveries: { enqueueDelivery: async () => { enqueued = true; return true; } },
  });
  const response = await handlers.webhook(new Request('http://127.0.0.1:3217/api/phone-verification/webhook', { method: 'POST' }));
  assert.equal(response.status, 503);
  assert.equal(enqueued, false);
});
test('preview child cannot inherit receiver credentials, including accidental global exports', () => {
  const child = localPreviewEnvironment({ ...base, ...secrets, PHONE_VERIFICATION_ZOHO_AUTHORIZATION_CODE: 'synthetic-code', PATH: '/safe', PREVIEW_AUTH_MODE: 'private' });
  assert.equal(child.PATH, '/safe');
  assert.equal(child.PHONE_VERIFICATION_ZOHO_ACCOUNT_ID, '123456789');
  assert.equal(child.PREVIEW_AUTH_MODE, 'public');
  for (const key of [...Object.keys(secrets), 'PHONE_VERIFICATION_ZOHO_AUTHORIZATION_CODE']) assert.equal(child[key], undefined);
});
test('secret file IO enforces private regular files, rejects links and ambiguous or unexpected keys', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sophomores-receiver-'));
  const path = join(directory, 'private.env');
  try {
    await writeReceiverSecrets(path, secrets, true);
    assert.deepEqual(await readReceiverSecrets(path), secrets);
    await assert.rejects(writeReceiverSecrets(path, secrets, true));
    await writeReceiverSecrets(path, { ...secrets, PHONE_VERIFICATION_ZOHO_AUTHORIZATION_CODE: 'new-code' });
    assert.match(await readFile(path, 'utf8'), /new-code/);
    await chmod(path, 0o644);
    await assert.rejects(readReceiverSecrets(path), /private|permissions/i);
    await assert.rejects(writeReceiverSecrets(path, secrets));
    await chmod(path, 0o600);
    const link = join(directory, 'link.env'); await symlink(path, link);
    await assert.rejects(readReceiverSecrets(link)); await assert.rejects(writeReceiverSecrets(link, secrets));
    await writeFile(path, 'PHONE_VERIFICATION_ZOHO_CLIENT_ID=first\nPHONE_VERIFICATION_ZOHO_CLIENT_ID=second\n', { mode: 0o600 });
    await assert.rejects(readReceiverSecrets(path));
    await writeFile(path, 'NODE_OPTIONS=--inspect\n', { mode: 0o600 });
    await assert.rejects(readReceiverSecrets(path));
    await assert.rejects(writeReceiverSecrets(path, { ...secrets, PHONE_VERIFICATION_ZOHO_CLIENT_SECRET: 'x\nattack' }));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
