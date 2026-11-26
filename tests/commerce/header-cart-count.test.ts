import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, before, test } from "node:test";
import type { Payload } from "payload";

// Cordy, 26 Nov: the header's member cart count is a line count of the signed-in member's open cart (users.cart join),
// nothing else; no cart, a count of 0; an unreadable answer, no count at all.
let countMemberCartLines: typeof import("@/lib/commerce/header-cart-count.server").countMemberCartLines;
let serverOnly: ReturnType<typeof registerHooks>;
before(async () => {
  serverOnly = registerHooks({
    resolve: (specifier, context, nextResolve) => specifier === "server-only"
      ? { url: new URL("../fixtures/team/server-only.ts", import.meta.url).href, shortCircuit: true }
      : nextResolve(specifier, context),
  });
  ({ countMemberCartLines } = await import("@/lib/commerce/header-cart-count.server"));
});
after(() => serverOnly?.deregister());

function fake(user: unknown) {
  const asked: Record<string, unknown>[] = [];
  const payload = { async findByID(args: Record<string, unknown>) { asked.push(args); return user; } } as unknown as Payload;
  return { payload, asked };
}

test("counts the open cart's lines through the users.cart join, for that member only", async () => {
  const { payload, asked } = fake({ id: "u1", cart: { docs: [{ id: "c1", items: [{ product: "p1", quantity: 1 }] }] } });
  assert.equal(await countMemberCartLines(payload, "u1"), 1);
  assert.deepEqual(asked.map(({ collection, id, select, joins }) => ({ collection, id, select, joins })),
    [{ collection: "users", id: "u1", select: { cart: true }, joins: { cart: { limit: 1 } } }]);
});

test("only an explicit empty join or a valid items array counts; anything else gives no count (Review-B)", async () => {
  assert.equal(await countMemberCartLines(fake({ id: "u1", cart: { docs: [] } }).payload, "u1"), 0);
  assert.equal(await countMemberCartLines(fake({ id: "u1", cart: { docs: [{ id: "c1", items: [] }] } }).payload, "u1"), 0);
  for (const user of [null, { id: "u2", cart: { docs: [] } }, { id: "u1" }, { id: "u1", cart: null }, { id: "u1", cart: { docs: "x" } },
    { id: "u1", cart: { docs: ["c1"] } }, { id: "u1", cart: { docs: [{ id: "c1" }] } }, { id: "u1", cart: { docs: [{ id: "c1", items: "x" }] } },
    { id: "u1", cart: { docs: [{ id: "c1", items: [1] }] } }]) {
    assert.equal(await countMemberCartLines(fake(user).payload, "u1"), null, JSON.stringify(user));
  }
});
