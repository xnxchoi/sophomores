import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readdir, rename, rm } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

type Scope = { origin: string; mailboxId: string; databaseUrl: string; recipient: string; secret: string };
type Options = { directory: string; config: Scope; now?: () => number };
type Lease = { version: 1; owner: string; scope: string; updatedAt: number; expiresAt: number; deadline: number };
const FRESHNESS_MS = 30_000;
const MAXIMUM_FILES = 32;
const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';

export function receiverHealthDirectory(
  env: Readonly<Record<string, string | undefined>> = process.env, root = process.cwd(),
): string {
  const directory = env.PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY
    ?? join(root, '.deployment/phone-verification-local/receiver-health');
  if (!isAbsolute(directory)) throw new Error('Receiver health directory must be absolute');
  return directory;
}

function digest(config: Scope, value: string): string {
  return createHmac('sha256', config.secret).update('receiver-health-v1\0').update(value).digest('hex');
}
function scopeKey(config: Scope): string {
  return digest(config, JSON.stringify([config.origin, config.mailboxId, config.databaseUrl, config.recipient]));
}
async function privateDirectory(directory: string, create = false): Promise<void> {
  if (!isAbsolute(directory)) throw new Error('Invalid receiver health directory');
  if (create) await mkdir(directory, { recursive: true, mode: 0o700 });
  const metadata = await lstat(directory);
  if (!metadata.isDirectory() || (metadata.mode & 0o777) !== 0o700
    || (process.getuid && metadata.uid !== process.getuid())) throw new Error('Invalid receiver health directory');
}
async function readLease(path: string): Promise<unknown> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || (metadata.mode & 0o777) !== 0o600
      || (process.getuid && metadata.uid !== process.getuid())) return null;
    const buffer = Buffer.alloc(2049);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > 2048) return null;
    return JSON.parse(buffer.subarray(0, bytesRead).toString('utf8'));
  } finally { await handle.close(); }
}
function validLease(value: unknown, config: Scope, scope: string, owner: string, now: number): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== 'deadline,expiresAt,owner,scope,signature,updatedAt,version'
    || record.version !== 1 || record.owner !== owner || record.scope !== scope
    || typeof record.signature !== 'string' || !/^[a-f0-9]{64}$/.test(record.signature)
    || ![record.updatedAt, record.expiresAt, record.deadline].every((time) => typeof time === 'number' && Number.isSafeInteger(time))) return false;
  const lease: Lease = { version: 1, owner, scope, updatedAt: record.updatedAt as number,
    expiresAt: record.expiresAt as number, deadline: record.deadline as number };
  if (lease.updatedAt > now || lease.expiresAt <= now || lease.expiresAt > lease.deadline
    || lease.expiresAt > lease.updatedAt + FRESHNESS_MS || lease.expiresAt <= lease.updatedAt) return false;
  return timingSafeEqual(Buffer.from(record.signature, 'hex'), Buffer.from(digest(config, JSON.stringify(lease)), 'hex'));
}

/** Operational readiness only: this never authenticates a carrier or grants phone verification. */
export async function receiverHealthIsReady(options: Options): Promise<boolean> {
  try {
    await privateDirectory(options.directory);
    const scope = scopeKey(options.config);
    const pattern = new RegExp(`^${scope}\\.(${uuid})\\.json$`);
    const files = (await readdir(options.directory)).filter((name) => pattern.test(name));
    if (files.length > MAXIMUM_FILES) return false;
    const now = (options.now ?? Date.now)();
    if (!Number.isSafeInteger(now)) return false;
    for (const name of files) {
      try {
        const owner = pattern.exec(name)![1];
        if (validLease(await readLease(join(options.directory, name)), options.config, scope, owner, now)) return true;
      } catch { /* A partially removed or malformed owner lease is not readiness evidence. */ }
    }
    return false;
  } catch { return false; }
}

/** Per-owner files make shutdown cleanup incapable of removing another receiver's lease. */
export async function createReceiverHealthLease(options: Options & { deadline: number }) {
  const now = options.now ?? Date.now;
  const startedAt = now();
  if (!Number.isSafeInteger(options.deadline) || options.deadline <= startedAt
    || options.deadline > startedAt + 300_000) throw new Error('Invalid receiver health deadline');
  await privateDirectory(options.directory, true);
  const owner = randomUUID();
  const scope = scopeKey(options.config);
  const path = join(options.directory, `${scope}.${owner}.json`);
  let stopped = false;
  let pending: Promise<void> = Promise.resolve();
  async function publish() {
    const updatedAt = now();
    if (stopped || updatedAt >= options.deadline) throw new Error('Receiver health lease ended');
    const lease: Lease = { version: 1, owner, scope, updatedAt,
      expiresAt: Math.min(updatedAt + FRESHNESS_MS, options.deadline), deadline: options.deadline };
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      const file = await open(temporary, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify({ ...lease, signature: digest(options.config, JSON.stringify(lease)) })); }
      finally { await file.close(); }
      await rename(temporary, path);
    } finally { await rm(temporary, { force: true }); }
  }
  return {
    healthy(): Promise<void> { pending = pending.then(publish, publish); return pending; },
    async stop(): Promise<void> {
      stopped = true;
      // The caller already observes any publish error; still remove its stale lease.
      await pending.catch(() => undefined);
      await rm(path, { force: true });
    },
  };
}
