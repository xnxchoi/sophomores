import { memberEmailEntry } from "./email-entry";
import { normalizeLoginEmail } from "../passwordless-login";
import { betterAuth } from "better-auth";
import { generateRandomString } from "better-auth/crypto";
import { APIError, createAuthMiddleware, getSessionFromCtx, addOAuthServerContext, getOAuthState } from "better-auth/api";
import { emailOTP, magicLink } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import type { Pool } from "pg";
import type { MemberAuthConfig } from "./config";
import type { MemberMailer } from "./mail";
import { identifierCookieToken, IDENTIFIER_COOKIE } from "./identifier";
import { MEMBER_ACCOUNT_PATH, MEMBER_ACCOUNT_CONTINUATION_PATH, MEMBER_TICKET_CHECKOUT_PATH } from "./paths";

const paths = new Set([
  "/member-email-entry/check", "/get-session", "/sign-out", "/sign-in/social", "/callback/google", "/link-social", "/list-accounts",
  "/email-otp/send-verification-otp", "/sign-in/email-otp", "/sign-in/magic-link", "/magic-link/verify",
  "/passkey/generate-register-options", "/passkey/verify-registration", "/passkey/list-user-passkeys",
  "/passkey/generate-authenticate-options", "/passkey/verify-authentication"
]);
const activePaths = new Set(["/link-social", "/list-accounts", "/passkey/generate-register-options",
  "/passkey/verify-registration", "/passkey/list-user-passkeys"]);
const forbidden = () => new APIError("FORBIDDEN", { message: "This authentication request is unavailable." });
const unavailable = () => new APIError("SERVICE_UNAVAILABLE", { message: "This sign-in method is not configured." });

export function memberAuthPath(path: string | undefined, params?: Record<string, unknown>): string {
  return path === "/callback/:id" && params?.id === "google" ? "/callback/google" : path ?? "";
}

/** Request data cannot widen OAuth scopes, grants, profile authority or redirects. */
export function assertMemberAuthRequest(config: MemberAuthConfig, path: string,
  body?: Record<string, unknown>, query?: URLSearchParams): void {
  if (!paths.has(path)) throw forbidden();
  if (path === "/member-email-entry/check" && (!body || Object.keys(body).some((key) => key !== "email")
    || typeof body.email !== "string" || !normalizeLoginEmail(body.email) || (query?.size ?? 0) > 0)) throw forbidden();
  if (body && ["scopes", "additionalParams", "additionalData", "serverContext", "metadata", "idToken", "emailVerified", "phoneNumber", "phoneVerified", "member", "role", "userId", "image"]
    .some((key) => Object.hasOwn(body, key))) throw forbidden();
  if (body?.name !== undefined && (typeof body.name !== "string" || body.name.length > 80 || /[\x00-\x1f\x7f]/.test(body.name))) throw forbidden();
  const ticketCheckout = path === "/sign-in/social" && body?.provider === "google"
    && (body.callbackURL === MEMBER_TICKET_CHECKOUT_PATH || body.callbackURL === `${config.origin}${MEMBER_TICKET_CHECKOUT_PATH}`);
  for (const key of ["callbackURL", "errorCallbackURL", "newUserCallbackURL"]) {
    const destinations = ticketCheckout ? [MEMBER_TICKET_CHECKOUT_PATH] : key === "errorCallbackURL" ? [MEMBER_ACCOUNT_PATH]
      : [MEMBER_ACCOUNT_PATH, MEMBER_ACCOUNT_CONTINUATION_PATH];
    if ((query?.getAll(key).length ?? 0) > 1) throw forbidden();
    for (const value of [body?.[key], query?.get(key) ?? undefined]) {
      if (value !== undefined && !destinations.some((destination) =>
        value === destination || value === `${config.origin}${destination}`)) throw forbidden();
    }
  }
  if (["/sign-in/social", "/link-social"].includes(path)) {
    if (!config.google) throw unavailable();
    if (body?.provider !== "google" || body.callbackURL === undefined) throw forbidden();
  }
  if (path.startsWith("/email-otp/") || path === "/sign-in/email-otp" || path === "/sign-in/magic-link" || path === "/magic-link/verify") {
    if (!config.mail) throw unavailable();
    if (path === "/email-otp/send-verification-otp" && body?.type !== "sign-in") throw forbidden();
    if (path === "/sign-in/email-otp" && (typeof body?.otp !== "string" || body.otp.length !== 6 || !/^[A-Za-z0-9]{6}$/.test(body.otp))) throw forbidden();
    if (path === "/sign-in/magic-link" && body?.callbackURL === undefined) throw forbidden();
  }
}

