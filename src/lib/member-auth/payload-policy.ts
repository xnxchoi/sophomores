import { normalizeLoginEmail } from "../passwordless-login";
import { APIError, addOAuthServerContext, createAuthMiddleware, getOAuthState, getAuthoritativeSessionFromCtx } from "better-auth/api";
import { identifierCookieToken } from "./identifier";
import { assertPasskeyUserVerification, memberAuthPath, phoneIdentifierFlowHeaders } from "./server";
import { MEMBER_ACCOUNT_PATH, MEMBER_ACCOUNT_CONTINUATION_PATH, MEMBER_TICKET_CHECKOUT_PATH } from "./paths";

const allowedPaths = new Set([
  "/member-email-entry/check", "/get-session", "/sign-out", "/sign-in/social", "/callback/google", "/link-social", "/list-accounts",
  "/email-otp/send-verification-otp", "/sign-in/email-otp", "/sign-in/magic-link", "/magic-link/verify",
  "/passkey/generate-register-options", "/passkey/verify-registration", "/passkey/list-user-passkeys",
  "/passkey/generate-authenticate-options", "/passkey/verify-authentication", "/update-user",
  "/multi-session/list-device-sessions", "/multi-session/set-active", "/multi-session/revoke",
]);
const activePaths = new Set(["/link-social", "/list-accounts", "/passkey/generate-register-options",
  "/passkey/verify-registration", "/passkey/list-user-passkeys"]);
const forbidden = () => new APIError("FORBIDDEN", { message: "This authentication request is unavailable." });

/** Pure validation is shared with tests; providers cannot widen scopes or identity. */
export function assertPayloadAuthRequest(origin: string, path: string, body?: Record<string, unknown>, query?: URLSearchParams): void {
  if (!allowedPaths.has(path)) throw forbidden();
  if (path === "/member-email-entry/check" && (!body || Object.keys(body).some((key) => key !== "email")
    || typeof body.email !== "string" || !normalizeLoginEmail(body.email) || (query?.size ?? 0) > 0)) throw forbidden();
  if (body && ["scopes", "additionalParams", "additionalData", "serverContext", "metadata", "idToken", "emailVerified",
    "phoneNumber", "phoneNumberVerified", "phone", "member", "role", "membershipStatus", "ticketTier", "verified", "userId", "image"]
    .some((key) => Object.hasOwn(body, key))) throw forbidden();
  if (body?.name !== undefined && (typeof body.name !== "string" || body.name.length > 80 || /[\x00-\x1f\x7f]/.test(body.name))) throw forbidden();
  if (path === "/update-user" && Object.keys(body ?? {}).some((key) => !["name", "localePreference"].includes(key))) throw forbidden();
  const ticketCheckout = path === "/sign-in/social" && body?.provider === "google"
    && (body.callbackURL === MEMBER_TICKET_CHECKOUT_PATH || body.callbackURL === `${origin}${MEMBER_TICKET_CHECKOUT_PATH}`);
  for (const key of ["callbackURL", "errorCallbackURL", "newUserCallbackURL"]) {
    const destinations = ticketCheckout ? [MEMBER_TICKET_CHECKOUT_PATH] : key === "errorCallbackURL" ? [MEMBER_ACCOUNT_PATH, "/admin"]
      : [MEMBER_ACCOUNT_PATH, MEMBER_ACCOUNT_CONTINUATION_PATH, "/admin"];
    if ((query?.getAll(key).length ?? 0) > 1) throw forbidden();
    for (const value of [body?.[key], query?.get(key) ?? undefined]) {
      if (value !== undefined && !destinations.some((destination) => value === destination || value === `${origin}${destination}`)) throw forbidden();
    }
  }
  if (["/sign-in/social", "/link-social"].includes(path) && (body?.provider !== "google" || body.callbackURL === undefined)) throw forbidden();
  if (path === "/email-otp/send-verification-otp" && body?.type !== "sign-in") throw forbidden();
  if (path === "/sign-in/email-otp" && (typeof body?.otp !== "string" || !/^[A-Za-z0-9]{6}$/.test(body.otp))) throw forbidden();
  if (path === "/sign-in/magic-link" && body?.callbackURL === undefined) throw forbidden();
}

