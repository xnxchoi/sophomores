import { isStaffEmail } from "./staff-email";

/** Payload's default admin route. Magic links may return only to this path. */
export const cmsAdminCallbackPath = "/admin";

/** Reads the callback path from a Better Auth magic-link URL. Rejects off-origin targets. */
export function callbackPathname(magicLinkUrl: string): string | null {
  let link: URL;
  try {
    link = new URL(magicLinkUrl);
  } catch {
    return null;
  }
  const callback = link.searchParams.get("callbackURL");
  if (callback === null) return null;
  let target: URL;
  try {
    target = new URL(callback, link.origin);
  } catch {
    return null;
  }
  if (target.origin !== link.origin || target.username || target.password || target.hash) return null;
  return target.pathname;
}

/**
 * Admin-panel magic links are staff-only. Other callback paths stay the caller's decision
 * so member sign-in links are unchanged.
 */
export function adminMagicLinkAllowed(email: string, magicLinkUrl: string): boolean {
  const path = callbackPathname(magicLinkUrl);
  if (path === null) return false;
  if (path !== cmsAdminCallbackPath) return true;
  return isStaffEmail(email);
}

/** Keeps post-login navigation inside the admin route. */
export function safeAdminDestination(value: unknown, adminRoute: string): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string" || candidate.length === 0 || candidate.length > 2048) return adminRoute;
  let url: URL;
  try {
    url = new URL(candidate, "http://cms.local");
  } catch {
    return adminRoute;
  }
  if (url.origin !== "http://cms.local" || url.username || url.password || url.hash) return adminRoute;
  const path = url.pathname;
  if (path !== adminRoute && !path.startsWith(`${adminRoute}/`)) return adminRoute;
  if (path.split("/").includes("..")) return adminRoute;
  return `${path}${url.search}`;
}
