import { basename, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { readReceiverSecrets, receiverOAuthConfig, writeReceiverSecrets } from '../lib/phone-verification/server/receiver-config';
import { lookupZohoMailAccountId } from '../lib/phone-verification/server/zoho';
import { receiverFetch } from './phone-verification-receive';

export async function runPrivateAccountLookup(options: {
  receiverFile: string; codeFile: string; lookup?: typeof lookupZohoMailAccountId;
}): Promise<string> {
  const [receiver, separate] = await Promise.all([
    readReceiverSecrets(options.receiverFile), readReceiverSecrets(options.codeFile),
  ]);
  const oauth = receiverOAuthConfig(receiver);
  const code = separate.PHONE_VERIFICATION_ZOHO_AUTHORIZATION_CODE ?? '';
  if (Object.keys(separate).length !== 1 || !/^[A-Za-z0-9._-]{1,4096}$/.test(code) || code.startsWith('REPLACE_')) {
    throw new Error('A separate, fresh accounts.READ code is required.');
  }
  // Consume before exchange: an interrupted/failed lookup requires a fresh code.
  // Never overwrite or broaden the working messages.READ receiver credentials.
  await writeReceiverSecrets(options.codeFile, {});
  const signal = AbortSignal.timeout(30_000);
  const accountId = await (options.lookup ?? lookupZohoMailAccountId)({ ...oauth, code,
    fetch: receiverFetch({ signal, maximum: 2 }) });
  if (!/^[1-9][0-9]{0,29}$/.test(accountId)) throw new Error('Invalid account ID');
  return accountId;
}

async function main() {
  const [command = 'lookup', ...extra] = process.argv.slice(2);
  if (!['prepare', 'lookup'].includes(command) || extra.length) throw new Error('Use prepare or lookup without credential arguments.');
  const directory = join(process.cwd(), '.deployment', 'phone-verification-local');
  const codeFile = join(directory, 'zoho-account-lookup.env');
  if (command === 'prepare') {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeReceiverSecrets(codeFile, { PHONE_VERIFICATION_ZOHO_AUTHORIZATION_CODE: 'REPLACE_ACCOUNTS_READ_CODE' }, true);
    console.log('Private one-time account lookup file prepared. No provider requests made.');
    return;
  }
  const accountId = await runPrivateAccountLookup({ codeFile, receiverFile: join(directory, 'zoho-receiver.env') });
  console.log(accountId);
}

if (process.argv[1] && basename(process.argv[1]) === 'phone-verification-account-lookup.ts') {
  main().catch(() => {
    console.error('Account lookup failed. Check private configuration and use a fresh accounts.READ code. Receiver authorization was not changed.');
    process.exitCode = 1;
  });
}
