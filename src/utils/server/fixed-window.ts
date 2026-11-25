/**
 * Best-effort fixed-window counters kept in this Node process: they reset on restart and are not shared between
 * instances. Used by the music API guard (src/lib/music/route-guard.ts) and the Warp entry links
 * (src/lib/content/home-entry.server.ts). Library-first check (22 Nov, music route guard): no installed limiter covers
 * app routes; better-auth's limiter runs only inside its own handler, and the commerce, preview-auth and member-auth
 * limiters are private to their mechanisms.
 */
export type FixedWindow = { count: number; resetAt: number };

const tables = new Map<string, Map<string, FixedWindow>>();

/** One table per name, so saturating one use never touches another. */
export function windowTable(name: string): Map<string, FixedWindow> {
  let found = tables.get(name);
  if (!found) tables.set(name, (found = new Map()));
  return found;
}

/** Counts one request against key; returns seconds to wait once over max, else null. */
export function hitWindow(
  windows: Map<string, FixedWindow>,
  key: string,
  { max, windowMs, maxKeys, now }: { max: number; windowMs: number; maxKeys: number; now: number }
): number | null {
  for (const [entry, window] of windows) if (window.resetAt <= now) windows.delete(entry);
  let current = windows.get(key);
  if (!current) {
    // A full table drops its oldest window instead of refusing newcomers.
    if (windows.size >= maxKeys) windows.delete(windows.keys().next().value!);
    current = { count: 0, resetAt: now + windowMs };
    windows.set(key, current);
  }
  current.count++;
  return current.count > max ? Math.max(1, Math.ceil((current.resetAt - now) / 1000)) : null;
}
