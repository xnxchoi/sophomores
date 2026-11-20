import { createTranslator } from "next-intl";
import messages from "../../../messages/en.json";
import type { CommerceOffer } from "@/lib/commerce/catalogue";

const policy = { effectiveDate: "2026-01-01", sections: [{ heading: "Policy", paragraphs: ["Fixture only."] }] };
const offer: CommerceOffer = {
  productID: "product-1", title: "Published checkout fixture", description: "Fixture release",
  images: [{ image: "fixture-image" }], priceKRW: 45000, maximumQuantity: 3, saleStartsAt: "", saleEndsAt: "",
  dispatchSchedule: "Dispatches after the launch", shippingFeeKRW: 3000, availableQuantity: 1,
  productVersion: "fixture", eventVersion: "fixture", event: { id: "event", title: "Fixture", eventStartsAt: "" },
  publication: { _status: "published", publicationApproved: true, physicalProductApproved: true, fulfillmentReady: true,
    addressRetentionApproved: true, shippingCountries: ["KR"], disclosure: {
      seller: { name: "Fixture", representative: "Fixture", address: "Fixture", registrationNumber: "123-45-67890", phone: "02-1234-5678" },
      policies: { terms: policy, privacy: policy, refund: policy },
    },
  },
};

export async function connection() {}
export async function getPayload() { return {}; }
export async function getLocale() { return "en-KR"; }
export async function getTranslations(namespace: "Customer.app_site_shop_checkout_page" | "Customer.components_commerce_offer") {
  return createTranslator({ locale: "en", messages, namespace });
}
export async function loadCommerceOffer() { return offer; }
export function loadPublicMemberCapabilities() {
  return { apple: false, google: false, kakao: false, emailOtp: false, magicLink: false, passkey: false };
}
export default {};
