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

test("no open cart or an empty one counts 0; a missing, mismatched or malformed answer gives no count", async () => {
  assert.equal(await countMemberCartLines(fake({ id: "u1", cart: { docs: [] } }).payload, "u1"), 0);
  assert.equal(await countMemberCartLines(fake({ id: "u1" }).payload, "u1"), 0);
  assert.equal(await countMemberCartLines(fake({ id: "u1", cart: { docs: [{ id: "c1", items: [] }] } }).payload, "u1"), 0);
  assert.equal(await countMemberCartLines(fake(null).payload, "u1"), null);
  assert.equal(await countMemberCartLines(fake({ id: "u2", cart: { docs: [] } }).payload, "u1"), null);
  assert.equal(await countMemberCartLines(fake({ id: "u1", cart: { docs: [{ id: "c1", items: "x" }] } }).payload, "u1"), null);
});
