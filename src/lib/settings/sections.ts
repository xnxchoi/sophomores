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
  { label: "generalLabel" | "accountLabel" | "securityLabel"; blurb: "generalBlurb" | "accountBlurb" | "securityBlurb" }
> = {
  general: {
    label: "generalLabel",
    blurb: "generalBlurb",
  },
  account: {
    label: "accountLabel",
    blurb: "accountBlurb",
  },
  security: {
    label: "securityLabel",
    blurb: "securityBlurb",
  },
};
