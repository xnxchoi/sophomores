import { basename, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { loadZohoReceiverConfig, readReceiverSecrets, receiverOAuthConfig, writeReceiverSecrets } from '../lib/phone-verification/server/receiver-config';
import { createLocalVerificationRuntime } from '../lib/phone-verification/server/runtime';
import { exchangeZohoAuthorizationCode, fetchZohoOriginal, fetchZohoVerificationPage, refreshZohoAccessToken } from '../lib/phone-verification/server/zoho';
import { pollZohoOnce } from '../lib/phone-verification/server/poller';
import { processNextZohoDelivery } from '../lib/phone-verification/server/worker';
import { verifySktZohoArc } from '../lib/phone-verification/server/skt-arc';
import { createReceiverHealthLease, receiverHealthDirectory } from '../lib/phone-verification/server/receiver-health';
import { acquireReceiverLock, ReceiverOwnershipError } from '../lib/phone-verification/server/receiver-lock';
import { createRotatingReceiverHealth, createSupervisedReceiverFetch, serveReceiver } from './phone-receiver-service';
import { ReceiverBudgetPause, requestReceiverBudget } from './phone-receiver-budget';

class ReceiverConfigurationError extends Error {
  readonly exitCode = 78;
  constructor() { super('Local receiver configuration or supervisor required'); }
}

export function requireReceiverSupervisor(parent: { connected?: boolean; send?: unknown } = process): void {
  if (parent.connected !== true || typeof parent.send !== 'function') throw new ReceiverConfigurationError();
}

/** Only the guarded local receiver may opt into this reviewed verifier. */
export function receiverCarrierAuthentication(
  config: ReturnType<typeof loadZohoReceiverConfig>,
  verifier: typeof verifySktZohoArc = verifySktZohoArc,
) {
  if (config.carrierPolicy !== 'local-skt-zoho-arc-v1') return {};
  return {
    expectedCarrierPolicy: config.carrierPolicy,
    authenticateCarrier: config.allowLegacyZohoArc
      ? (raw: Parameters<typeof verifier>[0], message: Parameters<typeof verifier>[1]) => verifier(raw, message, { allowLegacyZohoKey: true })
      : verifier,
  };
}

export function parseReceiverCommand(args: readonly string[]) {
  const [command = 'once', flag, value, ...extra] = args;
  if (!['prepare', 'authorize', 'once', 'watch', 'serve'].includes(command) || extra.length
    || (command !== 'watch' && (flag || value))
    || (command === 'watch' && flag !== undefined && (flag !== '--seconds' || !/^[0-9]{2,3}$/.test(value ?? '') || Number(value) < 10 || Number(value) > 300))) {
    throw new ReceiverConfigurationError();
  }
  return { command, seconds: command === 'serve' ? 0 : command === 'watch' ? Number(value ?? 300) : 60 };
}

/** One budget covers token exchange, metadata and originals; no automatic retries. */
export function receiverFetch(options: { signal: AbortSignal; maximum: number; fetch?: typeof globalThis.fetch }): typeof globalThis.fetch {
  if (!Number.isInteger(options.maximum) || options.maximum < 1 || options.maximum > 150) throw new Error('Invalid receiver request budget');
  let used = 0;
  return async (url, init) => {
    if (options.signal.aborted || used >= options.maximum) throw new Error('Receiver request budget ended');
    used++;
    return (options.fetch ?? globalThis.fetch)(url, { ...init,
      signal: AbortSignal.any([options.signal, ...(init?.signal ? [init.signal] : [])]) });
  };
}

export async function watchReceiver(options: {
  signal: AbortSignal; seconds: number; poll: () => Promise<void>;
  now?: () => number; sleep?: (ms: number) => Promise<void>;
  health?: { healthy: () => Promise<void>; stop: () => Promise<void> };
}): Promise<void> {
  if (!Number.isInteger(options.seconds) || options.seconds < 10 || options.seconds > 300) throw new Error('Invalid receiver watch duration');
  const now = options.now ?? Date.now;
  const deadline = now() + options.seconds * 1000;
  let stopPromise: Promise<void> | undefined;
  const stopHealth = () => {
    stopPromise ??= Promise.resolve().then(() => options.health?.stop());
    // Observe immediately on abort; finally awaits this same promise and propagates failure.
    void stopPromise.catch(() => undefined);
    return stopPromise;
  };
  const abortHealth = () => { void stopHealth(); };
  options.signal.addEventListener('abort', abortHealth, { once: true });
  try {
    while (!options.signal.aborted && now() < deadline) {
      await options.poll();
      const remaining = deadline - now();
      if (remaining > 0 && !options.signal.aborted) {
        await options.health?.healthy();
        try {
          await (options.sleep ?? ((ms) => sleep(ms, undefined, { signal: options.signal })))(Math.min(10_000, remaining));
        } catch (error) { if (!options.signal.aborted) throw error; }
      }
    }
  } finally {
    options.signal.removeEventListener('abort', abortHealth);
    await stopHealth();
  }
}

async function prepare(path: string) {
  await mkdir(join(path, '..'), { recursive: true, mode: 0o700 });
  await writeReceiverSecrets(path, {
    PHONE_VERIFICATION_ZOHO_MAIL_ORIGIN: 'https://mail.zoho.com',
    PHONE_VERIFICATION_ZOHO_ACCOUNTS_ORIGIN: 'https://accounts.zoho.com',
    PHONE_VERIFICATION_ZOHO_CLIENT_ID: 'REPLACE_CLIENT_ID',
    PHONE_VERIFICATION_ZOHO_CLIENT_SECRET: 'REPLACE_CLIENT_SECRET',
    PHONE_VERIFICATION_ZOHO_AUTHORIZATION_CODE: 'REPLACE_AUTHORIZATION_CODE',
  }, true);
  console.log('Private receiver setup file created. See deployment/PHONE-VERIFICATION.md; no provider requests made.');
}

async function authorize(path: string, fetch: typeof globalThis.fetch) {
  const secrets = await readReceiverSecrets(path);
  const oauth = receiverOAuthConfig(secrets);
  const code = secrets.PHONE_VERIFICATION_ZOHO_AUTHORIZATION_CODE ?? '';
  if (!code || code.startsWith('REPLACE_')) throw new Error('A fresh read-only Self Client code is required.');
  const result = await exchangeZohoAuthorizationCode({ ...oauth, code, fetch });
  const remaining = Object.fromEntries(Object.entries(secrets).filter(([key]) => key !== 'PHONE_VERIFICATION_ZOHO_AUTHORIZATION_CODE'));
  await writeReceiverSecrets(path, { ...remaining, PHONE_VERIFICATION_ZOHO_REFRESH_TOKEN: result.refreshToken });
  console.log('Read-only authorization saved privately; the one-use code was removed. No mailbox messages read.');
}

async function receive(path: string, args: ReturnType<typeof parseReceiverCommand>, outerSignal: AbortSignal, boundedFetch: typeof globalThis.fetch, deadline: number) {
  let config: ReturnType<typeof loadZohoReceiverConfig>;
  try { config = loadZohoReceiverConfig(process.env, await readReceiverSecrets(path)); }
  catch { throw new ReceiverConfigurationError(); }
  const active = createLocalVerificationRuntime(config);
  const lockLost = new AbortController();
  const signal = AbortSignal.any([outerSignal, lockLost.signal]);
  let lock: Awaited<ReturnType<typeof acquireReceiverLock>> | undefined;
  let rateDelay = 0;
  const fetch = args.command === 'serve'
    ? createSupervisedReceiverFetch({ signal, requestBudget: async () => {
      try { await requestReceiverBudget(signal); }
      catch (error) {
        if (error instanceof ReceiverBudgetPause) rateDelay = error.retryAfterMs;
        throw error;
      }
    } })
    : ((url, init) => boundedFetch(url, { ...init,
      signal: AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])]) })) as typeof globalThis.fetch;
  let cached: { accessToken: string; expiresAt: number } | undefined;
  const tokenProvider = async () => {
    if (!cached || cached.expiresAt <= Date.now()) {
      const token = await refreshZohoAccessToken({ ...config, fetch });
      cached = { accessToken: token.accessToken, expiresAt: Date.now() + Math.max(0, token.expiresInSeconds - 30) * 1000 };
    }
    return cached.accessToken;
  };
  const poll = async () => {
    const until = new Date(); const since = new Date(until.getTime() - 300_000);
    const result = await pollZohoOnce({
      searchPage: ({ start, limit }) => fetchZohoVerificationPage({ ...config, accountId: config.mailboxId, tokenProvider, since, until, start, limit, fetch }),
      repository: { enqueueDelivery: async (reference) => {
        signal.throwIfAborted(); return active.repository.enqueueDelivery(reference);
      } },
      processNext: (messageIds) => {
        signal.throwIfAborted();
        return processNextZohoDelivery({ ...config, ...receiverCarrierAuthentication(config), repository: {
          claimDelivery: () => active.repository.claimDelivery(undefined, undefined, { mailboxId: config.mailboxId, messageIds: [...messageIds] }),
          completeDelivery: (fence, now) => active.repository.completeDelivery(fence, now),
          failDelivery: (fence, now) => active.repository.failDelivery(fence, now),
        }, service: active.service,
        fetchOriginal: async (messageId) => {
          if (!messageIds.has(messageId)) throw new Error('Original outside filtered scan');
          return fetchZohoOriginal(messageId, { ...config, accountId: config.mailboxId, tokenProvider, fetch });
        } });
      },
    });
    console.log(`Receiver scan complete: ${result.enqueued} queued, ${result.completed} processed, ${result.invalidMessages} invalid skipped. Check preview status; registration grants remain disabled.`);
  };
  try {
    lock = await acquireReceiverLock(() => active.pool.connect(), config, () => lockLost.abort('Receiver lock lost'));
    signal.throwIfAborted();
    if (args.command === 'once') await poll();
    else if (args.command === 'serve') {
      const health = createRotatingReceiverHealth({ config, directory: receiverHealthDirectory() });
      await serveReceiver({ signal, poll, health, takeRateDelay: () => {
        const delay = rateDelay; rateDelay = 0; return delay;
      } });
      if (lockLost.signal.aborted && !outerSignal.aborted) throw new Error('Receiver lock lost');
    }
    else {
      const health = await createReceiverHealthLease({ config, directory: receiverHealthDirectory(), deadline });
      await watchReceiver({ signal, seconds: args.seconds, poll, health });
    }
  } finally { cached = undefined; lock?.release(); await active.pool.end(); }
}

