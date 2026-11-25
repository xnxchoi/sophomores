import assert from "node:assert/strict";
import test from "node:test";
import { guestTicketTarget, sharedEventTicketsEnabled, resolveEventTicketTarget, sameTicketTarget, matchesFrozenEventTicket } from "@/lib/commerce/event-tickets";
import { ticketTokenIdentity } from "@/lib/commerce/keys/contracts";

const lock = "0x" + "a".repeat(40);
const config = { version: 1, mode: "shared", chainID: 137, eventLock: lock, guestProductID: "guest" };
const event = { id: "e", checkInAuthority: "unlock-events", unlockTicketConfiguration: config };
const target = { chainID: 137, lock, mode: "shared" } as const;

test("separate Guest sales require both the switch and a matching Polygon allowlist; frozen targets do not follow the switch", () => {
  const guestLock = "0x" + "d".repeat(40);
  const guestTarget = { ...target, lock: guestLock };
  const configured = { ...event, unlockTicketConfiguration: { ...config, guestLock } };
  const enabled = { UNLOCK_SEPARATE_GUEST_LOCK_ENABLED: "1", KEY_GRANT_POLYGON_EVENT_LOCKS: `${lock},${guestLock}`,
    MEMBER_WALLET_LOCK_ADDRESS: "0x" + "b".repeat(40) };
  assert.deepEqual(resolveEventTicketTarget(configured, "guest", "guest", {}), target);
  assert.deepEqual(resolveEventTicketTarget(configured, "guest", "guest", enabled), guestTarget);
  assert.deepEqual(resolveEventTicketTarget(configured, "member", "edition", enabled), target);
  assert.throws(() => resolveEventTicketTarget(event, "guest", "guest", enabled));
  for (const overrides of [{ KEY_GRANT_POLYGON_EVENT_LOCKS: lock }, { KEY_GRANT_POLYGON_EVENT_LOCKS: `${guestLock},bad` },
    { MEMBER_WALLET_LOCK_ADDRESS: guestLock }]) {
    assert.throws(() => resolveEventTicketTarget(configured, "guest", "guest", { ...enabled, ...overrides }));
  }
  assert.throws(() => resolveEventTicketTarget({ ...configured, unlockTicketConfiguration: { ...config, guestLock: lock } }, "guest", "guest", {}));
  assert.equal(matchesFrozenEventTicket(configured, "guest", "guest", target, enabled), true);
  assert.equal(matchesFrozenEventTicket(configured, "guest", "guest", guestTarget, { ...enabled, UNLOCK_SEPARATE_GUEST_LOCK_ENABLED: undefined }), true);
  assert.equal(matchesFrozenEventTicket(configured, "guest", "guest", guestTarget, {}), false);
  assert.equal(matchesFrozenEventTicket(configured, "guest", "edition", guestTarget, enabled), false);
  assert.equal(matchesFrozenEventTicket(configured, "member", "edition", guestTarget, enabled), false);
});

test("explicit shared mode resolves both tiers without admitting an unrelated Guest offer", () => {
  assert.deepEqual(resolveEventTicketTarget(event, "member", "edition"), target);
  assert.deepEqual(resolveEventTicketTarget(event, "guest", "guest"), target);
  assert.throws(() => resolveEventTicketTarget(event, "guest", "edition"));
  assert.throws(() => resolveEventTicketTarget(event, "member", "guest"));
  assert.throws(() => resolveEventTicketTarget({ ...event, unlockTicketConfiguration: { ...config, version: 9 } }, "member", "edition"));
});

test("ticket mode is pinned, not inferred from matching lock bytes", () => {
  assert.equal(guestTicketTarget.safeParse(target).success, true);
  assert.equal(sameTicketTarget(target, { chainID: 137, lock }), false);
  assert.equal(sameTicketTarget(target, { ...target, lock: "0x" + "A".repeat(40) }), true);
});

test("the token lookup key is canonical and scoped to chain and lock", () => {
  assert.equal(ticketTokenIdentity(137, lock.toUpperCase().replace("0X", "0x"), "42"), `137:${lock}:42`);
  assert.equal(ticketTokenIdentity(137, lock, "042"), null);
  assert.equal(ticketTokenIdentity(137, lock, "0"), null);
  assert.equal(ticketTokenIdentity(137, lock, String(1n << 256n)), null);
  assert.notEqual(ticketTokenIdentity(137, lock, "42"), ticketTokenIdentity(84532, lock, "42"));
});

test("shared sale requires a complete matching Safe configuration and a distinct Signet lock", () => {
  const optIn = { UNLOCK_SHARED_TICKET_EVENT_ID: "e", MEMBER_WALLET_LOCK_ADDRESS: "0x" + "b".repeat(40) };
  const wallet = { MEMBER_WALLET_CHAIN_ID: "137", MEMBER_WALLET_OWNER_ADDRESS: "0x" + "c".repeat(40) };
  assert.equal(sharedEventTicketsEnabled("e", target, optIn), false);
  assert.equal(sharedEventTicketsEnabled("e", target, { ...optIn, MEMBER_WALLET_CHAIN_ID: "137" }), false);
  assert.equal(sharedEventTicketsEnabled("e", target, { ...optIn, ...wallet, MEMBER_WALLET_CHAIN_ID: "84532" }), false);
  assert.equal(sharedEventTicketsEnabled("e", target, { ...optIn, ...wallet, MEMBER_WALLET_LOCK_ADDRESS: lock }), false);
  assert.equal(sharedEventTicketsEnabled("e", target, { ...optIn, ...wallet }), true);
});
