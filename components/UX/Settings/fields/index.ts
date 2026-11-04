/**
 * Settings field family — four affordance tiers, each visually distinct.
 *
 * Per CLAUDE.md "Admin surfaces (Fey direction)" → Field affordance tiers:
 *   1. <LockedField>     — read-only; lock glyph; no underline cliché
 *   2. <EditableField>   — deferred-edit; pencil + hairline reveal on hover
 *      <EditableLink>    — Tier-2 specialization with cmdk popular-sites combobox
 *      <EditableLocation>— Tier-2 specialization with place-autocomplete combobox
 *   3. <ToggleField>/<ChoiceField>  — soft control; iOS switch / radio pills
 *   4. <ActionField>+<ActionButton> — verified action; pill button → modal
 */

export { FieldRow } from "./FieldRow";
export { LockedField } from "./LockedField";
export { EditableField } from "./EditableField";
export { EditableLink } from "./EditableLink";
export { EditableLocation } from "./EditableLocation";
export { ToggleField, ChoiceField } from "./ToggleField";
export { ActionField, ActionButton } from "./ActionField";

export {
  POPULAR_SITES,
  matchSite,
  urlPrefixFor,
  type PopularSite
} from "./_popular-sites";
