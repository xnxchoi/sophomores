"use client";

/**
 * Role-gated button-tier API for the HideawayFM transport.
 *
 * Consumers (TapePlayer controls) read from this hook instead of the raw
 * `useHideawayFMControls()` so that skip/rewind simply *do not exist* for
 * roles that are not allowed to scrub. Call sites can then render via
 * `{controls.skip && <ForwardButton ... />}` and the button disappears
 * — no disabled state, no click-that-does-nothing.
 *
 * Role map (CLAUDE.md § Role-Based Layout Tiering):
 *   `admin` | `editor` | `author`  → premium: toggle + skip + rewind
 *   `user`  | `patron`             → gated:   toggle only
 *
 * The `patron` sitting on the "gated" side is deliberate: the Hideaway's
 * `plan.md` frames this as an internet-radio UX where the listener never
 * controls the dial. Only staff roles may scrub. (Subscription-tier gating
 * is explicitly out of scope per the plan's "NOT Building" list — role is
 * set directly on the user today.)
 */

import { useMemo } from "react";

import { useRPSession } from "@/hideaway/lib/auth/session/RP_SessionProvider";

import { useHideawayFMControls } from "./index";

export interface RadioControls {
  /** Always present. Flips between play and pause, respecting the tri-state. */
  toggle: () => void;
  /** Advance to the next track. Undefined for gated roles. */
  skip?: () => Promise<void>;
  /** Jump to the previous track. Undefined for gated roles. */
  rewind?: () => Promise<void>;
}

const PREMIUM_ROLES = new Set(["admin", "editor", "author"]);

export function useRadioControls(): RadioControls {
  const controls = useHideawayFMControls();
  const role = useRPSession((s) => s.role);
  const isPremium = PREMIUM_ROLES.has(role);

  return useMemo<RadioControls>(() => {
    if (!isPremium) {
      return { toggle: controls.toggle };
    }
    return {
      toggle: controls.toggle,
      skip: controls.next,
      rewind: controls.previous
    };
  }, [controls, isPremium]);
}
