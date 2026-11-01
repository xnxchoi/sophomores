import type { AuthStrategy, AuthStrategyResult, Payload } from "payload";
import { isVerifiedStaff } from "./staff-email";
import { ensureStaffAdminProvisioned } from "./staff";

type StaffAdminDoc = { id: number | string } & Record<string, unknown>;

type StaffSessionPayload = {
  betterAuth?: {
    api: {
      getSession: (args: {
        headers: Headers;
        query?: { disableRefresh: boolean };
      }) => Promise<{
        user?: {
          email?: string | null;
          id?: string | null;
          name?: string | null;
          emailVerified?: boolean | null;
        } | null;
      } | null>;
    };
  };
  logger?: { error: (value: unknown, message?: string) => unknown };
  find: (args: {
    collection: "admins";
    depth: number;
    overrideAccess: boolean;
    limit: number;
    where: { email: { equals: string } };
  }) => Promise<{ docs: StaffAdminDoc[] }>;
};

export type StaffSessionUser = StaffAdminDoc & {
  _strategy: "staff-better-auth";
  collection: "admins";
};

/** Maps a verified Better Auth staff session onto the separate admins collection. */
export async function authenticateStaffSession(args: {
  headers: Headers;
  payload: StaffSessionPayload;
}): Promise<{ user: StaffSessionUser | null }> {
  try {
    const session = await args.payload.betterAuth?.api.getSession({
      headers: args.headers,
      query: { disableRefresh: true }
    });
    const email = session?.user?.email;
    if (!email || !isVerifiedStaff(session!.user!)) return { user: null };
    const normalized = email.trim().toLowerCase();
    const lookup = {
      collection: "admins" as const,
      depth: 0,
      overrideAccess: true,
      limit: 1,
      where: { email: { equals: normalized } }
    };
    let existing = await args.payload.find(lookup);
    if (!existing.docs[0]) {
      await ensureStaffAdminProvisioned(
        {
          email: normalized,
          emailVerified: true,
          name: session?.user?.name,
          id: session?.user?.id
        },
        args.payload as unknown as Payload
      );
      existing = await args.payload.find(lookup);
    }
    const admin = existing.docs[0];
    if (!admin) return { user: null };
    return {
      user: {
        ...admin,
        collection: "admins",
        _strategy: "staff-better-auth"
      }
    };
  } catch (error) {
    args.payload.logger?.error(
      {
        category: "staff-session-unavailable",
        errorType: error instanceof Error ? error.name : "UnknownError"
      },
      "Staff authentication failed closed"
    );
    return { user: null };
  }
}

export const staffBetterAuthStrategy: AuthStrategy = {
  name: "staff-better-auth",
  authenticate: async ({ headers, payload }): Promise<AuthStrategyResult> => {
    const result = await authenticateStaffSession({
      headers,
      payload: payload as unknown as StaffSessionPayload
    });
    return result as AuthStrategyResult;
  }
};
