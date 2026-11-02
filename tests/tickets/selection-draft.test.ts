import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearTicketReturnIntent,
  readTicketSelectionDraft,
  saveTicketSelectionDraft,
  TICKET_DRAFT_RETENTION_MS,
  TICKET_SELECTION_DRAFT_KEY,
  type SelectionItem,
  type TicketDraftStorage
} from "../../lib/tickets/selection-draft";

const now = 1_793_577_600_000;
const items = [{ ticketTypeId: "first-night-preview", quantity: 3 }] as const;

function memory(initial: string | null = null) {
  let value = initial;
  let writes = 0;
  const storage: TicketDraftStorage = {
    getItem(key) {
      assert.equal(key, TICKET_SELECTION_DRAFT_KEY);
      return value;
    },
    setItem(key, next) {
      assert.equal(key, TICKET_SELECTION_DRAFT_KEY);
      value = next;
      writes += 1;
    }
  };
  return { storage, value: () => value, writes: () => writes };
}

function persisted(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    schemaVersion: 1,
    items,
    savedAt: now,
    expiresAt: now + TICKET_DRAFT_RETENTION_MS,
    returnToTickets: false,
    ...overrides
  });
}

test("missing drafts remain empty without writing or manufacturing a selection", () => {
  const m = memory();
  assert.deepEqual(readTicketSelectionDraft(m.storage, now), { status: "empty" });
  assert.deepEqual(clearTicketReturnIntent(m.storage, now), { status: "empty" });
  assert.equal(m.writes(), 0);
});

test("saved drafts retain only advisory selection and explicit return intent", () => {
  const m = memory();
  const before = structuredClone(items);
  const saved = saveTicketSelectionDraft(m.storage, items, { now, returnToTickets: true });
  assert.equal(saved.status, "ready");
  if (saved.status !== "ready") return;
  assert.deepEqual(saved.draft, {
    schemaVersion: 1, items, savedAt: now,
    expiresAt: now + 86_400_000, returnToTickets: true
  });
  assert.deepEqual(readTicketSelectionDraft(m.storage, now + 1), saved);
  assert.deepEqual(items, before);
  assert.notEqual(saved.draft.items, items);
  assert.equal(Object.isFrozen(saved.draft), true);
  assert.equal(Object.isFrozen(saved.draft.items), true);
  assert.equal(Object.isFrozen(saved.draft.items[0]), true);
  assert.deepEqual(Object.keys(JSON.parse(m.value()!)).sort(), [
    "expiresAt", "items", "returnToTickets", "savedAt", "schemaVersion"
  ]);
  assert.equal(m.writes(), 1);
});

test("ordinary saves do not imply account return or retain stale return authority", () => {
  const m = memory(persisted({ returnToTickets: true }));
  const result = saveTicketSelectionDraft(m.storage, items, { now });
  assert.equal(result.status, "ready");
  if (result.status === "ready") assert.equal(result.draft.returnToTickets, false);
});

test("default clock paths use the same bounded retention contract", (t) => {
  t.mock.method(Date, "now", () => now);
  const m = memory();
  assert.equal(saveTicketSelectionDraft(m.storage, items).status, "ready");
  const current = readTicketSelectionDraft(m.storage);
  assert.equal(current.status, "ready");
  if (current.status === "ready") assert.equal(current.draft.savedAt, now);
  assert.equal(saveTicketSelectionDraft(m.storage, items, { returnToTickets: true }).status, "ready");
  const cleared = clearTicketReturnIntent(m.storage);
  assert.equal(cleared.status, "ready");
  if (cleared.status === "ready") assert.equal(cleared.draft.returnToTickets, false);
});

test("invalid save options cannot coerce return intent or leak extra persisted fields", () => {
  for (const options of [null, false, [], { returnToTickets: "true" }, { returnToTickets: null }, { token: "private" }]) {
    const m = memory();
    assert.deepEqual(saveTicketSelectionDraft(m.storage, items, options as { returnToTickets?: boolean }), { status: "invalid" });
    assert.equal(m.writes(), 0);
  }
});

