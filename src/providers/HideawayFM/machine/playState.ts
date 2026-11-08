/**
 * Pure tri-state play reducer.
 *
 * The HideawayFM provider must reconcile two sources of truth:
 *
 *   1. `real`       — what the Howl reports (playing, paused, loading, error, idle)
 *   2. `optimistic` — what the user just asked for (playing, paused, idle)
 *
 * The UI renders from `optimistic` so a tap on play/pause flips the button
 * instantly, even if Howler hasn't yet fired its `play`/`pause` event.
 * `previous` captures the last concrete committed `real` value so consumers
 * can distinguish a stable state from a bounce (pause→play→pause).
 *
 * Reconciliation rules:
 * - USER_* events drive `optimistic` immediately.
 * - HOWL_* events drive `real` and archive the outgoing concrete value into
 *   `previous`. They do NOT touch `optimistic` — the provider dispatches
 *   `RECONCILE` after a Howl confirms intent (or a timeout elapses) to pull
 *   `optimistic` back toward `real`.
 * - RECONCILE projects `real` into the narrower optimistic domain
 *   ("loading" holds the prior optimistic value; "error" falls back to
 *   "paused"). This is the only path that heals optimistic drift.
 * - RESET collapses every field back to "idle".
 *
 * The reducer is pure and always returns a new object — never mutates
 * `prev` — which makes it safe to memoise and exhaustively test.
 */

import type { RP_PlayEvent, RP_PlayState } from "../types";

type ConcretePlayState = RP_PlayState["previous"];

const CONCRETE_SET: ReadonlySet<RP_PlayState["real"]> = new Set<
  RP_PlayState["real"]
>(["playing", "paused", "idle"]);

const isConcrete = (real: RP_PlayState["real"]): real is ConcretePlayState =>
  CONCRETE_SET.has(real);

const archive = (prev: RP_PlayState): ConcretePlayState =>
  isConcrete(prev.real) ? prev.real : prev.previous;

const projectOptimistic = (
  real: RP_PlayState["real"],
  prevOptimistic: RP_PlayState["optimistic"]
): RP_PlayState["optimistic"] => {
  switch (real) {
    case "playing":
    case "paused":
    case "idle":
      return real;
    case "loading":
      return prevOptimistic;
    case "error":
      return "paused";
    default: {
      const _exhaustive: never = real;
      return _exhaustive;
    }
  }
};

const toggleOptimistic = (
  optimistic: RP_PlayState["optimistic"]
): RP_PlayState["optimistic"] =>
  optimistic === "playing" ? "paused" : "playing";

const IDLE_STATE: RP_PlayState = {
  real: "idle",
  optimistic: "idle",
  previous: "idle"
};

export function reducePlayState(
  prev: RP_PlayState,
  event: RP_PlayEvent
): RP_PlayState {
  switch (event.type) {
    case "USER_PLAY":
      return prev.optimistic === "playing"
        ? prev
        : { ...prev, optimistic: "playing" };

    case "USER_PAUSE":
      return prev.optimistic === "paused"
        ? prev
        : { ...prev, optimistic: "paused" };

    case "USER_TOGGLE":
      return { ...prev, optimistic: toggleOptimistic(prev.optimistic) };

    case "HOWL_PLAY":
      return prev.real === "playing"
        ? prev
        : { ...prev, real: "playing", previous: archive(prev) };

    case "HOWL_PAUSE":
      return prev.real === "paused"
        ? prev
        : { ...prev, real: "paused", previous: archive(prev) };

    case "HOWL_END":
      return {
        ...prev,
        real: "paused",
        previous: archive(prev)
      };

    case "HOWL_LOAD":
      return prev.real === "loading"
        ? prev
        : { ...prev, real: "loading", previous: archive(prev) };

    case "HOWL_ERROR":
      return prev.real === "error"
        ? prev
        : { ...prev, real: "error", previous: archive(prev) };

    case "RECONCILE": {
      const optimistic = projectOptimistic(prev.real, prev.optimistic);
      return optimistic === prev.optimistic ? prev : { ...prev, optimistic };
    }

    case "RESET":
      return IDLE_STATE;

    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}
