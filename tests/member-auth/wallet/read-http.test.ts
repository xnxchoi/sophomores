import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { loadWalletConfig } from "@/lib/member-auth/wallet/config";
import { createWalletHandlers } from "@/lib/member-auth/wallet/http";
import { readWalletActivation } from "@/lib/member-auth/wallet/read";
import { MemberWallets } from "@/payload/collections/member-wallets";
import { MemberWalletChallenges } from "@/payload/collections/member-wallet-challenges";
import { commerceStorageFake } from "../../commerce/domain/storage-fake";

process.env.MEMBER_WALLET_LOCK_ADDRESS =
  "0x00000000000000000000000000000000000000a1";
const config = loadWalletConfig()!;
const principal = {
  userId: "member",
  sessionId: "s",
  emailVerified: true,
  sessionCreatedAt: new Date()
};

function seeded(count: number) {
  const intents = Array.from({ length: count }, (_, index) => ({
    id: `i-${index}`,
    beneficiaryUser: "member",
    recipientMode: "member_safe",
    state: "awaiting_wallet",
    payment: `pay-${index}`,
    entitlement: `adm-${index}`,
    cancelRequested: false
  }));
  return commerceStorageFake({
    users: [{ id: "member", membershipStatus: "approved" }],
    "commerce-key-grant-intents": intents,
    transactions: intents.map((row) => ({
      id: row.payment,
      status: "succeeded"
    })),
    "commerce-admissions": intents.map((row) => ({
      id: row.entitlement,
      status: "available",
      benefitReview: row.id === "i-0"
    })),
    "member-wallets": [],
    passkeys: []
  });
}

async function readsFor(count: number) {
  const fake = seeded(count);
  let reads = 0;
  const view = await fake.transaction({}, (req) => {
    const counted = {
      ...req.payload,
      find: (args: never) => {
        reads++;
        return req.payload.find(args);
      },
      findByID: (args: never) => {
        reads++;
        return req.payload.findByID(args);
      }
    };
    return readWalletActivation({
      req: { ...req, payload: counted } as unknown as PayloadRequest,
      principal,
      config
    });
  });
  return { reads, view };
}

test("the page state is read with a bounded number of queries, however many intents a member has", async () => {
  const one = await readsFor(2);
  const many = await readsFor(20);
  assert.equal(one.view.state, "activation_required");
  assert.equal(many.view.state, "activation_required");
  assert.equal(
    many.reads,
    one.reads,
    `reads grew from ${one.reads} to ${many.reads}`
  );
  assert.ok(one.reads <= 6);
});

test("the status read is rate limited per signed-in member", async () => {
  const origin = "https://member.example";
  const userId = `status-${Date.now()}`;
  const handlers = createWalletHandlers({
    origin,
    activation: null,
    resolvePrincipal: async () => ({ ...principal, userId }),
    readStatus: async () => ({ state: "not_eligible" })
  });
  const statuses: number[] = [];
  for (let index = 0; index < 31; index++)
    statuses.push(
      (await handlers.status(new Request(`${origin}/api/member/wallet/status`)))
        .status
    );
  assert.deepEqual([...new Set(statuses.slice(0, 30))], [200]);
  assert.equal(statuses[30], 429);
});

test("deleting a member keeps their wallet record, anonymised, rather than failing", () => {
  for (const collection of [MemberWallets, MemberWalletChallenges]) {
    const member = collection.fields.find(
      (field) => "name" in field && field.name === "member"
    ) as { required?: boolean; type: string };
    assert.equal(member.type, "relationship");
    assert.notEqual(
      member.required,
      true,
      `${collection.slug}.member must be nullable for ON DELETE SET NULL`
    );
  }
});
