import { createTranslator } from "next-intl";
import messages from "../../../messages/en.json";
export async function connection() {}
/** The payload the page sees; the native-route test swaps in a fake with real native rows. */
let payload: unknown = {};
export function setCheckoutPayload(next: unknown) { payload = next; }
export async function getPayload() { return payload; }
export async function getTranslations(namespace: "Customer.app_site_shop_checkout_page" | "Customer.components_commerce_offer" | "Customer.app_site_shop_payment_page") {
  return createTranslator({ locale: "en", messages, namespace });
}
export function loadPublicMemberCapabilities() {
  return { apple: false, google: false, kakao: false, emailOtp: false, magicLink: false, passkey: false };
}
export default {};
