import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { withCommerceWrite } from "@/lib/commerce/access";
import { CommerceGuestInvites } from "@/payload/collections/commerce-guest-invites";

const hook = CommerceGuestInvites.hooks!.beforeChange![0];
const created = { inviter: "member", event: "e", product: "g", payer: "member", guestName: "Guest One", guestEmail: "guest@example.com",
  state: "pending_payment", activeKey: "k".repeat(64), holdExpiresAt: "2026-11-18T00:00:00.000Z" };
const original = { id: "invite", ...created };
const run = (data: Record<string, unknown>, originalDoc: Record<string, unknown> = original, operation = "update") => {
  const req = {} as PayloadRequest;
  return withCommerceWrite(req, async () => hook({ data, originalDoc, operation, req } as never));
};

test("guest invites are server owned", async () => {
  await assert.rejects(Promise.resolve().then(() => hook({ data: created, operation: "create", req: {} } as never)), /server owned/);
});

test("this slice only creates member-paid invites, pending payment", async () => {
  assert.equal((await run(created, {}, "create") as { state: string }).state, "pending_payment");
  await assert.rejects(run({ ...created, payer: "guest" }, {}, "create"), /member pays/);
  await assert.rejects(run({ ...created, state: "paid" }, {}, "create"), /pending payment/);
});

test("who, for whom and the hold deadline never change; states only move forward", async () => {
  for (const field of ["inviter", "event", "product", "payer", "guestName", "guestEmail", "holdExpiresAt"]) {
    await assert.rejects(run({ [field]: "changed" }), /immutable/, field);
  }
  await run({ state: "paid" });
  await run({ state: "lapsed" });
  await run({ state: "used" }, { ...original, state: "paid" });
  await run({ state: "refunded" }, { ...original, state: "paid" });
  for (const [from, to] of [["pending_payment", "used"], ["lapsed", "paid"], ["paid", "lapsed"], ["used", "refunded"], ["refunded", "paid"]]) {
    await assert.rejects(run({ state: to }, { ...original, state: from }), /cannot move/, `${from} -> ${to}`);
  }
});