test("clearing return intent preserves the draft selection and original expiry", () => {
  const m = memory(persisted({ returnToTickets: true }));
  const result = clearTicketReturnIntent(m.storage, now + 1000);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.deepEqual(result.draft.items, items);
  assert.equal(result.draft.returnToTickets, false);
  assert.equal(result.draft.savedAt, now);
  assert.equal(result.draft.expiresAt, now + TICKET_DRAFT_RETENTION_MS);
  assert.equal(m.writes(), 1);
  assert.deepEqual(clearTicketReturnIntent(m.storage, now + 2000), result);
  assert.equal(m.writes(), 1, "an already-cleared intent does not write again");
});

test("the retention deadline is absolute, including exact expiry and clock rollback", () => {
  const m = memory(persisted());
  assert.equal(readTicketSelectionDraft(m.storage, now + TICKET_DRAFT_RETENTION_MS - 1).status, "ready");
  assert.deepEqual(readTicketSelectionDraft(m.storage, now + TICKET_DRAFT_RETENTION_MS), { status: "expired" });
  assert.deepEqual(clearTicketReturnIntent(m.storage, now + TICKET_DRAFT_RETENTION_MS), { status: "expired" });
  assert.deepEqual(readTicketSelectionDraft(m.storage, now - 1), { status: "invalid" });
  assert.equal(m.writes(), 0);
});

test("malformed, oversized, unrelated or secret-bearing stored data never restores", () => {
  const invalid = [
    "", "{", "null", "false", "[]", "\"selection\"", "x".repeat(16_385),
    persisted({ schemaVersion: 2 }), persisted({ returnToTickets: "/admin" }),
    persisted({ token: "fixture" }), persisted({ ownerId: "user" }),
    persisted({ quote: { totalAmountMinor: 0 } }), persisted({ returnUrl: "https://evil.invalid" }),
    persisted({ items: [{ ...items[0], unitAmountMinor: 10 }] }),
    persisted({ items: [{ ...items[0], email: "private@example.invalid" }] }),
    persisted({ items: [{ ...items[0], __extra: "unknown" }] })
  ];
  for (const raw of invalid) {
    const m = memory(raw);
    assert.deepEqual(readTicketSelectionDraft(m.storage, now), { status: "invalid" });
    assert.deepEqual(clearTicketReturnIntent(m.storage, now), { status: "invalid" });
    assert.equal(m.writes(), 0);
    assert.equal(m.value(), raw, "invalid drafts are not silently replaced");
  }
});

test("JSON size checks bound parsing while accepting a valid document at the boundary", () => {
  const value = persisted();
  const atLimit = value + " ".repeat(16_384 - value.length);
  assert.equal(readTicketSelectionDraft(memory(atLimit).storage, now).status, "ready");
  assert.equal(readTicketSelectionDraft(memory(atLimit + " ").storage, now).status, "invalid");
});

test("selection validation rejects duplicates, pathological arrays and invalid quantities", () => {
  const invalid: unknown[] = [
    null, undefined, {}, "ticket", [],
    [null], [{ ticketTypeId: "first-night-preview" }],
    [{ quantity: 1 }], [items[0], items[0]],
    Array.from({ length: 10_000 }, (_, i) => ({ ticketTypeId: "test-" + i, quantity: 1 })),
    ...[0, -1, 0.5, NaN, Infinity, 1001, Number.MAX_SAFE_INTEGER + 1, "2"].map(quantity => [{ ticketTypeId: "preview", quantity }]),
    ...["", " ", "x".repeat(129), "ticket/1", "ticket?x", "<script>", "한글", "🎟️", "a\n", "a\r", "a\t", "a\u0000"].map(ticketTypeId => [{ ticketTypeId, quantity: 1 }])
  ];
  for (const candidate of invalid) {
    const m = memory();
    assert.deepEqual(saveTicketSelectionDraft(m.storage, candidate as SelectionItem[], { now }), { status: "invalid" });
    assert.equal(readTicketSelectionDraft(memory(persisted({ items: candidate })).storage, now).status, "invalid");
    assert.equal(m.writes(), 0);
  }
});

