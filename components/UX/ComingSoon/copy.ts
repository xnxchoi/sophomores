export const CHIP_KEYS = [
  "default",
  "draft",
  "soon",
  "queued", "inProgress"
] as const;
export type ChipLabel = (typeof CHIP_KEYS)[number];

export const DISPATCH_KEYS = ["default"] as const;
export type DispatchKey = (typeof DISPATCH_KEYS)[number];

export const TOOLTIP_KEYS = ["draft", "inProgress"] as const;
export type TooltipKey = (typeof TOOLTIP_KEYS)[number];

export const TOAST_KEYS = ["unavailable", "locked"] as const;
export type ToastKey = (typeof TOAST_KEYS)[number];
