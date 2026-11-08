"use client";

export type NudgeVariant =
  | "toast-anchored"
  | "banner"
  | "spotlight-tooltip"
  | "idle-hint";

export type NudgePlacement = "top" | "bottom" | "left" | "right";

export type SignalId =
  | "activation-discovery"
  | "key-pattern-repeat"
  | "idle-hover"
  | "manual";

export type TargetMeta = {
  id: string;
  element: HTMLElement;
  label: string;
  description?: string;
  shortcut?: string;
  placement?: NudgePlacement;
};

export type NudgeSpec = {
  id: string;
  variant: NudgeVariant;
  headline: string;
  body?: string;
  targetId?: string;
  placement?: NudgePlacement;
  shortcut?: string;
  source: SignalId;
  /** Auto-dismiss after N ms. Omit for sticky. */
  ttlMs?: number;
  /** Priority: higher replaces lower in queue. Default 0. */
  priority?: number;
  /** If set, dismissing marks this key as session-dismissed. */
  dismissKey?: string;
};