test("protocol bounds permit small advisory selections without inventing booking rules", () => {
  // These are resource limits, not the study's 1–6 display or a commercial limit.
  const candidate = Array.from({ length: 20 }, (_, i) => ({ ticketTypeId: "test_" + i, quantity: 1000 }));
  const m = memory();
  assert.equal(saveTicketSelectionDraft(m.storage, candidate, { now }).status, "ready");
  assert.equal(readTicketSelectionDraft(m.storage, now).status, "ready");
  assert.equal(saveTicketSelectionDraft(m.storage, [...candidate, { ticketTypeId: "extra", quantity: 1 }], { now }).status, "invalid");
  assert.equal(saveTicketSelectionDraft(m.storage, [{ ticketTypeId: "x".repeat(128), quantity: 1 }], { now }).status, "ready");
});

test("invalid clocks and forged retention windows fail without storage writes", () => {
  const clocks = [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1];
  for (const clock of clocks) {
    const m = memory(persisted());
    assert.deepEqual(readTicketSelectionDraft(m.storage, clock), { status: "invalid" });
    assert.deepEqual(saveTicketSelectionDraft(m.storage, items, { now: clock }), { status: "invalid" });
    assert.deepEqual(clearTicketReturnIntent(m.storage, clock), { status: "invalid" });
    assert.equal(m.writes(), 0);
  }
  for (const overrides of [
    { savedAt: -1 }, { savedAt: 1.5 }, { savedAt: "now" },
    { expiresAt: now }, { expiresAt: now + TICKET_DRAFT_RETENTION_MS + 1 },
    { expiresAt: now + TICKET_DRAFT_RETENTION_MS - 1 }, { expiresAt: Infinity }
  ]) assert.equal(readTicketSelectionDraft(memory(persisted(overrides)).storage, now).status, "invalid");
  const m = memory();
  assert.equal(saveTicketSelectionDraft(m.storage, items, { now: Number.MAX_SAFE_INTEGER }).status, "invalid");
  assert.equal(m.writes(), 0);
});

test("blocked reads and writes return fixed unavailable results without exposing exceptions", () => {
  const storageFailureMessage = "private storage exception";
  const noRead: TicketDraftStorage = { getItem() { throw new Error(storageFailureMessage); }, setItem() { throw new Error(storageFailureMessage); } };
  assert.deepEqual(readTicketSelectionDraft(noRead, now), { status: "unavailable" });
  assert.deepEqual(clearTicketReturnIntent(noRead, now), { status: "unavailable" });
  assert.deepEqual(saveTicketSelectionDraft(noRead, items, { now }), { status: "unavailable" });
  const noWrite: TicketDraftStorage = { getItem: () => persisted({ returnToTickets: true }), setItem() { throw new Error(storageFailureMessage); } };
  assert.equal(readTicketSelectionDraft(noWrite, now).status, "ready");
  assert.deepEqual(clearTicketReturnIntent(noWrite, now), { status: "unavailable" });
  assert.deepEqual(saveTicketSelectionDraft(noWrite, items, { now }), { status: "unavailable" });
});

test("independent storage consumers preserve selection across same-origin tab handoffs", () => {
  const shared = memory();
  const secondTab: TicketDraftStorage = { getItem: shared.storage.getItem, setItem: shared.storage.setItem };
  assert.equal(saveTicketSelectionDraft(shared.storage, items, { now, returnToTickets: true }).status, "ready");
  const restored = readTicketSelectionDraft(secondTab, now + 1);
  assert.equal(restored.status, "ready");
  if (restored.status === "ready") assert.equal(restored.draft.returnToTickets, true);
  assert.equal(clearTicketReturnIntent(secondTab, now + 2).status, "ready");
  const original = readTicketSelectionDraft(shared.storage, now + 3);
  assert.equal(original.status, "ready");
  if (original.status === "ready") {
    assert.equal(original.draft.returnToTickets, false);
    assert.deepEqual(original.draft.items, items);
  }
});

test("saving replaces only the owned draft key and never reads unrelated browser state", () => {
  const keys: string[] = [];
  const storage: TicketDraftStorage = {
    getItem(key) { keys.push(key); return null; },
    setItem(key) { keys.push(key); }
  };
  assert.equal(saveTicketSelectionDraft(storage, items, { now }).status, "ready");
  assert.deepEqual(keys, [TICKET_SELECTION_DRAFT_KEY]);
});
