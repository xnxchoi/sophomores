import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Config, type Payload, type Plugin } from "payload";
import { z } from "zod";
import { lockCommerce } from "@/lib/commerce/_shared/transaction";
import { isReadOnly } from "./home-page";
import { isReviewEditorProfile, staffAuthOrigin } from "@/lib/auth/review-editor-policy";
import { failureClass } from "@/lib/auth/failure-log";

/**
 * Makes sure the CMS has its first super admin, so super-admin-only grants (such as the setlist
 * curator grant) can be made at all (owner, 22 Nov).
 *
 * - **Configured, not hard-coded:** the address comes from `PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL`. Unset or
 *   blank means nothing happens.
 * - **Only the first one:** if any super admin exists, nothing changes. It never demotes anyone and never
 *   creates a row: the staff row for that address must already exist (verified staff sign-in creates it).
 *   Until it does, each start logs that it is waiting; the next start, or that staff sign-in, promotes it.
 * - **Serialised, idempotent:** the check and the promotion share one owning `req` and hold one PostgreSQL
 *   advisory lock, so two instances (even with different configured addresses) decide one after the other
 *   and only the first can promote. Without an owned transaction it refuses to decide.
 * - **Never on the review copy:** the restricted review-copy profile never promotes, even with the
 *   address configured; the check is here, in the promotion itself, not only at sign-in.
 * - **Success only when durable:** the adapter can swallow a failed commit, so "promoted" is reported
 *   only after a fresh read outside the transaction sees the new role.
 * - **Diagnostics never carry the address:** errors are logged by a fixed label and a correlation ID only.
 * - **At startup** (`superAdminEnsurePlugin`), scheduled outside `onInit` like the home-page ensure.
 */
export type SuperAdminBootstrapResult = "unconfigured" | "present" | "promoted" | "missing-staff" | "review-copy" | "read-only" | "failed";

/** A fixed label and correlation ID only: no property value of the thrown error is logged, since database errors can quote query parameters, the configured address included. */
function errorSummary(error: unknown): Record<string, string> {
  return { errorClass: failureClass(error), correlationId: crypto.randomUUID() };
}

type Environment = Record<string, string | undefined>;
const emailSchema = z.email();

export function bootstrapSuperAdminEmail(env: Environment = process.env): string | null {
  const value = env.PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL?.trim().toLowerCase();
  if (!value) return null;
  return emailSchema.safeParse(value).success ? value : null;
}

export async function ensureFirstSuperAdmin(payload: Payload, env: Environment = process.env): Promise<SuperAdminBootstrapResult> {
  const email = bootstrapSuperAdminEmail(env);
  if (!email) {
    if (env.PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL?.trim()) payload.logger.error("Super admin bootstrap skipped: PAYLOAD_BOOTSTRAP_SUPERADMIN_EMAIL is not a valid address.");
    return "unconfigured";
  }
  if (isReviewEditorProfile(staffAuthOrigin(env), env)) {
    payload.logger.warn("Super admin bootstrap skipped: the review copy never promotes a super admin.");
    return "review-copy";
  }
  const req = await createLocalReq({}, payload);
  const owns = await initTransaction(req);
  try {
    if (!owns || !(await req.transactionID)) throw new Error("Super admin bootstrap requires its own transaction");
    // One first-admin decision at a time across every instance sharing this database.
    await lockCommerce(req, ["first-super-admin"]);
    const existing = await payload.find({ collection: "admins", req, overrideAccess: true, depth: 0, limit: 1,
      where: { role: { equals: "admin" } } });
    let result: SuperAdminBootstrapResult = "present";
    let promotedID: string | number | undefined;
    if (existing.totalDocs === 0) {
      const staff = await payload.find({ collection: "admins", req, overrideAccess: true, depth: 0, limit: 2,
        where: { email: { equals: email } } });
      if (staff.totalDocs > 1) throw new Error("Duplicate staff rows for the bootstrap address");
      const row = staff.docs[0];
      if (!row) result = "missing-staff";
      else {
        await payload.update({ collection: "admins", id: row.id, req, overrideAccess: true, depth: 0, data: { role: "admin" } });
        result = "promoted";
        promotedID = row.id;
      }
    }
    await commitTransaction(req);
    if (promotedID !== undefined) {
      // A fresh read with no transaction: only a committed promotion counts.
      const durable = await payload.findByID({ collection: "admins", id: promotedID, overrideAccess: true, depth: 0, disableErrors: true });
      if (durable?.role !== "admin") {
        payload.logger.error("Super admin bootstrap failed: the promotion did not commit.");
        return "failed";
      }
    }
    if (result === "promoted") payload.logger.info("Super admin bootstrap: the configured staff account is now the first super admin.");
    if (result === "missing-staff") payload.logger.warn("Super admin bootstrap waiting: no staff account exists yet for the configured address. Sign in once as staff.");
    return result;
  } catch (error) {
    if (owns) await killTransaction(req);
    if (isReadOnly(error)) {
      payload.logger.warn("Super admin bootstrap skipped: the database is read-only.");
      return "read-only";
    }
    payload.logger.error({ ...errorSummary(error), msg: "Super admin bootstrap failed." });
    return "failed";
  }
}

export const superAdminEnsurePlugin: Plugin = (config: Config): Config => ({
  ...config,
  onInit: async (payload) => {
    await config.onInit?.(payload);
    setTimeout(() => {
      void ensureFirstSuperAdmin(payload).catch((error: unknown) => {
        payload.logger.error({ ...errorSummary(error), msg: "Super admin bootstrap failed." });
      });
    }, 0);
  },
});
