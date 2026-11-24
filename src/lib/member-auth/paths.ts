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
 * Where sign-in returns: /account, /me or a /me subpath, as a bare lowercase path from an explicit allowlist.
 * Anything else (another origin, a protocol-relative, backslash or encoded path, a query or hash) is /account, so
 * `next` can never become an open redirect and never carries personal data.
 */
export function memberSignInNext(value: unknown): string {
  return typeof value === "string" && /^\/(?:account|me(?:\/[a-z0-9-]{1,32}){0,3})$/.test(value) ? value : MEMBER_ACCOUNT_PATH;
}
/** The sign-in page for a return path; a provider error code is carried only in its bounded form. */
export function memberSignInHref(next: unknown, error?: unknown): string {
  const code = typeof error === "string" ? (/^[a-z0-9_-]{1,64}$/i.test(error) ? error : "unknown") : undefined;
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
