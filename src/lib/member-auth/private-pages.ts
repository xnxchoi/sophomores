// Pages that show a signed-in member's own data (owner, 23 Nov: standard web security is the baseline). Each one is
// sent with Cache-Control: private, no-store (src/proxy.ts, besides Next's own header for dynamic pages), mounts
// PrivatePageGuard (a page restored from the back-forward cache is hidden and reloaded, so the server re-checks the
// session), and carries no personal data in its URL. tests/member-auth/private-pages.test.ts keeps this list, the
// guard and the routes that read the signed-in member in step.
export const privatePagePrefixes = [
  "/account",
  "/me",
  "/shop/cart",
  "/shop/checkout",
  "/shop/invitations",
  "/shop/orders",
  "/shop/payment",
  "/tickets/payment"
] as const;

/** True for a private page or anything under it, matched by whole path segments ("/me/orders", not "/meet"). */
export function isPrivatePagePath(pathname: string): boolean {
  return privatePagePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const privatePageCacheControl = "private, no-store";
