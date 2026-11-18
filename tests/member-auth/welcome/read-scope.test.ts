import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import type { MemberPrincipal } from "@/lib/member-auth/contracts";
import { readMemberWelcome } from "@/lib/member-auth/welcome/read";

const principal: MemberPrincipal = {
  userId: "4f0c9a8e-0d43-4b8f-9a55-1d2f3e4a5b6c", emailVerified: true, sessionCreatedAt: new Date()
};

function fixture(membershipStatus: string, emailVerified: boolean, walletCount?: number) {
  const filters: unknown[] = [];
  const req = { payload: {
    async findByID(options: { id: string; collection: string }) {
      assert.equal(options.collection, "users");
      assert.equal(options.id, principal.userId);
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
  return { req, filters };
}

test("a verified owner sees wallet-record existence, not a wallet address, Signet or delivered QR", async () => {
  const { req, filters } = fixture("approved", true, 1);
  assert.deepEqual(await readMemberWelcome(req, principal, true), {
    state: "verified", passkeyAvailable: true, wallet: "recorded", signet: "unavailable",
    eventTicket: { issuance: "unavailable", qr: "unavailable", checkIn: "unavailable" }
  });
  assert.deepEqual(filters, [{ and: [{ member: { equals: principal.userId } }, { status: { equals: "active" } }] }]);
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