async function requireActiveMember(userId: string): Promise<void> {
  const { isPayloadActiveMember } = await import("./payload-runtime");
  if (!(await isPayloadActiveMember(userId))) throw forbidden();
}

export function createPayloadAuthBefore(origin: string) {
  return createAuthMiddleware(async (context) => {
    const path = memberAuthPath(context.path, context.params);
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(context.query ?? {})) {
      if (["callbackURL", "errorCallbackURL", "newUserCallbackURL"].includes(key) && Array.isArray(value)) throw forbidden();
      if (typeof value === "string") query.set(key, value);
    }
    assertPayloadAuthRequest(origin, path, context.body, query);
    const ticketCheckout = path === "/sign-in/social"
      && (context.body?.callbackURL === MEMBER_TICKET_CHECKOUT_PATH
        || context.body?.callbackURL === `${origin}${MEMBER_TICKET_CHECKOUT_PATH}`);
    if (path === "/multi-session/set-active" && identifierCookieToken(new Headers(context.headers))) throw forbidden();
    if (path === "/sign-in/social" || path === "/link-social") {
      const token = identifierCookieToken(new Headers(context.headers));
      if (token) await addOAuthServerContext({ memberPhoneIdentifier: token });
    }
    if (activePaths.has(path)) {
      const session = await getAuthoritativeSessionFromCtx(context);
      if (!session || session.user.emailVerified !== true) throw forbidden();
      await requireActiveMember(session.user.id);
      if (path === "/link-social" && Date.now() - session.session.createdAt.getTime() > 900_000) throw forbidden();
    }
    if (path === "/sign-in/email-otp" && typeof context.body?.otp === "string") {
      return { context: { body: { ...context.body, otp: context.body.otp.toUpperCase() } } };
    }
    if (["/sign-in/social", "/link-social", "/sign-in/magic-link"].includes(path)
      && context.body?.callbackURL !== "/admin" && context.body?.callbackURL !== `${origin}/admin`) {
      return { context: { body: { ...context.body,
        callbackURL: ticketCheckout ? MEMBER_TICKET_CHECKOUT_PATH : MEMBER_ACCOUNT_CONTINUATION_PATH,
        errorCallbackURL: ticketCheckout ? MEMBER_TICKET_CHECKOUT_PATH : MEMBER_ACCOUNT_PATH,
        newUserCallbackURL: ticketCheckout ? MEMBER_TICKET_CHECKOUT_PATH : MEMBER_ACCOUNT_CONTINUATION_PATH } } };
    }
  });
}

export async function beforePayloadSessionCreate<T extends { userId: string }>(session: T,
  context: { path?: string; params?: Record<string, unknown>; headers?: HeadersInit } | null | undefined) {
  const state = memberAuthPath(context?.path, context?.params) === "/callback/google" ? await getOAuthState() : null;
  const headers = phoneIdentifierFlowHeaders(new Headers(context?.headers), state?.serverContext?.memberPhoneIdentifier);
  const { assertPayloadPhoneIdentifier } = await import("./payload-runtime");
  await assertPayloadPhoneIdentifier(headers, session.userId);
  return { data: session };
}

export function createPayloadPasskeyPolicy() {
  return {
    registration: { requireSession: true, async afterVerification({ verification, user }: {
      verification: unknown; user: { id: string };
    }) {
      assertPasskeyUserVerification(verification, "registration");
      await requireActiveMember(user.id);
    } },
    authentication: { async afterVerification({ verification, clientData, ctx }: {
      verification: unknown; clientData: { id: string }; ctx: { headers?: HeadersInit };
    }) {
      assertPasskeyUserVerification(verification, "authentication");
      const { payloadPasskeyUser, assertPayloadPhoneIdentifier } = await import("./payload-runtime");
      const userId = await payloadPasskeyUser(clientData.id);
      if (!userId) throw forbidden();
      await requireActiveMember(userId);
      await assertPayloadPhoneIdentifier(new Headers(ctx.headers), userId);
    } },
  };
}
