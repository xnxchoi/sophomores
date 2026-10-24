import { setTimeout as sleep } from 'node:timers/promises';
import { createReceiverHealthLease } from '../lib/phone-verification/server/receiver-health';

type Lease = { healthy: () => Promise<void>; stop: () => Promise<void> };
type Health = Lease & { pause: () => Promise<void> };
type LeaseOptions = Parameters<typeof createReceiverHealthLease>[0];

/** Rotate operational leases, never phone proofs; each signed deadline remains <=5min. */
export function createRotatingReceiverHealth(options: Omit<LeaseOptions, 'deadline'> & {
  create?: (options: LeaseOptions) => Promise<Lease>;
}): Health {
  const now = options.now ?? Date.now;
  const create = options.create ?? createReceiverHealthLease;
  let current: { lease: Lease; deadline: number } | undefined;
  let owned: Lease[] = [];
  let stopped = false;
  let pending: Promise<void> = Promise.resolve();
  const serial = (operation: () => Promise<void>) => {
    pending = pending.then(operation, operation);
    return pending;
  };
  const remove = async (lease: Lease) => {
    await lease.stop();
    owned = owned.filter(value => value !== lease);
  };
  const clear = async () => {
    current = undefined;
    let failed = false;
    for (const lease of owned) {
      try { await remove(lease); } catch { failed = true; }
    }
    if (failed) throw new Error('Receiver health cleanup failed');
  };
  return {
    healthy: () => serial(async () => {
      if (stopped) throw new Error('Receiver health stopped');
      if (!current || current.deadline - now() <= 30_000) {
        const previous = current;
        const deadline = now() + 300_000;
        const lease = await create({ config: options.config, directory: options.directory, now, deadline });
        owned = [...owned, lease];
        await lease.healthy();
        current = { lease, deadline };
        if (previous) await remove(previous.lease);
      } else await current.lease.healthy();
    }),
    pause: () => serial(clear),
    stop: () => { stopped = true; return serial(clear); },
  };
}

/** Budget waiting is not network time: start the bounded body deadline only after permission. */
export function createSupervisedReceiverFetch(options: {
  signal: AbortSignal; requestBudget: () => Promise<void>; fetch?: typeof globalThis.fetch;
  timeout?: () => AbortSignal;
}): typeof globalThis.fetch {
  return async (url, init) => {
    options.signal.throwIfAborted();
    await options.requestBudget();
    options.signal.throwIfAborted();
    const signal = AbortSignal.any([options.signal, (options.timeout ?? (() => AbortSignal.timeout(15_000)))(),
      ...(init?.signal ? [init.signal] : [])]);
    return (options.fetch ?? globalThis.fetch)(url, { ...init, signal });
  };
}

/** Continuous only under an explicit supervisor; provider failure retries remain bounded. */
export async function serveReceiver(options: {
  signal: AbortSignal; poll: () => Promise<void>; health: Health;
  takeRateDelay?: () => number; sleep?: (ms: number) => Promise<void>; log?: (message: string) => void;
}): Promise<void> {
  let failures = 0;
  let stopPromise: Promise<void> | undefined;
  const stop = () => {
    stopPromise ??= Promise.resolve().then(options.health.stop);
    void stopPromise.catch(() => undefined);
    return stopPromise;
  };
  const abort = () => { void stop(); };
  const wait = options.sleep ?? ((ms: number) => sleep(ms, undefined, { signal: options.signal }));
  const log = options.log ?? console.log;
  options.signal.addEventListener('abort', abort, { once: true });
  try {
    while (!options.signal.aborted) {
      try {
        await options.poll();
        if (options.signal.aborted) break;
        await options.health.healthy();
        failures = 0;
        if (!options.signal.aborted) await wait(10_000);
      } catch {
        if (options.signal.aborted) break;
        await options.health.pause();
        const rateDelay = options.takeRateDelay?.() ?? 0;
        if (Number.isSafeInteger(rateDelay) && rateDelay > 0 && rateDelay <= 3_600_000) {
          log('Receiver paused at its provider request cap; readiness is unavailable until capacity returns.');
          await wait(rateDelay);
          continue;
        }
        if (++failures >= 3) throw new Error('Receiver consecutive scan failures');
        log('Receiver scan failed; readiness is unavailable during bounded retry backoff.');
        await wait(failures === 1 ? 10_000 : 30_000);
      }
    }
  } finally {
    options.signal.removeEventListener('abort', abort);
    await stop();
  }
}
