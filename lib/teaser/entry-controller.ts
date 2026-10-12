import { entryTokens } from "./entry-tokens";

export type EntryState = "initial" | "away" | "clean";

/** Deep links/restored positions must not wait for the opening timeline. */
export function createEntryState(
  scrollY: number,
  deepLink: boolean
): EntryState {
  return deepLink ||
    (Number.isFinite(scrollY) && scrollY >= entryTokens.scroll.rearm)
    ? "away"
    : "initial";
}

/** Separate thresholds prevent inertial scrolling near zero from replaying the intro. */
export function updateEntryState(
  state: EntryState,
  scrollY: number
): EntryState {
  if (!Number.isFinite(scrollY)) return state;
  if (state === "away" && scrollY <= entryTokens.scroll.reset) return "clean";
  if (state !== "away" && scrollY >= entryTokens.scroll.rearm) return "away";
  return state;
}
