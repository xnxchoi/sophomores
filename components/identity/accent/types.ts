export const ACCENT_NAMES = [
  "none",
  "red",
  "amber",
  "citrus",
  "moss",
  "cobalt",
  "violet",
  "blush",
  "ink"
] as const;

export type AccentName = (typeof ACCENT_NAMES)[number];

export const ARCHIVE_LAYOUTS = ["left", "right"] as const;

export type ArchiveLayout = (typeof ARCHIVE_LAYOUTS)[number];

export interface AccentIdentity {
  accent: AccentName;
  layout: ArchiveLayout;
}

export const DEFAULT_IDENTITY: AccentIdentity = {
  accent: "none",
  layout: "left"
};

export function isAccentName(value: unknown): value is AccentName {
  return (
    typeof value === "string" &&
    (ACCENT_NAMES as readonly string[]).includes(value)
  );
}

export function isArchiveLayout(value: unknown): value is ArchiveLayout {
  return (
    typeof value === "string" &&
    (ARCHIVE_LAYOUTS as readonly string[]).includes(value)
  );
}
