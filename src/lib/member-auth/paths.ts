export const MEMBER_ACCOUNT_PATH = "/account";
export const MEMBER_ACCOUNT_CONTINUATION_PATH = "/account/continue";
export const MEMBER_TICKET_CHECKOUT_PATH = "/tickets";
export const MEMBER_SHOP_CART_PATH = "/shop/cart";
export const MEMBER_SHOP_CHECKOUT_PATH = "/shop/checkout";
/** Purchase steps that social sign-in returns to: callback, error and new-user all pin to the same one. */
export const MEMBER_PURCHASE_RETURN_PATHS = [MEMBER_TICKET_CHECKOUT_PATH, MEMBER_SHOP_CART_PATH, MEMBER_SHOP_CHECKOUT_PATH] as const;
export type MemberPurchaseReturnPath = (typeof MEMBER_PURCHASE_RETURN_PATHS)[number];
/** The purchase step a callback names exactly (path or same-origin URL), else undefined. */
export function memberPurchaseReturnPath(origin: string, value: unknown): MemberPurchaseReturnPath | undefined {
  return MEMBER_PURCHASE_RETURN_PATHS.find((path) => value === path || value === `${origin}${path}`);
}
export const MEMBER_EMAIL_ENTRY_PATH = "/member-email-entry/check";

// Non-secret registration scope marker and same-origin verify headers.
export const ACCOUNT_TRAY_PASSKEY = "account-tray";
export const ACCOUNT_TRAY_PASSKEY_SESSION = "x-sphomores-passkey-session";
export const ACCOUNT_TRAY_PASSKEY_CONFIRMED = "x-sphomores-passkey-confirmed";
