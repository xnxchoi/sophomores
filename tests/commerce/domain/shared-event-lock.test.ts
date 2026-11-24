import assert from "node:assert/strict";
import test from "node:test";
import { guestTicketTarget, resolveEventTicketTarget, sameTicketTarget } from "@/lib/commerce/event-tickets";
import { ticketTokenIdentity } from "@/lib/commerce/keys/contracts";

const lock = "0x" + "a".repeat(40);
const config = { version: 1, mode: "shared", chainID: 137, eventLock: lock, guestProductID: "guest" };
const event = { id: "e", checkInAuthority: "unlock-events", unlockTicketConfiguration: config };
const target = { chainID: 137, lock, mode: "shared" } as const;

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
