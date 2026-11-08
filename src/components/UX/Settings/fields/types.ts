/**
 * Shared types for the settings field family.
 *
 * Lives separately from any single field component so that the contract
 * between field consumers and the persistence layer cannot drift across
 * EditableField / EditableLink / EditableLocation. Was previously
 * duplicated in three places — flagged in the breakpoint-4 audit.
 */

/**
 * Result returned by an `onSave` callback.
 *
 * - `void` or `{ ok: true }` — success
 * - `{ ok: false, message? }` — failure surfaced to the user as an error
 *   under the input. Throwing from `onSave` is also valid; the field
 *   catches and surfaces the message.
 */
export type SaveResult = void | { ok: false; message?: string } | { ok: true };

/**
 * Default save-timeout. The field will surface "Save timed out. Try
 * again." after this many ms and re-enable the inputs even if the
 * upstream `onSave` promise has not resolved.
 */
export const DEFAULT_SAVE_TIMEOUT_MS = 12_000;
