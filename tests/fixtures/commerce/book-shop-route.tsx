import type { ReactNode } from "react";
import type { CommerceEditionShop } from "@/lib/commerce/editions";

let scenario: { editions: CommerceEditionShop | Error; legacyOffer: boolean };
let legacyReads = 0;

export function setBookShopScenario(next: typeof scenario) {
  scenario = { ...next };
  legacyReads = 0;
}
export function legacyOfferReads() { return legacyReads; }
export async function connection() {}
export async function getPayload() { return {}; }
export async function listCommerceEditionProducts() {
  if (scenario.editions instanceof Error) throw scenario.editions;
  return scenario.editions;
}
export async function loadCommerceOffer() {
  legacyReads += 1;
  return scenario.legacyOffer ? { productID: "fixture-legacy" } : null;
}
export function loadPublicMemberCapabilities() { return {}; }
export function CommerceShopView({ shop }: { shop: CommerceEditionShop | null }) {
  return <main data-book-state={shop?.status ?? "read-failed"} />;
}
export function CommerceOfferView({ offer, children }: { offer: unknown; children?: ReactNode }) {
  return <main data-legacy-offer={offer ? "present" : "absent"}>{children}</main>;
}
export function CommerceAccountGate({ children }: { children: ReactNode }) { return <section data-account-gate>{children}</section>; }
export function CommerceCheckout() { return <p data-legacy-checkout>Fixture legacy checkout</p>; }
export default {};