async function main() {
  const args = parseReceiverCommand(process.argv.slice(2));
  if (args.command === 'serve') requireReceiverSupervisor();
  const path = join(process.cwd(), '.deployment', 'phone-verification-local', 'zoho-receiver.env');
  if (args.command === 'prepare') return prepare(path);
  const controller = new AbortController();
  const deadline = Date.now() + args.seconds * 1000;
  const timer = args.command === 'serve' ? undefined : setTimeout(() => controller.abort('deadline'), args.seconds * 1000);
  const stop = () => controller.abort('interrupted');
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  if (args.command === 'serve') process.once('disconnect', stop);
  const fetch = receiverFetch({ signal: controller.signal, maximum: 150 });
  try {
    if (args.command === 'authorize') await authorize(path, fetch);
    else await receive(path, args, controller.signal, fetch, deadline);
  } catch (error) {
    if (!controller.signal.aborted || args.command === 'authorize') throw error;
    console.log('Receiver stopped at its deadline or on interrupt; unfinished work remains retryable. No registration approval was issued.');
  } finally {
    clearTimeout(timer); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
    process.removeListener('disconnect', stop);
  }
}

if (process.argv[1] && basename(process.argv[1]) === 'phone-verification-receive.ts') {
  main().catch((error) => {
    console.error('Receiver stopped or failed. Check private configuration, authorization, local database and the receive-only runbook. No registration approval was issued.');
    process.exitCode = error instanceof ReceiverConfigurationError || error instanceof ReceiverOwnershipError ? 78 : 1;
  });
}
