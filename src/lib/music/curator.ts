import { isCmsStaff } from "@/lib/auth/access";
import type { User } from "@/payload-types";

/**
 * Checks whether the current user has curator privileges for event setlists.
 * Matches CMS staff/admins or verified curator accounts.
 */
export function isAuthorizedCurator(user: User | unknown): boolean {
  if (!user || typeof user !== "object") return false;
  if (isCmsStaff(user)) return true;

  const u = user as { role?: string; email?: string };
  if (u.role === "admin" || u.role === "staff") return true;

  if (
    u.email &&
    (u.email.endsWith("@sophomores.co") ||
      u.email === "seanschoi@lostinseoul.com" ||
      u.email === "seanschoi@sophomores.co")
  ) {
    return true;
  }

  return false;
}
