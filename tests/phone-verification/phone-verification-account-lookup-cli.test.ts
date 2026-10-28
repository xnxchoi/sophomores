import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readReceiverSecrets, writeReceiverSecrets } from '../../lib/phone-verification/server/receiver-config';
import { runPrivateAccountLookup } from '../../scripts/phone-verification-account-lookup';

test('one-time private lookup consumes only the separate code and leaves working receiver credentials unchanged', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sophomores-account-id-'));
  const receiverFile = join(dir, 'receiver.env'); const codeFile = join(dir, 'lookup.env');
  const credentials = { PHONE_VERIFICATION_ZOHO_MAIL_ORIGIN: 'https://mail.zoho.com',
    PHONE_VERIFICATION_ZOHO_ACCOUNTS_ORIGIN: 'https://accounts.zoho.com',
    PHONE_VERIFICATION_ZOHO_CLIENT_ID: 'synthetic-client', PHONE_VERIFICATION_ZOHO_CLIENT_SECRET: 'synthetic-secret',
    PHONE_VERIFICATION_ZOHO_REFRESH_TOKEN: 'working-receiver-token' };
  try {
    await writeReceiverSecrets(receiverFile, credentials, true);
    const original = await readFile(receiverFile, 'utf8');
    await writeReceiverSecrets(codeFile, { PHONE_VERIFICATION_ZOHO_AUTHORIZATION_CODE: 'separate-account-code' }, true);
    let calls = 0;
    const lookup: typeof import('../../lib/phone-verification/server/zoho').lookupZohoMailAccountId = async (options) => {
      calls++;
      assert.equal(options.code, 'separate-account-code');
      assert.equal('refreshToken' in options, false);
      assert.deepEqual(await readReceiverSecrets(codeFile), {});
      return '2560636000000008002';
    };
    assert.equal(await runPrivateAccountLookup({ receiverFile, codeFile, lookup }), '2560636000000008002');
    assert.equal(await readFile(receiverFile, 'utf8'), original);
    await assert.rejects(runPrivateAccountLookup({ receiverFile, codeFile, lookup }));
    assert.equal(calls, 1);
    await writeReceiverSecrets(codeFile, { PHONE_VERIFICATION_ZOHO_AUTHORIZATION_CODE: 'REPLACE_ACCOUNTS_READ_CODE' });
    await assert.rejects(runPrivateAccountLookup({ receiverFile, codeFile, lookup }));
    await writeReceiverSecrets(codeFile, { PHONE_VERIFICATION_ZOHO_AUTHORIZATION_CODE: 'fresh-account-code' });
    await assert.rejects(runPrivateAccountLookup({ receiverFile, codeFile, lookup: async () => { throw Error('provider-failure'); } }));
    assert.deepEqual(await readReceiverSecrets(codeFile), {});
    assert.equal(await readFile(receiverFile, 'utf8'), original);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
