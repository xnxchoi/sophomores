import { isCmsStaff } from "@/lib/auth/access";

/**
 * Setlist curator authority: a verified CMS staff principal, as Payload's own
 * auth returns it (collection "admins", strategy "staff-better-auth"), whose
 * admins row carries the setlistCurator grant. Only a super admin can set the
 * grant; staff provisioning never does, so a staff-domain email alone is not
 * curator authority, and neither is any role. Pass the user from
 * payload.auth({ headers }), never the raw better-auth session user.
 */
export function isAuthorizedCurator(principal: unknown): boolean {
  return (
    isCmsStaff(principal) &&
    (principal as { setlistCurator?: unknown }).setlistCurator === true
  );
}
