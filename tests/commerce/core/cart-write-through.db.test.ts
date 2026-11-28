import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import type { CollectionSlug, TypedUser } from "payload";
import { proofTargets } from "../../support/proof-ports.mjs";
import { CART_EXPECTED_MEMBER_HEADER, CART_MERGE_BROWSER_HEADER } from "../../../src/lib/commerce/cart-refusal";

// The signed-out cart is held in the browser (owner, 23 Nov); after sign-in the cart page writes it into the member's
// own server cart. This proves that write on real PostgreSQL, as the member, through the cart guard's member branch:
// replace (never summed), create, the advisory account limit, remove at the limit, stale offers, foreign carts, and the
// users.cart join the plugin's client reads to find a saved cart. Only the browser authority (origin, session, active
// membership) is stood in by a fixture authorizer; it is covered by the access units.
test("member cart write-through and saved-cart reload on real PostgreSQL", {
  skip: process.env.CART_WRITE_THROUGH_DATABASE_TESTS !== "1", timeout: 180_000,
}, async (t) => {
  const target = proofTargets.cartWriteThrough;
  const { openProofDatabase, isolateTransport, seedCheckoutCart, seedAttempt, initiateThroughEndpoint, confirmation, publishFixtureCatalogue } = await import("./payment-postgres-fixture");
  const { editions, seedEvent, seedMember, seedNativeCart, prepare } = await import("../editions/native-settlement-fixture");
  const { createLocalReq, APIError } = await import("payload");
  isolateTransport(t, target.port);
  const cartAuthorizer = async (req: { user?: { id?: unknown; collection?: string } | null }) => {
    if (req.user?.collection !== "users") throw new APIError("Verified membership required", 403);
    return String(req.user.id);
  };
  const { payload, control, close } = await openProofDatabase(true, new Set(), target, { cartAuthorizer });
  t.after(close);
  const as = (user: TypedUser) => createLocalReq({ user }, payload);
  const carts = "carts" as CollectionSlug;
  const lines = (cart: unknown) => ((cart as { items?: { product: unknown; quantity: number }[] }).items ?? [])
    .map(({ product, quantity }) => ({ product: typeof product === "object" && product ? String((product as { id: unknown }).id) : String(product), quantity }));
  const patch = async (user: TypedUser, id: string, items: { product: string; quantity: number }[]) =>
    payload.update({ collection: carts, id, data: { items } as never, req: await as(user), overrideAccess: false, depth: 0 });
  const create = async (user: TypedUser, items: { product: string; quantity: number }[]) =>
    payload.create({ collection: carts, data: { items, currency: "KRW" } as never, req: await as(user), overrideAccess: false, depth: 0 });
  const seedBook = (user: TypedUser, maximum?: number | null) => seedNativeCart(payload, user, editions[0], null, maximum);
  // Payload's APIError may come from another module instance than this test's import: judge its shape, not identity.
  const refusal = (reason: string) => (error: unknown) => {
    const refused = error as { name?: string; status?: number; data?: unknown; message?: string };
    assert.equal(refused?.name, "APIError", `a cart refusal is an APIError (got ${refused?.name}: ${refused?.message})`);
    assert.equal(refused.status, 409);
    assert.equal((refused.data as { cartRefusal?: string }).cartRefusal, reason);
    assert.ok(refused.message?.endsWith(`[cart-refusal:${reason}]`), "the code is also tagged in the message");
    return true;
  };

  await t.test("a saved standalone cart cannot create a fresh attempt or reservation", async () => {
    const saved = await seedCheckoutCart(payload);
    const { loadCommerceOffer } = await import("../../../src/lib/commerce/catalogue");
    const offer = await loadCommerceOffer(payload, undefined, saved.productID);
    assert.ok(offer && !offer.ticketTarget, "saved cart has a published, in-stock standalone offer");
    assert.ok(offer.availableQuantity > 0);
    const footprint = async () => (await control.query(
      `SELECT (SELECT count(*)::int FROM transactions WHERE cart_id=$1) AS attempts,
        (SELECT count(*)::int FROM commerce_reservations WHERE customer_id=$2) AS reservations,
        (SELECT count(*)::int FROM commerce_allowances WHERE customer_id=$2) AS allowances,
        (SELECT reserved_quantity::int FROM products WHERE id=$3) AS stock_held`,
      [saved.cartID, saved.customerID, saved.productID],
    )).rows[0];
    const before = await footprint();
    assert.deepEqual(before, { attempts: 0, reservations: 0, allowances: 0, stock_held: 0 });
    await assert.rejects(initiateThroughEndpoint(payload, saved.user, {
      cartID: saved.cartID, shippingAddress: saved.shippingAddress,
    }), /initiate answered 500:.*Error initiating payment/);
    assert.deepEqual(await footprint(), before, "fresh refusal has no durable effects");
  });

  await t.test("an already-prepared v1 attempt can replay and settle", async () => {
    const attemptID = randomUUID();
    const prepareKey = createHash("sha256").update(attemptID).digest("hex");
    const existing = await seedAttempt(payload, undefined, prepareKey);
    const paymentID = existing.transactionID.replaceAll("-", "");
    assert.deepEqual(await initiateThroughEndpoint(payload, existing.user, {
      attemptID, cartID: existing.cartID, shippingAddress: existing.snapshot.shippingAddress,
    }), { message: "Existing payment attempt", transactionID: existing.transactionID, paymentID, outcome: "status-only" });
    const { runAdmitted } = await confirmation(payload, existing);
    assert.equal((await runAdmitted()).status, 200);
    assert.deepEqual((await control.query("SELECT state::text FROM commerce_reservations WHERE attempt_i_d=$1", [existing.transactionID])).rows,
      [{ state: "settled" }]);
  });

  await t.test("the browser line replaces the member's line in one write, never summed", async () => {
    const member = await seedCheckoutCart(payload);
    const other = await seedBook(member.user, 1);
    const saved = await patch(member.user, member.cartID, [{ product: other.productID, quantity: 1 }]);
    assert.deepEqual(lines(saved), [{ product: other.productID, quantity: 1 }]);
    assert.equal(String((saved as { customer: unknown }).customer), member.customerID);
    assert.equal((saved as { subtotal: number }).subtotal, 35_000);
    await assert.rejects(patch(member.user, member.cartID, [{ product: other.productID, quantity: 2 }]));
  });

  await t.test("a member with no cart gets one holding exactly the browser line", async () => {
    const seller = await seedBook((await seedCheckoutCart(payload)).user);
    const id = randomUUID(), now = new Date().toISOString();
    await payload.db.create({ collection: "users" as CollectionSlug, customID: id, data: { email: `${id}@fixture.invalid`, name: "Fixture", createdAt: now, updatedAt: now } });
    const user = { id, email: `${id}@fixture.invalid`, collection: "users" } as TypedUser;
    const cart = await create(user, [{ product: seller.productID, quantity: 1 }]);
    assert.deepEqual(lines(cart), [{ product: seller.productID, quantity: 1 }]);
    assert.equal(String((cart as { customer: unknown }).customer), id);
  });

  await t.test("at the account limit a new line is refused, while removing is still allowed", async () => {
    const reserved = await seedAttempt(payload);
    const owner = { user: reserved.user, customerID: reserved.customerID };
    const next = await seedNativeCart(payload, owner.user, editions[1], reserved.eventID);
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
    const stale = await seedBook(member.user);
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

  await t.test("concurrent browser intents merge under the cart lock, and a replay never adds quantity", async () => {
    const buyer = await memberWithoutCart();
    const seller = await seedMember(payload);
    const a = await seedBook(seller);
    const b = await seedBook(seller);
    const event = await seedEvent(payload, "Fixture");
    const bundle = await seedNativeCart(payload, seller, editions[1], event);
    const otherBundle = await seedNativeCart(payload, seller, editions[2], event);
    const first = await create(buyer.user, [{ product: a.productID, quantity: 1 }]);
    const id = String(first.id);
    const merge = async (product: string, quantity: number, expectedMember = buyer.id) =>
      payload.update({ collection: carts, id, data: { items: [{ product, quantity }] } as never,
        req: await createLocalReq({ user: buyer.user, req: { headers: new Headers({
          [CART_EXPECTED_MEMBER_HEADER]: expectedMember, [CART_MERGE_BROWSER_HEADER]: "1",
        }) } }, payload), overrideAccess: false, depth: 0 });
    await Promise.all([merge(b.productID, 4), merge(bundle.productID, 1)]);
    await assert.rejects(merge(otherBundle.productID, 1), refusal("membership-in-cart"));
    await assert.rejects(merge(a.productID, 2, randomUUID()), refusal("account-changed"));
    const replayed = await merge(b.productID, 2);
    assert.deepEqual(new Map(lines(replayed).map(({ product, quantity }) => [product, quantity])), new Map([
      [a.productID, 1], [b.productID, 4], [bundle.productID, 1],
    ]));
    assert.equal((replayed as { subtotal: number }).subtotal, 5 * 35_000 + 82_000);
  });

  await t.test("concurrent creates for one member leave exactly one open cart; the others are refused toward it", async () => {
    const seller = await seedBook((await seedCheckoutCart(payload)).user);
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
    const seller = await seedBook((await seedCheckoutCart(payload)).user);
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
    const reserved = await seedAttempt(payload);
    const error = await patch(reserved.user, reserved.cartID, []).then(() => undefined, (caught: unknown) => caught);
    // This is what the REST route sends (routeError -> formatErrors; a 409 is public).
    const sent = formatErrors(error as Parameters<typeof formatErrors>[0]) as { errors: { message?: unknown; data?: unknown }[] };
    t.diagnostic(`REST body keeps error data: ${sent.errors[0]?.data !== undefined}`);
    assert.equal(cartRefusalOf((error as { status: number }).status, sent.errors[0]), "payment-in-progress", "the browser keeps the line on a payment in progress");
  });

  await t.test("a write pinned to another member is refused account-changed and changes nothing", async () => {
    const member = await seedCheckoutCart(payload);
    const other = await seedBook(member.user);
    const pinned = async (expected: string) => createLocalReq({ user: member.user, req: { headers: new Headers({ "x-sphmrs-cart-member": expected }) } }, payload);
    await assert.rejects(payload.update({ collection: carts, id: member.cartID, data: { items: [{ product: other.productID, quantity: 1 }] } as never,
      req: await pinned("someone-else"), overrideAccess: false, depth: 0 }), refusal("account-changed"));
    await assert.rejects(payload.create({ collection: carts, data: { items: [{ product: other.productID, quantity: 1 }], currency: "KRW" } as never,
      req: await pinned("someone-else"), overrideAccess: false, depth: 0 }), refusal("account-changed"));
    const unchanged = await payload.findByID({ collection: carts, id: member.cartID, depth: 0, overrideAccess: true });
    assert.notDeepEqual(lines(unchanged), [{ product: other.productID, quantity: 1 }]);
    const saved = await payload.update({ collection: carts, id: member.cartID, data: { items: [{ product: other.productID, quantity: 1 }] } as never,
      req: await pinned(member.customerID), overrideAccess: false, depth: 0 });
    assert.deepEqual(lines(saved), [{ product: other.productID, quantity: 1 }], "the matching pin writes");
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

  await t.test("five distinct editions and unlimited quantities fit; duplicates and a configured product maximum do not", async () => {
    const buyer = await memberWithoutCart();
    const seller = (await seedCheckoutCart(payload)).user;
    const [unlimited, limited, third, fourth] = await Promise.all([
      seedBook(seller), seedBook(seller, 4), seedBook(seller, 1), seedBook(seller, null),
    ]);
    const event = await seedEvent(payload, "Fixture");
    const bundle = await seedNativeCart(payload, seller, editions[1], event, 9);
    const otherBundle = await seedNativeCart(payload, seller, editions[2], event);
    const selected = [unlimited, limited, third, fourth, bundle].map(({ productID }, i) =>
      ({ product: productID, quantity: [7, 4, 1, 2, 1][i]! }));
    const saved = await create(buyer.user, selected);
    assert.deepEqual(lines(saved), selected);
    const stored = await payload.findByID({ collection: "carts", id: String(saved.id), depth: 0, overrideAccess: true });
    assert.deepEqual(stored.items?.map(({ variant }) => variant),
      [unlimited, limited, third, fourth, bundle].map(({ variantID }) => variantID));
    assert.equal(stored.subtotal, 14 * 35_000 + 82_000);
    await assert.rejects(patch(buyer.user, String(saved.id), [{ product: limited.productID, quantity: 5 }]), refusal("product-limit-reached"));
    await assert.rejects(patch(buyer.user, String(saved.id), [selected[0]!, selected[0]!]), refusal("duplicate-product"));
    await assert.rejects(patch(buyer.user, String(saved.id), [{ product: bundle.productID, quantity: 2 }]), refusal("membership-in-cart"));
    await assert.rejects(patch(buyer.user, String(saved.id), [...selected, { product: otherBundle.productID, quantity: 1 }]), refusal("membership-in-cart"));
    const legacy = await seedCheckoutCart(payload);
    await assert.rejects(patch(buyer.user, String(saved.id), [{ product: legacy.productID, quantity: 1 }]), refusal("offer-unavailable"));
    assert.deepEqual(lines(await payload.findByID({ collection: "carts", id: String(saved.id), depth: 0, overrideAccess: true })), selected);
    const setMaximum = (maximumPerPerson: number | null) => payload.update({
      collection: "products", id: limited.productID, depth: 0, overrideAccess: true, data: { maximumPerPerson },
    });
    for (const invalid of [0, 1.5, -1]) await assert.rejects(setMaximum(invalid));
    assert.equal((await setMaximum(1)).maximumPerPerson, 1);
    const reduced = await patch(buyer.user, String(saved.id), [{ product: limited.productID, quantity: 3 }]);
    assert.deepEqual(lines(reduced), [{ product: limited.productID, quantity: 3 }]);
    await assert.rejects(patch(buyer.user, String(saved.id), [{ product: limited.productID, quantity: 4 }]), refusal("product-limit-reached"));
    assert.equal((await setMaximum(null)).maximumPerPerson, null);
    const restored = await patch(buyer.user, String(saved.id), [{ product: limited.productID, quantity: 6 }]);
    assert.deepEqual(lines(restored), [{ product: limited.productID, quantity: 6 }]);
  });

  await t.test("the published book maximum includes an existing reservation by the same member", async () => {
    await publishFixtureCatalogue(payload);
    const buyer = await seedMember(payload);
    const limited = await seedBook(buyer, 4);
    await prepare(payload, limited);
    const otherCart = await seedBook(buyer);
    await assert.rejects(patch(buyer, otherCart.cartID, [{ product: limited.productID, quantity: 4 }]), refusal("product-limit-reached"));
    const saved = await patch(buyer, otherCart.cartID, [{ product: limited.productID, quantity: 3 }]);
    assert.deepEqual(lines(saved), [{ product: limited.productID, quantity: 3 }]);
  });
});
