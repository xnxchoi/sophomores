import { constants } from 'node:fs';
import { open, rename, unlink, lstat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { loadPhoneVerificationConfig } from './config';

type Environment = Readonly<Record<string, string | undefined>>;
export type ReceiverSecrets = Readonly<Record<string, string>>;
const keys = [ 'MAIL_ORIGIN', 'ACCOUNTS_ORIGIN', 'CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN', 'AUTHORIZATION_CODE' ]
  .map((key) => `PHONE_VERIFICATION_ZOHO_${key}`);
const regions = ['com', 'eu', 'in', 'com.au', 'jp', 'ca', 'sa', 'com.cn'];
const failure = () => new Error('Receiver needs a private local configuration file with valid read-only Zoho credentials.');

export function receiverOAuthConfig(secrets: Environment) {
  const value = (name: string) => {
    const text = secrets[`PHONE_VERIFICATION_ZOHO_${name}`] ?? '';
    if (!/^[A-Za-z0-9._-]{1,4096}$/.test(text) || text.startsWith('REPLACE_')) throw failure();
    return text;
  };
  const mailOrigin = secrets.PHONE_VERIFICATION_ZOHO_MAIL_ORIGIN ?? '';
  const accountsOrigin = secrets.PHONE_VERIFICATION_ZOHO_ACCOUNTS_ORIGIN ?? '';
  if (!regions.some((region) => mailOrigin === `https://mail.zoho.${region}` && accountsOrigin === `https://accounts.zoho.${region}`)) throw failure();
  return { mailOrigin, accountsOrigin, clientId: value('CLIENT_ID'), clientSecret: value('CLIENT_SECRET') };
}

export function loadZohoReceiverConfig(env: Environment, secrets: Environment) {
  const local = loadPhoneVerificationConfig(env);
  if (!local || local.transport !== 'zoho-poll' || local.recipient !== 'verify@sophomores.co') throw failure();
  const carrierPolicy = env.PHONE_VERIFICATION_CARRIER_POLICY;
  if (carrierPolicy !== undefined && carrierPolicy !== 'local-skt-zoho-arc-v1') throw failure();
  const legacyOption = env.PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC;
  if (legacyOption !== undefined && (legacyOption !== '1' || carrierPolicy !== 'local-skt-zoho-arc-v1')) throw failure();
  const allowLegacyZohoArc = legacyOption === '1';
  const oauth = receiverOAuthConfig(secrets);
  const refreshToken = secrets.PHONE_VERIFICATION_ZOHO_REFRESH_TOKEN ?? '';
  if (!/^[A-Za-z0-9._-]{1,4096}$/.test(refreshToken) || refreshToken.startsWith('REPLACE_')) throw failure();
  return Object.freeze({ ...local, ...oauth, refreshToken, carrierPolicy, allowLegacyZohoArc });
}

async function privateFile(path: string) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || (stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid()) || stat.size > 24_576) throw failure();
    return { file, stat };
  } catch (error) { await file.close(); throw error; }
}

export async function readReceiverSecrets(path: string): Promise<ReceiverSecrets> {
  const { file } = await privateFile(path);
  try {
    const raw = await file.readFile('utf8');
    if (Buffer.byteLength(raw) > 24_576) throw failure();
    return raw.split(/\r?\n/).reduce<Record<string, string>>((values, line) => {
      if (!line.trim() || line.trimStart().startsWith('#')) return values;
      const match = /^([A-Z_]+)=([A-Za-z0-9:/._-]*)$/.exec(line.trim());
      if (!match || !keys.includes(match[1]) || Object.hasOwn(values, match[1])) throw failure();
      return { ...values, [match[1]]: match[2] };
    }, {});
  } finally { await file.close(); }
}

/** Atomic replacement preserves a working refresh token if authorization is interrupted. */
export async function writeReceiverSecrets(path: string, values: ReceiverSecrets, createOnly = false): Promise<void> {
  const entries = Object.entries(values);
  if (entries.some(([key, value]) => !keys.includes(key) || !/^[A-Za-z0-9:/._-]{0,4096}$/.test(value))) throw failure();
  const text = entries.map(([key, value]) => `${key}=${value}\n`).join('');
  if (Buffer.byteLength(text) > 24_576) throw failure();
  if (createOnly) {
    const file = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try { await file.writeFile(text, 'utf8'); await file.sync(); } finally { await file.close(); }
    return;
  }
  const existing = await privateFile(path);
  await existing.file.close();
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeReceiverSecrets(temporary, values, true);
    const current = await lstat(path);
    if (current.ino !== existing.stat.ino || current.dev !== existing.stat.dev || current.mtimeMs !== existing.stat.mtimeMs || (current.mode & 0o077) !== 0) throw failure();
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
  }
}
