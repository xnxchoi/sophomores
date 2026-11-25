"use client";

import { subscribeWithSelector } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import type { NudgeSpec, TargetMeta } from "./types";
import { reachableHref } from "@/lib/content/essays";

// ─── Registration Tour ────────────────────────────────────────────────────────

export type RegistrationStep =
  | "welcome"
  | "profile" // firstName + lastName (required) + bio (optional)
  | "details" // location + link (optional)
  | "complete";

/**
 * How incomplete the user's profile is.
 *   required      — firstName or lastName is missing (blocking)
 *   high-optional — >70 % of optional fields are untouched
 *   low-optional  — ≤70 % of optional fields are untouched
 *   complete      — user.onboarded === true
 */
export type OnboardingSeverity =
  | "required"
  | "high-optional"
  | "low-optional"
  | "complete";

export type PendingFields = {
  needsIdentity: boolean; // firstName or lastName missing
  hasPreexistingData: boolean; // user has some fields already filled (e.g. OAuth)
  severity: OnboardingSeverity;
};

const REG_STEPS: RegistrationStep[] = [
  "welcome",
  "profile",
  "details",
  "complete"
];

// ─── Interface Guide ──────────────────────────────────────────────────────────

export type TourTarget = {
  id: string;
  label: string;
  description: string;
  href: "/essays" | "/music" | "/help";
  action: string;
};

const ALL_INTERFACE_TARGETS: TourTarget[] = [
  { id: "reading", href: "/essays", label: "tour.reading.label",
    description: "tour.reading.description", action: "tour.reading.action" },
  { id: "music", href: "/music", label: "tour.music.label",
    description: "tour.music.description", action: "tour.music.action" },
  { id: "help", href: "/help", label: "tour.help.label",
    description: "tour.help.description", action: "tour.help.action" },
];
/** The guide's stops, without any section the site has switched off (src/lib/content/essays.ts). */
export const INTERFACE_TARGETS: TourTarget[] = ALL_INTERFACE_TARGETS.filter((target) => reachableHref(target.href) !== undefined);

// ─── Store ────────────────────────────────────────────────────────────────────

export type TourStore = {
  // registration
  regActive: boolean;
  regStep: RegistrationStep;
  regSteps: RegistrationStep[];
  regPending: PendingFields;
  regDismissed: boolean;
  /** Path the user was on when the tour was triggered (for post-completion nav) */
  regFromPath: string | null;
  /** Whether to show the non-blocking onboarding banner instead of full overlay */
  regBannerMode: boolean;

  openRegistrationTour: (pending: PendingFields, fromPath?: string) => void;
  closeRegistrationTour: () => void;
  dismissRegistrationTour: () => void;
  regNext: () => void;
  regPrev: () => void;
  regGoTo: (step: RegistrationStep) => void;

  // interface guide
  ifActive: boolean;
  ifIndex: number;
  ifTargets: TourTarget[];

  openInterfaceTour: () => void;
  closeInterfaceTour: () => void;
  ifNext: () => void;
  ifPrev: () => void;
  ifGoTo: (index: number) => void;

  // ── nudge engine ────────────────────────────────────────────────────────
  nudgeQueue: NudgeSpec[];
  activeNudge: NudgeSpec | null;
  targetRegistry: Map<string, TargetMeta>;
  sessionDismissed: Set<string>;

  enqueueNudge: (spec: NudgeSpec) => void;
  dismissNudge: (id: string, opts?: { permanent?: boolean }) => void;
  registerTarget: (meta: TargetMeta) => void;
  unregisterTarget: (id: string) => void;
  markSessionDismissed: (key: string) => void;
  hasSessionDismissed: (key: string) => boolean;
};