/** Client authenticatorSelection is advisory; enforce UV on the verified result. */
export function assertPasskeyUserVerification(verification: unknown, phase: "registration" | "authentication"): void {
  const object = verification && typeof verification === "object" ? verification as Record<string, unknown> : {};
  const info = object[phase === "registration" ? "registrationInfo" : "authenticationInfo"];
  if (!info || typeof info !== "object" || (info as Record<string, unknown>).userVerified !== true) throw forbidden();
}

/** Only Better Auth's sealed serverContext can restore an OAuth flow selector. */
export function phoneIdentifierFlowHeaders(headers: Headers, trustedToken: unknown): Headers {
  const output = new Headers(headers);
  if (trustedToken === undefined) return output;
  if (typeof trustedToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(trustedToken)) throw forbidden();
  const currentToken = identifierCookieToken(headers);
  if (currentToken && currentToken !== trustedToken) throw forbidden();
  if (!currentToken) output.set("cookie", [headers.get("cookie"), `${IDENTIFIER_COOKIE}=${trustedToken}`].filter(Boolean).join("; "));
  return output;
}

export type MemberAuthDependencies = {
  pool: Pool;
  isActiveMember: (userId: string) => Promise<boolean>;
  sendMail: MemberMailer;
  assertPhoneIdentifier?: (headers: Headers, userId: string) => Promise<void>;
};

function beforeMemberAuth(config: MemberAuthConfig, active: (id: string) => Promise<void>) {
  return createAuthMiddleware(async (context) => {
    const path = memberAuthPath(context.path, context.params);
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(context.query ?? {})) {
      if (["callbackURL", "errorCallbackURL", "newUserCallbackURL"].includes(key) && Array.isArray(value)) throw forbidden();
      if (typeof value === "string") query.set(key, value);
    }
    assertMemberAuthRequest(config, path, context.body, query);
    const ticketCheckout = path === "/sign-in/social"
      && (context.body?.callbackURL === MEMBER_TICKET_CHECKOUT_PATH
        || context.body?.callbackURL === `${config.origin}${MEMBER_TICKET_CHECKOUT_PATH}`);
    if (path === "/sign-in/social" || path === "/link-social") {
      const token = identifierCookieToken(new Headers(context.headers));
      if (token) await addOAuthServerContext({ memberPhoneIdentifier: token });
    }
    if (activePaths.has(path)) {
      const session = await getSessionFromCtx(context, { disableCookieCache: true });
      if (!session || session.user.emailVerified !== true) throw forbidden();
      await active(session.user.id);
      if (path === "/link-social" && Date.now() - session.session.createdAt.getTime() > 900000) throw forbidden();
    }
    if (path === "/sign-in/email-otp" && typeof context.body?.otp === "string")
      return { context: { body: { ...context.body, otp: context.body.otp.toUpperCase() } } };
    if (["/sign-in/social", "/link-social", "/sign-in/magic-link"].includes(path))
      return { context: { body: { ...context.body,
        callbackURL: ticketCheckout ? MEMBER_TICKET_CHECKOUT_PATH : MEMBER_ACCOUNT_CONTINUATION_PATH,
        errorCallbackURL: ticketCheckout ? MEMBER_TICKET_CHECKOUT_PATH : MEMBER_ACCOUNT_PATH,
        newUserCallbackURL: ticketCheckout ? MEMBER_TICKET_CHECKOUT_PATH : MEMBER_ACCOUNT_CONTINUATION_PATH } } };
  });
}

function memberPasskey(config: MemberAuthConfig, dependencies: MemberAuthDependencies, active: (id: string) => Promise<void>) {
  return passkey({ rpID: config.rpId, rpName: "Sophomores", origin: config.origin,
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
    advanced: { webAuthnChallengeCookie: "sophomores-member-passkey" },
    registration: { requireSession: true, async afterVerification({ verification, user }) {
      assertPasskeyUserVerification(verification, "registration");
      await active(user.id);
    } },
    authentication: { async afterVerification({ verification, clientData, ctx }) {
      assertPasskeyUserVerification(verification, "authentication");
      const result = await dependencies.pool.query<{ userId: string }>(
        'SELECT "userId" FROM member_auth.passkey WHERE "credentialID"=$1', [clientData.id]);
      const userId = result.rows[0]?.userId;
      if (!userId) throw forbidden();
      await active(userId);
      await dependencies.assertPhoneIdentifier?.(new Headers(ctx.headers), userId);
    } }
  });
}

