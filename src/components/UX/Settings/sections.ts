/**
 * Settings sections — structural source of truth.
 *
 * Slugs and ordering live here. **Labels and blurbs do not** — they are
 * locale text and live in `messages/*.json` under the `Settings.sections`
 * namespace, fetched via `useTranslations("Settings.sections")` (client)
 * or `getTranslations("Settings.sections")` (server) keyed by slug.
 *
 * This file should never grow back into a static `{ slug, label, blurb }`
 * object — that pattern is what got us into the i18n hole. If a new
 * section is added, append its slug below and add the translation entry
 * to every locale file.
 *
 * Section axes (why these five exist):
 *   - **General**       — interface preferences (language, theme, motion).
 *   - **Profile**       — public-facing identity (name, bio, location, link).
 *   - **Account**       — administrative (handle, email, password, address,
 *                         billing).
 *   - **Security**      — credential protections (2FA, sessions, OAuth,
 *                         passkeys, account closure).
 *   - **Notifications** — what we send and how often.
 */

export type SettingsSectionSlug =
  | "general"
  | "profile"
  | "account"
  | "security"
  | "notifications";

/** Authoritative ordering for the rail and the hub. */
export const SETTINGS_SECTION_SLUGS: ReadonlyArray<SettingsSectionSlug> = [
  "general",
  "profile",
  "account",
  "security",
  "notifications"
];
