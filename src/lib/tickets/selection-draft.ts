import { z } from "zod";

export const TICKET_SELECTION_DRAFT_KEY = "sphmrs.ticket-selection.v1";
/** UI continuity only: this is not a sale window, quote TTL or reservation. */
export const TICKET_DRAFT_RETENTION_MS = 24 * 60 * 60 * 1000;

// These bound local parsing/work, not commercial ticket availability or limits.
const maximumCharacters = 16_384;
const clock = z.int().nonnegative();
const selectionItem = z.strictObject({
  ticketTypeId: z.string().min(1).max(128)
    .refine((value) => !/[^A-Za-z0-9_-]/.test(value)),
  quantity: z.int().min(1).max(1000)
}).readonly();
const selections = z.array(selectionItem).min(1).max(20)
  .refine((items) => new Set(items.map((item) => item.ticketTypeId)).size === items.length)
  .readonly();
const draftSchema = z.strictObject({
  schemaVersion: z.literal(1),
  items: selections,
  savedAt: clock.max(Number.MAX_SAFE_INTEGER - TICKET_DRAFT_RETENTION_MS),
  expiresAt: clock,
  returnToTickets: z.boolean()
}).refine((draft) => draft.expiresAt === draft.savedAt + TICKET_DRAFT_RETENTION_MS)
  .readonly();
const saveOptions = z.strictObject({ now: clock.optional(), returnToTickets: z.boolean().optional() });

export type SelectionItem = z.infer<typeof selectionItem>;
export type TicketSelectionDraft = z.infer<typeof draftSchema>;
export type TicketDraftStorage = Pick<Storage, "getItem" | "setItem">;
export type TicketDraftResult =
  | { status: "ready"; draft: TicketSelectionDraft }
  | { status: "empty" | "invalid" | "expired" | "unavailable" };

/**
 * Zod owns validation; native JSON/Storage own serialization and persistence.
 * Installed Zustand persist needs a reactive store and is not a substitute for
 * this narrow, validated handoff record. No equivalent ticket helper exists.
 * Keep browser-global access in the React owner so denied localStorage getters
 * can be surfaced there. This record never establishes identity or price trust.
 */
export function readTicketSelectionDraft(
  storage: TicketDraftStorage,
  now = Date.now()
): TicketDraftResult {
  if (!clock.safeParse(now).success) return { status: "invalid" };
  let raw: string | null;
  try { raw = storage.getItem(TICKET_SELECTION_DRAFT_KEY); }
  catch { return { status: "unavailable" }; }
  if (raw === null) return { status: "empty" };
  // Limit UTF-16 characters before parsing; valid identifiers are ASCII only.
  if (typeof raw !== "string" || raw.length > maximumCharacters) return { status: "invalid" };
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { return { status: "invalid" }; }
  const result = draftSchema.safeParse(value);
  if (!result.success || result.data.savedAt > now) return { status: "invalid" };
  if (result.data.expiresAt <= now) return { status: "expired" };
  return { status: "ready", draft: result.data };
}

export function saveTicketSelectionDraft(
  storage: TicketDraftStorage,
  items: readonly SelectionItem[],
  options: { now?: number; returnToTickets?: boolean } = {}
): TicketDraftResult {
  const parsed = saveOptions.safeParse(options);
  if (!parsed.success) return { status: "invalid" };
  const now = parsed.data.now ?? Date.now();
  return writeDraft(storage, {
    schemaVersion: 1,
    items,
    savedAt: now,
    expiresAt: now + TICKET_DRAFT_RETENTION_MS,
    returnToTickets: parsed.data.returnToTickets ?? false
  });
}

/** Clear only navigation intent; do not extend or delete the selected tickets. */
export function clearTicketReturnIntent(
  storage: TicketDraftStorage,
  now = Date.now()
): TicketDraftResult {
  const current = readTicketSelectionDraft(storage, now);
  if (current.status !== "ready" || !current.draft.returnToTickets) return current;
  return writeDraft(storage, { ...current.draft, returnToTickets: false });
}

function writeDraft(storage: TicketDraftStorage, candidate: unknown): TicketDraftResult {
  const result = draftSchema.safeParse(candidate);
  if (!result.success) return { status: "invalid" };
  try { storage.setItem(TICKET_SELECTION_DRAFT_KEY, JSON.stringify(result.data)); }
  catch { return { status: "unavailable" }; }
  return { status: "ready", draft: result.data };
}