export function createMemberAuth(config: MemberAuthConfig, dependencies: MemberAuthDependencies) {
  const active = async (userId: string) => {
    if (!(await dependencies.isActiveMember(userId))) throw forbidden();
  };
  return betterAuth({
    appName: "Sophomores", baseURL: config.origin, basePath: "/api/auth", secret: config.secret,
    database: dependencies.pool, trustedOrigins: [config.origin],
    emailAndPassword: { enabled: false },
    user: { changeEmail: { enabled: false }, deleteUser: { enabled: false } },
    session: { expiresIn: 604800, updateAge: 86400, freshAge: 900, cookieCache: { enabled: false } },
    account: { encryptOAuthTokens: true, skipStateCookieCheck: false, storeStateStrategy: "database",
      accountLinking: { enabled: true, disableImplicitLinking: true } },
    advanced: { cookiePrefix: "sophomores-member", useSecureCookies: config.mode === "production",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      ipAddress: { ipAddressHeaders: ["x-member-local-ip"] } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60,
      customRules: { "/sign-in/email-otp": { window: 60, max: 5 } } },
    logger: { disabled: true }, telemetry: { enabled: false }, onAPIError: { errorURL: `${config.origin}${MEMBER_ACCOUNT_PATH}` },
    socialProviders: config.google ? { google: { ...config.google,
      scope: ["openid", "email", "profile"], requireEmailVerification: true,
      disableIdTokenSignIn: true, includeGrantedScopes: false, accessType: "online" } } : {},
    databaseHooks: { session: { create: { before: async (session, context) => {
      const state = memberAuthPath(context?.path, context?.params) === "/callback/google" ? await getOAuthState() : null;
      const headers = phoneIdentifierFlowHeaders(new Headers(context?.headers), state?.serverContext?.memberPhoneIdentifier);
      await dependencies.assertPhoneIdentifier?.(headers, session.userId);
      return { data: session };
    } } } },
    hooks: { before: beforeMemberAuth(config, active) },
    plugins: [memberEmailEntry(config.origin),
      emailOTP({ otpLength: 6, generateOTP: () => generateRandomString(6, "A-Z", "0-9"),
        expiresIn: 300, allowedAttempts: 3, storeOTP: "hashed",
        rateLimit: { window: 60, max: 3 }, changeEmail: { enabled: false },
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "sign-in" || !config.mail) throw unavailable();
          await dependencies.sendMail({ type: "email-otp", email, otp });
        } }),
      magicLink({ expiresIn: 300, storeToken: "hashed", rateLimit: { window: 60, max: 3 },
        async sendMagicLink({ email, url }) {
          if (!config.mail) throw unavailable();
          await dependencies.sendMail({ type: "magic-link", email, url });
        } }),
      memberPasskey(config, dependencies, active)
    ]
  });
}

export type MemberAuth = ReturnType<typeof createMemberAuth>;

function privateJson(status: number): Response {
  return Response.json({ success: false, error: { code: "UNAVAILABLE", message: "Member authentication is unavailable." } },
    { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
}

/** Only this loopback wrapper trusts the private rate-limit IP header it creates. */
export async function handleMemberAuthRequest(auth: Pick<MemberAuth, "handler">, config: MemberAuthConfig, request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (url.origin !== config.origin || request.headers.get("host") !== new URL(config.origin).host
      || (request.method === "POST" && request.headers.get("origin") !== config.origin)) return privateJson(403);
    if (!["GET", "POST"].includes(request.method)) return privateJson(405);
    const headers = new Headers(request.headers);
    for (const name of ["forwarded", "x-forwarded-for", "x-real-ip", "cf-connecting-ip"]) headers.delete(name);
    headers.set("x-member-local-ip", "127.0.0.1");
    let body: Uint8Array | undefined;
    if (request.method === "POST") {
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return privateJson(415);
      if (Number(request.headers.get("content-length")) > 65536 || !request.body) return privateJson(413);
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 5000);
      try {
        while (true) {
          const entry = await reader.read();
          if (timedOut) return privateJson(408);
          if (entry.done) break;
          size += entry.value.byteLength;
          if (size > 65536) return privateJson(413);
          chunks.push(entry.value);
        }
        body = Buffer.concat(chunks);
      } finally { clearTimeout(timer); await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    }
    const response = await auth.handler(new Request(request.url, { method: request.method, headers, body: body as BodyInit | undefined }));
    if (response.status >= 500) { await response.body?.cancel(); return privateJson(503); }
    const output = new Headers(response.headers);
    output.set("Cache-Control", "private, no-store"); output.set("X-Content-Type-Options", "nosniff");
    output.set("Referrer-Policy", "no-referrer"); output.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return new Response(response.body, { status: response.status, headers: output });
  } catch { return privateJson(503); }
}
