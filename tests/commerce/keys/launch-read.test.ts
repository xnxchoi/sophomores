import assert from "node:assert/strict";
import { test } from "node:test";
import { projectMemberLaunchEntitlements } from "@/lib/commerce/keys/launch-read";

const member = "member-1";
const launch = "launch-1";
const signet = { kind: "signet", id: "signet-1", memberID: member, state: "issued" } as const;
const freeTicket = {
  kind: "free-launch-ticket", id: "ticket-1", signetID: signet.id, memberID: member,
  eventID: launch, state: "issued",
} as const;
const qr = {
  kind: "ticket-qr-delivery", ticketID: freeTicket.id, recipientMemberID: member,
  eventID: launch, state: "ready",
} as const;
const project = (evidence: Parameters<typeof projectMemberLaunchEntitlements>[2]) =>
  projectMemberLaunchEntitlements(member, launch, evidence);

test("matching issuance and delivery project only states, not admission or credentials", () => {
  assert.deepEqual(project({ signet, freeTicket, qr }), {
    signet: "issued",
    eventTicket: { issuance: "issued", qr: "ready", checkIn: "unavailable" },
  });
});

test("known absence differs from an unqueried, failed, or unsupported slot", () => {
  assert.deepEqual(project({}), {
    signet: "unavailable",
    eventTicket: { issuance: "unavailable", qr: "unavailable", checkIn: "unavailable" },
  });
  assert.deepEqual(project({ signet: null, freeTicket: null, qr: null }), {
    signet: "not-recorded",
    eventTicket: { issuance: "not-recorded", qr: "not-applicable", checkIn: "unavailable" },
  });
  assert.equal(project({ signet, freeTicket, qr: null }).eventTicket.qr, "not-ready");
  assert.equal(project({ signet, freeTicket }).eventTicket.qr, "unavailable");
});

test("old intents, wrong owner, and a Signet that is not issued cannot stand in for entitlement proof", () => {
  for (const invalid of [{ state: "granted" }, { ...signet, memberID: "another" },
    { ...signet, state: "inactive" }, { ...signet, state: "pending" }, null]) {
    assert.equal(project({ signet: invalid, freeTicket, qr }).eventTicket.issuance, "unavailable");
    assert.equal(project({ signet: invalid, freeTicket, qr }).eventTicket.qr, "unavailable");
  }
  assert.equal(project({ signet: { ...signet, state: "inactive" } }).signet, "inactive");
});

test("a guest purchase, another member, another Signet, or another event cannot satisfy the free launch slot", () => {
  for (const invalid of [{ ...freeTicket, kind: "paid-guest-ticket" },
    { ...freeTicket, memberID: "another" }, { ...freeTicket, signetID: "old-signet" },
    { ...freeTicket, eventID: "later-event" }, [freeTicket, freeTicket]]) {
    assert.equal(project({ signet, freeTicket: invalid, qr }).eventTicket.issuance, "unavailable");
  }
  assert.equal(projectMemberLaunchEntitlements(member, null, { signet, freeTicket, qr }).eventTicket.issuance,
    "unavailable");
});

test("an issued Ticket does not prove QR delivery to its owner", () => {
  for (const invalid of [{ ...qr, recipientMemberID: "another" }, { ...qr, eventID: "later-event" },
    { ...qr, ticketID: "guest-ticket" }, { ...qr, rawQr: "sensitive" }]) {
    assert.deepEqual(project({ signet, freeTicket, qr: invalid }).eventTicket, {
      issuance: "issued", qr: "unavailable", checkIn: "unavailable",
    });
  }
  assert.equal(project({ signet, freeTicket, qr: { ...qr, state: "pending" } }).eventTicket.qr, "not-ready");
  assert.equal(project({ signet, freeTicket: { ...freeTicket, state: "pending" }, qr: null }).eventTicket.qr,
    "not-applicable");
  assert.equal(project({ signet, freeTicket: { ...freeTicket, state: "pending" }, qr }).eventTicket.qr,
    "unavailable");
});

test("an absent Ticket paired with a receipt is contradictory, not negative proof", () => {
  assert.deepEqual(project({ signet, freeTicket: null, qr }), {
    signet: "issued",
    eventTicket: { issuance: "unavailable", qr: "unavailable", checkIn: "unavailable" },
  });
});
