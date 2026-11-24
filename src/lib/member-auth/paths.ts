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
/** The standalone sign-in page (owner, 24 Nov: a signed-out /account redirects here, no modal). */
export const MEMBER_SIGN_IN_PATH = "/sign-in";
/**
 * Where sign-in may return: a CLOSED list of the real account pages (Review-A, 24 Nov: syntax is not meaning; an
 * identifier-shaped segment could carry an order reference or other personal data through the URL and OAuth state).
 * tests/member-auth/sign-in-redirect.test.ts keeps it equal to the /me pages on disk.
 */
export const MEMBER_SIGN_IN_RETURNS = [
  MEMBER_ACCOUNT_PATH,
  "/me",
  "/me/orders",
  "/me/settings",
  "/me/settings/account",
  "/me/settings/addresses",
  "/me/settings/general",
  "/me/settings/notifications",
  "/me/settings/security"
] as const;
/** A listed return as given; an order's own page collapses to the orders list (its ID never rides along); else /account. */
export function memberSignInNext(value: unknown): string {
  if (typeof value !== "string") return MEMBER_ACCOUNT_PATH;
  if ((MEMBER_SIGN_IN_RETURNS as readonly string[]).includes(value)) return value;
  return value.startsWith("/me/orders/") ? "/me/orders" : MEMBER_ACCOUNT_PATH;
}
/**
 * Provider error codes the sign-in flow recognises (_shared/session.ts, and Better Auth 1.7.12's callback codes). Any
 * other value is forwarded as "unknown", so no free text from a URL is copied into the next one.
 */
export const MEMBER_PROVIDER_ERROR_CODES = [
  "access_denied", "user_cancelled", "user_canceled", "consent_denied", "provider_denied", "user_cancelled_authorize",
  "email_not_found", "email_not_verified", "account_not_linked", "unable_to_link_account", "unable_to_create_user",
  "no_code", "oauth_provider_not_found", "issuer_missing", "issuer_mismatch", "invalid_code", "nonce_binding_missing",
  "unable_to_get_user_info", "no_callback_url", "email_does_not_match", "account_already_linked_to_different_user",
  "state_mismatch", "internal_server_error"
] as const;
/** The sign-in page for a return path; a provider error is carried only as a recognised code, else "unknown". */
export function memberSignInHref(next: unknown, error?: unknown): string {
  const code = error === undefined ? undefined
    : typeof error === "string" && (MEMBER_PROVIDER_ERROR_CODES as readonly string[]).includes(error) ? error : "unknown";
  return `${MEMBER_SIGN_IN_PATH}?next=${memberSignInNext(next)}${code ? `&error=${code}` : ""}`;
}
/**
 * A social sign-in started on the sign-in page returns to it: `/sign-in` with at most one `next` (path or same-origin
 * URL). The return is rebuilt from the validated `next`, so callback, error and new-user all pin to that canonical
 * value; anything else is not a sign-in return (undefined).
 */
export function memberSignInReturn(origin: string, value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const relative = value.startsWith(`${origin}/`) ? value.slice(origin.length) : value;
  if (relative !== MEMBER_SIGN_IN_PATH && !relative.startsWith(`${MEMBER_SIGN_IN_PATH}?`)) return undefined;
  const query = new URLSearchParams(relative.slice(MEMBER_SIGN_IN_PATH.length));
  if ([...query.keys()].some((key) => key !== "next") || query.getAll("next").length > 1) return undefined;
  return memberSignInHref(query.get("next"));
}
/** The pinned social return: a purchase step, else the sign-in page, else undefined (the account continuation). */
export function memberSocialReturn(origin: string, value: unknown): string | undefined {
  return memberPurchaseReturnPath(origin, value) ?? memberSignInReturn(origin, value);
}
export const MEMBER_EMAIL_ENTRY_PATH = "/member-email-entry/check";

// Non-secret registration scope marker and same-origin verify headers.
export const ACCOUNT_TRAY_PASSKEY = "account-tray";
export const ACCOUNT_TRAY_PASSKEY_SESSION = "x-sphomores-passkey-session";
export const ACCOUNT_TRAY_PASSKEY_CONFIRMED = "x-sphomores-passkey-confirmed";
