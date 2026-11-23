import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { CollectionSlug, TypedUser } from "payload";

// The signed-out cart is held in the browser (owner, 23 Nov); after sign-in the cart page writes it into the member's
// own server cart. This proves that write on real PostgreSQL, as the member, through the cart guard's member branch:
// replace (never summed), create, the advisory account limit, remove at the limit, stale offers, foreign carts, and the
// users.cart join the plugin's client reads to find a saved cart. Only the browser authority (origin, session, active
// membership) is stood in by a fixture authorizer; it is covered by the access units.
test("member cart write-through and saved-cart reload on real PostgreSQL", {
  skip: process.env.CART_WRITE_THROUGH_DATABASE_TESTS !== "1", timeout: 180_000,
}, async (t) => {
  const target = { container: "sphmrs-cart-write-through-20261123", port: 55514, database: "cart_write_through_proof" };
  const { openProofDatabase, isolateTransport, seedCheckoutCart, initiateAttempt } = await import("./payment-postgres-fixture");
  const { createLocalReq, APIError } = await import("payload");
  isolateTransport(t, target.port);
  const cartAuthorizer = async (req: { user?: { id?: unknown; collection?: string } | null }) => {
    if (req.user?.collection !== "users") throw new APIError("Verified membership required", 403);
    return String(req.user.id);
  };
  const { payload, close } = await openProofDatabase(true, new Set(), target, { cartAuthorizer });
  t.after(close);
  const as = (user: TypedUser) => createLocalReq({ user }, payload);
  const carts = "carts" as CollectionSlug;
  const lines = (cart: unknown) => ((cart as { items?: { product: unknown; quantity: number }[] }).items ?? [])
    .map(({ product, quantity }) => ({ product: typeof product === "object" && product ? String((product as { id: unknown }).id) : String(product), quantity }));
  const patch = async (user: TypedUser, id: string, items: { product: string; quantity: number }[]) =>
    payload.update({ collection: carts, id, data: { items } as never, req: await as(user), overrideAccess: false, depth: 0 });
  const create = async (user: TypedUser, items: { product: string; quantity: number }[]) =>
    payload.create({ collection: carts, data: { items, currency: "KRW" } as never, req: await as(user), overrideAccess: false, depth: 0 });
  // Payload's APIError may come from another module instance than this test's import: judge its shape, not identity.
  const refusal = (reason: string) => (error: unknown) => {
    const refused = error as { name?: string; status?: number; data?: unknown; message?: string };
    assert.equal(refused?.name, "APIError", `a cart refusal is an APIError (got ${refused?.name}: ${refused?.message})`);
    assert.equal(refused.status, 409);
    assert.equal((refused.data as { cartRefusal?: string }).cartRefusal, reason);
    assert.ok(refused.message?.endsWith(`[cart-refusal:${reason}]`), "the code is also tagged in the message");
    return true;
  };

  await t.test("the browser line replaces the member's line in one write, never summed", async () => {
    const member = await seedCheckoutCart(payload);
    const other = await seedCheckoutCart(payload, member);
    const saved = await patch(member.user, member.cartID, [{ product: other.productID, quantity: 1 }]);
    assert.deepEqual(lines(saved), [{ product: other.productID, quantity: 1 }]);
    assert.equal(String((saved as { customer: unknown }).customer), member.customerID);
    assert.equal((saved as { subtotal: number }).subtotal, 10000);
    await assert.rejects(patch(member.user, member.cartID, [{ product: other.productID, quantity: 2 }]));
  });

  await t.test("a member with no cart gets one holding exactly the browser line", async () => {
    const seller = await seedCheckoutCart(payload);
    const id = randomUUID(), now = new Date().toISOString();
    await payload.db.create({ collection: "users" as CollectionSlug, customID: id, data: { email: `${id}@fixture.invalid`, name: "Fixture", createdAt: now, updatedAt: now } });
    const user = { id, email: `${id}@fixture.invalid`, collection: "users" } as TypedUser;
    const cart = await create(user, [{ product: seller.productID, quantity: 1 }]);
    assert.deepEqual(lines(cart), [{ product: seller.productID, quantity: 1 }]);
    assert.equal(String((cart as { customer: unknown }).customer), id);
  });

  await t.test("at the account limit a new line is refused, while removing is still allowed", async () => {
    const reserved = await initiateAttempt(payload);
    const owner = { user: reserved.user, customerID: reserved.customerID };
    const next = await seedCheckoutCart(payload, owner);
    // This member already has open carts (one carries the attempt), so a create converges on them before any limit.
    await assert.rejects(create(reserved.user, [{ product: next.productID, quantity: 1 }]), refusal("open-cart-exists"));
    const emptied = await patch(reserved.user, next.cartID, []);
    assert.deepEqual(lines(emptied), []);
    await assert.rejects(patch(reserved.user, next.cartID, [{ product: next.productID, quantity: 1 }]), refusal("limit-reached"));
    // The cart that carries the live payment attempt is locked while it is pending.
    await assert.rejects(patch(reserved.user, reserved.cartID, []), refusal("payment-in-progress"));
  });

  await t.test("a stale line is refused as unavailable, and a foreign cart is out of reach", async () => {
    const member = await seedCheckoutCart(payload);
    const stale = await seedCheckoutCart(payload, member);
    await payload.db.updateOne({ collection: "products" as CollectionSlug, id: stale.productID, data: { saleEndsAt: new Date(Date.now() - 1000).toISOString() } });
    await assert.rejects(patch(member.user, member.cartID, [{ product: stale.productID, quantity: 1 }]), refusal("offer-unavailable"));
    const stranger = await seedCheckoutCart(payload);
    await assert.rejects(patch(stranger.user, member.cartID, [{ product: stranger.productID, quantity: 1 }]));
    const unchanged = await payload.findByID({ collection: carts, id: member.cartID, overrideAccess: true, depth: 0 });
    assert.deepEqual(lines(unchanged), [{ product: member.productID, quantity: 1 }]);
  });

  const openCarts = async (customerID: string) => (await payload.find({ collection: carts, overrideAccess: true, depth: 0, limit: 10,
    where: { and: [{ customer: { equals: customerID } }, { purchasedAt: { exists: false } }] } })).docs.map((cart) => String(cart.id));
  const memberWithoutCart = async () => {
    const id = randomUUID(), now = new Date().toISOString();
    await payload.db.create({ collection: "users" as CollectionSlug, customID: id, data: { email: `${id}@fixture.invalid`, name: "Fixture", createdAt: now, updatedAt: now } });
    return { id, user: { id, email: `${id}@fixture.invalid`, collection: "users" } as TypedUser };
  };

  await t.test("concurrent creates for one member leave exactly one open cart; the others are refused toward it", async () => {
    const seller = await seedCheckoutCart(payload);
    const member = await memberWithoutCart();
    const results = await Promise.allSettled([1, 2, 3].map(() => create(member.user, [{ product: seller.productID, quantity: 1 }])));
    const created = results.filter((result) => result.status === "fulfilled");
    assert.equal(created.length, 1, "one create wins");
    const open = await openCarts(member.id);
    assert.deepEqual(open, [String((created[0] as PromiseFulfilledResult<{ id: unknown }>).value.id)]);
    for (const result of results.filter((result) => result.status === "rejected")) {
      refusal("open-cart-exists")((result as PromiseRejectedResult).reason);
      assert.equal(((result as PromiseRejectedResult).reason as { data: { cartID: string } }).data.cartID, open[0]);
    }
  });

  await t.test("a create retried after a lost acknowledgement converges on the first cart", async () => {
    const seller = await seedCheckoutCart(payload);
    const member = await memberWithoutCart();
    const first = await create(member.user, [{ product: seller.productID, quantity: 1 }]);
    // The browser never saw the first answer and sends the same create again.
    await assert.rejects(create(member.user, [{ product: seller.productID, quantity: 1 }]), refusal("open-cart-exists"));
    assert.deepEqual(await openCarts(member.id), [String(first.id)]);
    // The helper then writes into that cart: the same line again, still one cart, still one line.
    const again = await patch(member.user, String(first.id), [{ product: seller.productID, quantity: 1 }]);
    assert.deepEqual(lines(again), [{ product: seller.productID, quantity: 1 }]);
    assert.deepEqual(await openCarts(member.id), [String(first.id)]);
  });

  await t.test("the refusal code survives Payload's own REST error formatter", async () => {
    const { formatErrors } = await import("payload");
    const { cartRefusalOf } = await import("../../../src/lib/commerce/cart-refusal");
    const reserved = await initiateAttempt(payload);
    const error = await patch(reserved.user, reserved.cartID, []).then(() => undefined, (caught: unknown) => caught);
    // This is what the REST route sends (routeError -> formatErrors; a 409 is public).
    const sent = formatErrors(error as Error) as { errors: { message?: unknown; data?: unknown }[] };
    t.diagnostic(`REST body keeps error data: ${sent.errors[0]?.data !== undefined}`);
    assert.equal(cartRefusalOf(sent.errors[0]), "payment-in-progress", "the browser keeps the line on a payment in progress");
  });

  await t.test("signing in finds the member's newest open cart, never a purchased one", async () => {
    const member = await seedCheckoutCart(payload);
    const newer = await seedCheckoutCart(payload, member);
    const purchased = await seedCheckoutCart(payload, member);
    const at = (offset: number) => new Date(Date.now() + offset).toISOString();
    await payload.db.updateOne({ collection: carts, id: member.cartID, data: { updatedAt: at(-60_000) } });
    await payload.db.updateOne({ collection: carts, id: newer.cartID, data: { updatedAt: at(-30_000) } });
    await payload.db.updateOne({ collection: carts, id: purchased.cartID, data: { updatedAt: at(0), purchasedAt: at(0) } });
    // What the plugin's client asks for: GET /users/me?depth=0&select[id]=true&select[cart]=true, first doc.
    const me = await payload.findByID({ collection: "users" as CollectionSlug, id: member.customerID, depth: 0,
      select: { id: true, cart: true } as never, req: await as(member.user), overrideAccess: false }) as { cart?: { docs?: unknown[] } };
    assert.deepEqual((me.cart?.docs ?? []).map(String), [newer.cartID]);
    const stranger = await seedCheckoutCart(payload);
    const seen = await payload.findByID({ collection: "users" as CollectionSlug, id: member.customerID, depth: 0,
      select: { id: true, cart: true } as never, req: await as(stranger.user), overrideAccess: false }).catch(() => null) as { cart?: { docs?: unknown[] } } | null;
    assert.deepEqual((seen?.cart?.docs ?? []).map(String), [], "another member never sees this member's cart through the join");
  });
});
