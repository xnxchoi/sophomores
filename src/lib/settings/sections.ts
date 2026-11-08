/**
 * Settings sections — structural source of truth.
 */
export type SettingsSectionSlug = "general" | "account" | "security";

export const SETTINGS_SECTION_SLUGS: ReadonlyArray<SettingsSectionSlug> = [
  "general",
  "account",
  "security",
];

export const SETTINGS_SECTION_META: Record<
  SettingsSectionSlug,
  { label: string; blurb: string }
> = {
  general: {
    label: "General",
    blurb: "Interface and display preferences.",
  },
  account: {
    label: "Account",
    blurb: "Attendee identifier, verified phone, and ticket details.",
  },
  security: {
    label: "Security",
    blurb: "Passkeys, active sessions, and credential protections.",
  },
};
