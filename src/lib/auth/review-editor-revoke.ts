import { isStaffEmail } from "./staff-email";
import { isConfiguredStaffEmail, reviewEditorOrigin } from "./review-editor-policy";

type SessionAuthority = {
  findUserByEmail(email: string): Promise<{ user: { id: string; email: string } } | null>;
  deleteUserSessions(userId: string): Promise<void>;
  listSessions(userId: string): Promise<unknown[]>;
};

/** Operator-only, not a browser endpoint: close eligibility before deleting sessions. */
export async function revokeReviewEditorSessions(origin: string, rawEmail: string, authority: SessionAuthority): Promise<number> {
  const email = rawEmail.trim().toLowerCase();
  if (origin !== reviewEditorOrigin || !isStaffEmail(email) || isConfiguredStaffEmail(origin, email)) {
    throw new Error("Remove the editor from the review allowlist before revocation.");
  }
  const account = await authority.findUserByEmail(email);
  if (!account) return 0;
  if (account.user.email.toLowerCase() !== email || !account.user.id) throw new Error("Review identity mismatch.");
  const before = (await authority.listSessions(account.user.id)).length;
  await authority.deleteUserSessions(account.user.id);
  if ((await authority.listSessions(account.user.id)).length !== 0) throw new Error("Review session revocation not confirmed.");
  return before;
}
