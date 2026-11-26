import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CommerceAccountGate, CommerceCheckout } from "@/components/commerce/checkout";
import { CommerceCart } from "@/components/commerce/cart";
import { PageFrame } from "@/components/commerce/page-frame";
import type { CommerceOffer } from "@/lib/commerce/catalogue";
import { membershipCartProduct } from "@/lib/commerce/cart-products";
import { EnglishMessages } from "./english-messages";

const query = new URLSearchParams(location.search);
const review = query.has("review");
const checkout = query.has("checkout");
const empty = query.has("empty");
const identityRetry = checkout && query.has("identity-retry");
let retriedIdentity = false;
if (identityRetry) document.addEventListener("click", (event) => {
  if (event.target instanceof HTMLElement && event.target.closest("button")?.textContent?.trim() === "Retry account check") {
    retriedIdentity = true;
  }
}, { capture: true });
const calls: string[] = [];
const capabilities = { apple: false, google: false, kakao: false, emailOtp: false, magicLink: false, passkey: false };
const policy = { effectiveDate: "2026-01-01", sections: [{ heading: "Synthetic", paragraphs: ["Fixture only."] }] };
const offer: CommerceOffer = {
  productID: "product-1", title: "The Sophomores Coin", description: "Synthetic release",
  images: [{ image: "fixture-image" }], priceKRW: 45000, maximumQuantity: 1, saleStartsAt: "", saleEndsAt: "",
  dispatchSchedule: "Synthetic delivery schedule", shippingFeeKRW: 3000, availableQuantity: 1,
  productVersion: "fixture", eventVersion: "fixture", event: { id: "event", title: "Fixture", eventStartsAt: "" },
  publication: { _status: "published", publicationApproved: true, physicalProductApproved: true, fulfillmentReady: true,
    addressRetentionApproved: true, shippingCountries: ["KR"], disclosure: {
      seller: { name: "Fixture", representative: "Fixture", address: "Fixture", registrationNumber: "123-45-67890", phone: "02-1234-5678" },
      policies: { terms: policy, privacy: policy, refund: policy },
    } },
};

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.origin);
  calls.push(url.pathname);
  window.dispatchEvent(new Event("fixture-request"));
  if (review || url.origin !== location.origin || (init?.method ?? (input instanceof Request ? input.method : "GET")) !== "GET") {
    throw new Error("No requests are allowed for this scenario");
  }
  switch (url.pathname) {
    case "/api/users/me": {
      if (identityRetry && !retriedIdentity && url.searchParams.has("select[id]") && !url.searchParams.has("select[cart]")) {
        return Response.json({}, { status: 429 });
      }
      return Response.json({ user: { id: "fixture-user", collection: "users", cart: { docs: ["fixture-cart"] } } });
    }
    case "/api/addresses": return Response.json({ docs: [] });
    case "/api/carts/fixture-cart": return Response.json({ id: "fixture-cart", currency: "KRW", items: empty ? [] : [{ id: "line-1", product: "product-1", quantity: 1 }] });
    default: throw new Error("No auth, payment or network is allowed in this fixture");
  }
};

function Fixture() {
  const [reads, setReads] = useState(calls.length);
  useEffect(() => {
    const update = () => setReads(calls.length);
    update();
    window.addEventListener("fixture-request", update);
    return () => window.removeEventListener("fixture-request", update);
  }, []);
  const orderDetails = <section className="rounded-xl border border-border bg-card p-5 text-card-foreground">
    <h2 className="font-heading text-2xl">{offer.title}</h2><p>Delivery: 3,000 KRW</p>
  </section>;
  return <EnglishMessages>
    <output className="sr-only" data-fixture-requests={reads}>Fixture requests: {reads}</output>
    <PageFrame layout={review ? "editorial" : "wide"} title={checkout ? "Checkout" : "Cart"} displayTitle={!checkout}>
      {checkout ? <CommerceAccountGate initialCapabilities={capabilities} signInOffInReview={review} identityCheckDetails={orderDetails}>
        <div className="dark min-w-0 rounded-2xl border border-border bg-background p-5 text-foreground sm:p-8">
          <CommerceCheckout offer={offer} allowance={{ source: "server", perAccount: 1, singleMembershipToken: true, includesAdmission: true }} orderDetails={orderDetails} refundTerms={{ kind: "none", reason: "not-refundable-product" }} />
        </div>
      </CommerceAccountGate> : <div className="dark min-w-0 rounded-2xl border border-border bg-background p-5 text-foreground sm:p-8">
        <CommerceAccountGate initialCapabilities={capabilities} signInOffInReview={review}>
          <CommerceCart products={[membershipCartProduct(offer)]} wide />
        </CommerceAccountGate>
      </div>}
    </PageFrame>
  </EnglishMessages>;
}

createRoot(document.getElementById("root")!).render(<Fixture />);