export const createTourStore = () =>
  createStore<TourStore>()(
    subscribeWithSelector((set, get) => ({
      // ── Registration ──────────────────────────────────────────────────────
      regActive: false,
      regStep: "welcome",
      regSteps: REG_STEPS,
      regPending: {
        needsIdentity: false,
        hasPreexistingData: false,
        severity: "complete"
      },
      regDismissed: false,
      regFromPath: null,
      regBannerMode: false,

      openRegistrationTour: (pending, fromPath) =>
        set({
          regActive: true,
          regDismissed: false,
          regStep: "welcome",
          regSteps: REG_STEPS,
          regPending: pending,
          regFromPath: fromPath ?? null,
          regBannerMode: false
        }),

      closeRegistrationTour: () => set({ regActive: false }),

      dismissRegistrationTour: () =>
        set({ regActive: false, regDismissed: true }),

      regNext: () => {
        const { regSteps, regStep } = get();
        const i = regSteps.indexOf(regStep);
        if (i < regSteps.length - 1) set({ regStep: regSteps[i + 1] });
      },

      regPrev: () => {
        const { regSteps, regStep } = get();
        const i = regSteps.indexOf(regStep);
        if (i > 0) set({ regStep: regSteps[i - 1] });
      },

      regGoTo: (step) => set({ regStep: step }),

      // ── Interface Guide ───────────────────────────────────────────────────
      ifActive: false,
      ifIndex: 0,
      ifTargets: INTERFACE_TARGETS,

      openInterfaceTour: () => set({ ifActive: true, ifIndex: 0 }),

      // Closing keeps the step, so the dialog's exit shows the step the visitor left; opening starts over.
      closeInterfaceTour: () => set({ ifActive: false }),

      ifNext: () => {
        const { ifIndex, ifTargets } = get();
        if (ifIndex < ifTargets.length - 1) set({ ifIndex: ifIndex + 1 });
        else get().closeInterfaceTour();
      },

      ifPrev: () => {
        const { ifIndex } = get();
        if (ifIndex > 0) set({ ifIndex: ifIndex - 1 });
      },

      ifGoTo: (index) =>
        set({
          ifIndex: Math.max(0, Math.min(index, INTERFACE_TARGETS.length - 1))
        }),

      // ── Nudge engine ──────────────────────────────────────────────────────
      nudgeQueue: [],
      activeNudge: null,
      targetRegistry: new Map(),
      sessionDismissed: new Set(),

      enqueueNudge: (spec) => {
        const { nudgeQueue, activeNudge, sessionDismissed } = get();
        if (spec.dismissKey && sessionDismissed.has(spec.dismissKey)) return;
        if (nudgeQueue.some((n) => n.id === spec.id)) return;
        if (activeNudge?.id === spec.id) return;
        const next = [...nudgeQueue, spec].sort(
          (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
        );
        if (!activeNudge) {
          set({ activeNudge: next[0], nudgeQueue: next.slice(1) });
        } else {
          set({ nudgeQueue: next });
        }
      },

      dismissNudge: (id, opts) => {
        const { activeNudge, nudgeQueue, sessionDismissed } = get();
        if (activeNudge?.id !== id) {
          set({ nudgeQueue: nudgeQueue.filter((n) => n.id !== id) });
          return;
        }
        const [head, ...rest] = nudgeQueue;
        const nextDismissed = (() => {
          if (!opts?.permanent || !activeNudge.dismissKey)
            return sessionDismissed;
          const clone = new Set(sessionDismissed);
          clone.add(activeNudge.dismissKey);
          return clone;
        })();
        set({
          activeNudge: head ?? null,
          nudgeQueue: rest,
          sessionDismissed: nextDismissed
        });
      },

      registerTarget: (meta) => {
        const prev = get().targetRegistry;
        const next = new Map(prev);
        next.set(meta.id, meta);
        set({ targetRegistry: next });
      },

      unregisterTarget: (id) => {
        const prev = get().targetRegistry;
        if (!prev.has(id)) return;
        const next = new Map(prev);
        next.delete(id);
        set({ targetRegistry: next });
      },

      markSessionDismissed: (key) => {
        const prev = get().sessionDismissed;
        if (prev.has(key)) return;
        const next = new Set(prev);
        next.add(key);
        set({ sessionDismissed: next });
      },

      hasSessionDismissed: (key) => get().sessionDismissed.has(key)
    }))
  );
