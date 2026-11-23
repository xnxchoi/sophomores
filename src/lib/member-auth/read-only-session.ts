import "server-only";
import type { AuthContext } from "@better-auth/core";
import { createAuthEndpoint } from "better-auth/api";
import { z } from "zod";

const memberId = z.uuid();

const read = createAuthEndpoint.serverOnly({ method: "GET", requireHeaders: true }, async (ctx) => {
  const token = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
  if (!token) return null;
  const result = await ctx.context.internalAdapter.findSession(token);
  if (!result || !memberId.safeParse(result.user.id).success ||
    !(new Date(result.session.expiresAt).getTime() > Date.now())) return null;
  return { userId: result.user.id, emailVerified: result.user.emailVerified === true };
});

/** Server-only lookup; deliberately bypasses getSession's refresh and expiry cleanup. */
export async function readOnlyMemberSession(headers: Headers, context: AuthContext) {
  return read({ headers, context });
}
