import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import type { MemberPrincipal } from "@/lib/member-auth/contracts";
import { readMemberWelcome } from "@/lib/member-auth/welcome/read";

const principal: MemberPrincipal = {
  userId: "4f0c9a8e-0d43-4b8f-9a55-1d2f3e4a5b6c", emailVerified: true, sessionCreatedAt: new Date()
};

type FindByID = { id: string; collection: string; overrideAccess?: boolean; user?: { id: string; collection: string } };

function fixture(membershipStatus: string, emailVerified: boolean, walletCount?: number, accountExists = true) {
  const filters: unknown[] = [];
  const reads: string[] = [];
  const req = { payload: {
    async findByID(options: FindByID) {
      assert.equal(options.collection, "users");
      assert.equal(options.id, principal.userId);
      if (options.overrideAccess) {
        // S0c-2 r2: the canonical users row of the verified session (members and staff alike).
        reads.push("principal");
        return accountExists ? { id: principal.userId } : null;
      }
      // The row itself is read as that member, with member (self-only) access.
      assert.deepEqual([options.overrideAccess, options.user?.id, options.user?.collection], [false, principal.userId, "users"]);
      reads.push("member");
      return { membershipStatus, emailVerified };
    },
    async count(options: { collection: string; where: unknown; req: unknown }) {
      assert.equal(options.collection, "member-wallets");
      assert.equal(options.req, req);
      filters.push(options.where);
      if (walletCount === undefined) throw new Error("unavailable");
      return { totalDocs: walletCount };
    }
  } } as unknown as PayloadRequest;
  return { req, filters, reads };
}

test("a verified owner sees wallet-record existence, not a wallet address, Signet or delivered QR", async () => {
  const { req, filters, reads } = fixture("approved", true, 1);
  assert.deepEqual(await readMemberWelcome(req, principal, true), {
    state: "verified", passkeyAvailable: true, wallet: "recorded", signet: "unavailable",
    eventTicket: { issuance: "unavailable", qr: "unavailable", checkIn: "unavailable" }
  });
  assert.deepEqual(filters, [{ and: [{ member: { equals: principal.userId } }, { status: { equals: "active" } }] }]);
  assert.deepEqual(reads, ["principal", "member"]);
});

test("a staff member's session keeps the member view it had before (Review-A, S0c-2 r1)", async () => {
  // The staff account's canonical users row is read exactly like any member's; staff are not excluded.
  const { req, reads } = fixture("staff", true, 0);
  const view = await readMemberWelcome(req, principal, true);
  assert.equal(view.state, "verified");
  if (view.state === "verified") assert.equal(view.wallet, "not-recorded");
  assert.deepEqual(reads, ["principal", "member"]);
});

test("a session with no canonical users row reads nothing more", async () => {
  const { req, filters, reads } = fixture("approved", true, 1, false);
  assert.deepEqual(await readMemberWelcome(req, principal, true), { state: "unavailable" });
  assert.deepEqual([reads, filters], [["principal"], []]);
});

test("restricted or unverified accounts never query wallet storage", async () => {
  for (const [status, verified, state] of [
    ["suspended", true, "restricted"], ["approved", false, "unverified"]
  ] as const) {
    const { req, filters } = fixture(status, verified, 1);
    assert.deepEqual(await readMemberWelcome(req, principal, true), { state });
    assert.deepEqual(filters, []);
  }
});

test("a read failure is not presented as an absent wallet", async () => {
  for (const [count, expected] of [[0, "not-recorded"], [undefined, "unavailable"]] as const) {
    const { req } = fixture("approved", true, count);
    const view = await readMemberWelcome(req, principal, false);
    assert.equal(view.state, "verified");
    if (view.state === "verified") assert.equal(view.wallet, expected);
  }
});
