import type { ReactNode } from "react";
import type { CommerceEditionCatalogue } from "@/lib/commerce/editions";

let scenario: { editions: CommerceEditionCatalogue | Error; legacyOffer: boolean };

export function setBookShopScenario(next: typeof scenario) { scenario = { ...next }; }
export async function connection() {}
export async function getPayload() { return {}; }
export async function loadPublishedCommerceEditions() {
  if (scenario.editions instanceof Error) throw scenario.editions;
  return scenario.editions;
}
export async function loadCommerceOffer() { return scenario.legacyOffer ? { productID: "fixture-legacy" } : null; }
export function loadPublicMemberCapabilities() { return {}; }
export function CommerceBookView({ catalogue }: { catalogue: CommerceEditionCatalogue | null }) {
  return <main data-book-state={catalogue?.status ?? "read-failed"} />;
}
export function CommerceOfferView({ offer, children }: { offer: unknown; children?: ReactNode }) {
  return <main data-legacy-offer={offer ? "present" : "absent"}>{children}</main>;
}
export function CommerceAccountGate({ children }: { children: ReactNode }) { return <section data-account-gate>{children}</section>; }
export function CommerceCheckout() { return <p data-legacy-checkout>Fixture legacy checkout</p>; }
export default {};
