import { MemberAuthProviders } from "../../member-auth/fixtures/providers";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { setupCartDom } from "../../fixtures/commerce/cart-dom";
import { readProductPageContent } from "../../../src/components/commerce/product-page/_shared/content";

// The edition's add row in the shop's details (Hamlet, 27 Nov; owner: editions go in the cart): does it work? A press
// adds the book to the browser cart through Auth's exports and the row says it's in the cart; × takes it out again.
let env: Awaited<ReturnType<typeof setupCartDom>>;
let DetailPanel: typeof import("../../../src/components/commerce/shop/detail-panel").DetailPanel;
type Props = Parameters<typeof DetailPanel>[0];
const product = { productID: "e1", title: "Edition one", description: "" } as unknown as Props["product"];
const offer = { priceKRW: 82000, maximumQuantity: 1,
  editionEntitlements: { membershipSignet: false, refundable: true } } as unknown as Props["offer"];

before(async () => {
  env = await setupCartDom();
  DetailPanel = (await import("../../../src/components/commerce/shop/detail-panel")).DetailPanel;
});
afterEach(() => { env.ui.cleanup(); env.dom.window.localStorage.clear(); });
after(async () => { await env.restore(); });

const stored = () => JSON.parse(env.dom.window.localStorage.getItem("sphmrs.cart.v1") ?? "null") as { lines: { productID: string }[] } | null;

test("Add to cart puts the edition in the cart in place; × takes it out", () => {
  env.ui.render(<MemberAuthProviders><DetailPanel product={product} offer={offer} content={readProductPageContent(undefined)} /></MemberAuthProviders>);
  const screen = env.ui.screen;
  env.ui.fireEvent.click(screen.getByRole("button", { name: /Add to cart/ }));
  assert.deepEqual(stored()?.lines.map((line) => line.productID), ["e1"]);
  assert.ok(screen.getByText("In your cart"));
  env.ui.fireEvent.click(screen.getByRole("button", { name: "Remove Edition one from your cart" }));
  assert.deepEqual(stored()?.lines ?? [], []);
  assert.ok(screen.getByRole("button", { name: /Add to cart/ }));
});
