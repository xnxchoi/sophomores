/**
 * Settings primitives.
 *
 * Two generations live here:
 *   - Legacy: SettingsGroup, SettingsRow, EditableText, GlassPanel —
 *     kept exported during the migration so in-flight section pages keep
 *     compiling. Do not author against these for new work; reach for the
 *     Fey-direction primitives below.
 *   - Fey direction: Panel, PanelGrid, PanelHeader, PanelControls, plus
 *     the typed field family (LockedField / EditableField /
 *     ToggleField / ChoiceField / ActionField / ActionButton). These
 *     match CLAUDE.md "Admin surfaces (Fey direction)".
 *
 * **Localization:** every user-facing string in these primitives is
 * sourced from `messages/*.json` via `useTranslations` /
 * `getTranslations`. New code should never declare static `LABELS`
 * objects or locale-conditional ternaries — see `sections.ts` for the
 * structural-data-only convention, and `messages/*.json` under the
 * `Settings.*` namespace for the canonical place to add copy.
 */

// Fey-direction primitives (preferred)
export {
  Panel,
  PanelBento,
  PanelGrid,
  PanelHeader,
  PanelControls
} from "./Panel";
export { Masthead } from "./Masthead";
export { SectionLink, SectionGroup } from "./SectionLink";
export { QuickStrip } from "./QuickStrip";
export { SubRouteHeader } from "./SubRouteHeader";
export { SettingsRail } from "./SettingsRail";
export { SettingsPane } from "./SettingsPane";
export { SettingsNavProvider } from "./SettingsNav";
export {
  FieldRow,
  LockedField,
  EditableField,
  EditableLink,
  EditableLocation,
  ToggleField,
  ChoiceField,
  ActionField,
  ActionButton,
  POPULAR_SITES,
  matchSite,
  urlPrefixFor,
  type PopularSite
} from "./fields";

// Legacy (kept while sections are migrated; will be deleted once nothing
// imports them).
export { SettingsGroup, SettingsRow } from "./SettingsRow";
export { EditableText } from "./EditableText";
export { SaveStatus, type SaveState } from "./SaveStatus";
export { SectionEmpty } from "./SectionEmpty";
export { EditorialButton } from "./EditorialButton";
export { GlassPanel, type GlassPanelVariant } from "./GlassPanel";

// Structural data — slug list and type only. Labels/blurbs live in i18n.
export { SETTINGS_SECTION_SLUGS, type SettingsSectionSlug } from "./sections";
