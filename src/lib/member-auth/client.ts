"use client";

import { createAuthClient } from "better-auth/react";
import type { FetchHooks } from "better-auth/client";
import { emailOTPClient, magicLinkClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { z } from "zod";
import { normalizeLoginEmail } from "../passwordless-login";
import type { MemberEmailEntry } from "./contracts";
import { normalizeKoreanMobile } from "../phone-verification/model";
import { MEMBER_ACCOUNT_CONTINUATION_PATH, MEMBER_TICKET_CHECKOUT_PATH } from "./paths";

const capabilitiesSchema = z.object({
  emailOtp: z.boolean(),
  magicLink: z.boolean(),
  google: z.boolean(),
  passkey: z.boolean()
});
const statusSchema = z
  .object({
    authenticated: z.boolean(),
    phoneBindingAuth: z.enum(["anonymous", "reauth-required", "ready"]).optional(),
    emailVerified: z.boolean(),
    phoneBound: z.boolean(),
    member: z.boolean(),
    capabilities: capabilitiesSchema
  })
  .transform((value) => ({
    ...value,
    phoneBindingAuth: value.phoneBindingAuth ?? (value.authenticated ? "reauth-required" as const : "anonymous" as const)
  }))
  .refine(
    (value) =>
      (value.authenticated ? value.phoneBindingAuth !== "anonymous" : value.phoneBindingAuth === "anonymous") &&
      (!value.emailVerified || value.authenticated) &&
      (!value.phoneBound || value.authenticated) &&
      (!value.member ||
        (value.authenticated && value.emailVerified && value.phoneBound))
  );
export type MemberStatus = z.infer<typeof statusSchema>;
export const parseMemberStatus = (value: unknown): MemberStatus =>
  statusSchema.parse(value);

type AuthResult = { error?: unknown };
type AuthFetchOptions = Pick<FetchHooks, "onError">;
export type MemberAuthBrowserApi = {
  emailOtp: {
    sendVerificationOtp(input: {
      email: string;
      type: "sign-in";
      fetchOptions?: AuthFetchOptions;
    }): PromiseLike<AuthResult>;
  };
  signIn: {
    emailOtp(input: {
      email: string;
      otp: string;
      fetchOptions?: AuthFetchOptions;
    }): PromiseLike<AuthResult>;
    magicLink(input: {
      email: string;
      callbackURL: string;
      fetchOptions?: AuthFetchOptions;
    }): PromiseLike<AuthResult>;
    social(input: {
      provider: "google";
      callbackURL: string;
      errorCallbackURL?: string;
      newUserCallbackURL?: string;
      fetchOptions?: AuthFetchOptions;
    }): PromiseLike<AuthResult>;
    passkey(input?: {
      fetchOptions?: AuthFetchOptions;
    }): PromiseLike<AuthResult>;
  };
  passkey: {
    addPasskey(input: {
      name: string;
      fetchOptions?: AuthFetchOptions;
    }): PromiseLike<AuthResult>;
  };
  signOut(input?: { fetchOptions?: AuthFetchOptions }): PromiseLike<AuthResult>;
};
function configuredClient() {
  return createAuthClient({
    basePath: "/api/auth",
    fetchOptions: { timeout: 15_000 },
    plugins: [emailOTPClient(), magicLinkClient(), passkeyClient()]
  });
}
let browserClient: ReturnType<typeof configuredClient> | undefined;
function getBrowserClient(): MemberAuthBrowserApi {
  browserClient ??= configuredClient();
  return browserClient;
}
export type MemberAuthFailureKind =
  | "invalid-code"
  | "expired-code"
  | "attempts-exhausted"
  | "rate-limited"
  | "delivery-failed"
  | "network"
  | "timeout"
  | "passkey-cancelled"
  | "provider-denied"
  | "fresh-auth-required"
  | "unauthenticated"
  | "invalid-phone-proof"
  | "phone-conflict"
  | "unavailable";

const failureMessages: Record<MemberAuthFailureKind, string> = {
  "invalid-code": "That code is incorrect. Check it and try again.",
  "expired-code": "That code has expired. Request a new code.",
  "attempts-exhausted": "Too many incorrect attempts. Request a new code.",
  "rate-limited": "Too many requests. Please wait before trying again.",
  "delivery-failed": "We could not send the email. Please try again.",
  network: "Could not connect. Check your connection and try again.",
  timeout: "The request took too long. Please try again.",
  "passkey-cancelled":
    "The passkey request was not completed. Please try again.",
  "provider-denied": "Google sign-in was not completed. Please try again.",
  "fresh-auth-required": "Sign in again before verifying your phone.",
  unauthenticated: "Sign in to continue phone verification.",
  "invalid-phone-proof": "Verify your phone again to continue.",
  "phone-conflict": "This phone cannot be linked to this account. Use another phone.",
  unavailable: "Member authentication is unavailable. Please try again."
};

export class MemberAuthActionError extends Error {
  readonly retryAfterSeconds?: number;
  constructor(
    readonly kind: MemberAuthFailureKind,
    retryAfterSeconds?: number
  ) {
    super(failureMessages[kind]);
    this.name = "MemberAuthActionError";
    if (
      typeof retryAfterSeconds === "number" &&
      Number.isInteger(retryAfterSeconds) &&
      retryAfterSeconds > 0 &&
      retryAfterSeconds <= 86400
    )
      this.retryAfterSeconds = retryAfterSeconds;
  }
}

const unavailable = () => new MemberAuthActionError("unavailable");
const email = (value: string) => z.email().max(254).parse(value.trim());
type AuthOperation =
  | "send-code"
  | "verify-code"
  | "magic-link"
  | "google"
  | "passkey"
  | "add-passkey"
  | "other";

// Better Auth 1.7.12 owns protocol codes, not presentation or operation scoping.
// No installed/internal helper provides this feature-specific privacy boundary.
function actionFailure(
  error: unknown,
  operation: AuthOperation,
  status?: number,
  retryAfterSeconds?: number
): MemberAuthActionError {
  if (error instanceof TypeError) return new MemberAuthActionError("network");
  if (error instanceof DOMException) {
    if (error.name === "TimeoutError" || error.name === "AbortError")
      return new MemberAuthActionError("timeout");
    if (
      error.name === "NotAllowedError" &&
      (operation === "passkey" || operation === "add-passkey")
    )
      return new MemberAuthActionError("passkey-cancelled");
  }
  const detail =
    error && typeof error === "object" && !Array.isArray(error) ? error : {};
  const code =
    "code" in detail && typeof detail.code === "string"
      ? detail.code
      : undefined;
  const httpStatus =
    status ??
    ("status" in detail && typeof detail.status === "number"
      ? detail.status
      : undefined);
  if (httpStatus === 429 || code === "RATE_LIMITED")
    return new MemberAuthActionError(
      "rate-limited",
      retryAfterSeconds ??
        ("retryAfterSeconds" in detail &&
        typeof detail.retryAfterSeconds === "number"
          ? detail.retryAfterSeconds
          : undefined)
    );
  if (code === "FRESH_AUTH_REQUIRED") return new MemberAuthActionError("fresh-auth-required");
  if (code === "UNAUTHENTICATED") return new MemberAuthActionError("unauthenticated");
  if (code === "INVALID_PHONE_PROOF") return new MemberAuthActionError("invalid-phone-proof");
  if (code === "PHONE_CONFLICT") return new MemberAuthActionError("phone-conflict");
  if (operation === "verify-code") {
    if (code === "INVALID_OTP")
      return new MemberAuthActionError("invalid-code");
    if (code === "OTP_EXPIRED")
      return new MemberAuthActionError("expired-code");
    if (code === "TOO_MANY_ATTEMPTS")
      return new MemberAuthActionError("attempts-exhausted");
  }
  if (
    (operation === "passkey" || operation === "add-passkey") &&
    (code === "AUTH_CANCELLED" ||
      code === "ERROR_CEREMONY_ABORTED" ||
      (code === "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY" &&
        "cause" in detail &&
        detail.cause instanceof DOMException &&
        detail.cause.name === "NotAllowedError"))
  )
    return new MemberAuthActionError("passkey-cancelled");
  if (
    operation === "google" &&
    (code === "ACCESS_DENIED" || code === "access_denied")
  )
    return new MemberAuthActionError("provider-denied");
  if (
    (operation === "send-code" || operation === "magic-link") &&
    httpStatus === 500
  )
    return new MemberAuthActionError("delivery-failed");
  return unavailable();
}

async function accepted(
  action: (fetchOptions: AuthFetchOptions) => PromiseLike<AuthResult>,
  operation: AuthOperation
): Promise<void> {
  let result: AuthResult;
  let retryAfterSeconds: number | undefined;
  const fetchOptions: AuthFetchOptions = {
    onError({ response }) {
      const retry =
        response.headers.get("Retry-After") ??
        response.headers.get("X-Retry-After");
      retryAfterSeconds =
        retry && /^\d{1,5}$/.test(retry) ? Number(retry) : undefined;
    }
  };
  try {
    result = await action(fetchOptions);
  } catch (error) {
    throw actionFailure(error, operation, undefined, retryAfterSeconds);
  }
  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result) ||
    !("error" in result)
  )
    throw unavailable();
  if (result.error === null || result.error === undefined) return;
  throw actionFailure(result.error, operation, undefined, retryAfterSeconds);
}

/** Same-origin browser adapter. Server membership, never a browser success flag, is authoritative. */
export function createMemberClient(
  auth: MemberAuthBrowserApi = getBrowserClient(),
  fetcher: typeof fetch = fetch,
  context: "account" | "ticket-checkout" = "account"
) {
  async function request(path: string, init: RequestInit = {}) {
    try {
      const response = await fetcher(path, {
        ...init,
        credentials: "same-origin",
        cache: "no-store",
        signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000)
      });
      if (response.status === 429) {
        const retry =
          response.headers.get("Retry-After") ??
          response.headers.get("X-Retry-After");
        throw new MemberAuthActionError(
          "rate-limited",
          retry && /^\d{1,5}$/.test(retry) ? Number(retry) : undefined
        );
      }
      const text = await response.text();
      if (text.length > 16384) throw unavailable();
      let result: unknown;
      try {
        result = JSON.parse(text);
      } catch {
        throw unavailable();
      }
      if (
        !response.ok ||
        (result &&
          typeof result === "object" &&
          "success" in result &&
          result.success === false)
      ) {
        const detail =
          result && typeof result === "object" && "error" in result
            ? result.error
            : undefined;
        const retry =
          response.headers.get("Retry-After") ??
          response.headers.get("X-Retry-After");
        throw actionFailure(
          detail,
          "other",
          response.status,
          retry && /^\d{1,5}$/.test(retry) ? Number(retry) : undefined
        );
      }
      if (
        !result ||
        typeof result !== "object" ||
        !("success" in result) ||
        result.success !== true ||
        !("data" in result)
      )
        throw unavailable();
      return result.data;
    } catch (error) {
      if (error instanceof MemberAuthActionError) throw error;
      throw actionFailure(error, "other");
    }
  }
  const json = (method: string, body?: unknown): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return {
    async lookupEmail(value: string, options: { signal?: AbortSignal } = {}): Promise<MemberEmailEntry> {
      const normalized = normalizeLoginEmail(value);
      if (!normalized) throw unavailable();
      const result = z.object({ account: z.enum(["existing", "new"]) }).strict().safeParse(await request(
        "/api/auth/member-email-entry/check", { ...json("POST", { email: normalized }), signal: options.signal }
      ));
      if (!result.success) throw unavailable();
      return result.data;
    },
    async status(): Promise<MemberStatus> {
      const result = statusSchema.safeParse(
        await request("/api/member/status")
      );
      if (!result.success) throw unavailable();
      return result.data;
    },
    async bindPhone(challengeId: string, phone: string): Promise<void> {
      z.string()
        .regex(/^[A-Za-z0-9_-]{1,128}$/)
        .parse(challengeId);
      const normalized = normalizeKoreanMobile(phone);
      if (!normalized) throw unavailable();
      const result = z
        .object({ phoneBound: z.literal(true), member: z.literal(true) })
        .safeParse(
          await request(
            "/api/phone-verification/bind",
            json("POST", { challengeId, phone: normalized })
          )
        );
      if (!result.success) throw unavailable();
    },
    async identifyPhone(phone: string): Promise<void> {
      const normalized = normalizeKoreanMobile(phone);
      if (!normalized) throw unavailable();
      const result = z
        .object({ identified: z.literal(true) })
        .safeParse(
          await request(
            "/api/member/identify",
            json("POST", { phone: normalized })
          )
        );
      if (!result.success) throw unavailable();
    },
    async clearPhoneIdentifier(): Promise<void> {
      await request("/api/member/identify", json("DELETE"));
    },
    async sendEmailCode(value: string): Promise<void> {
      await accepted(
        (fetchOptions) =>
          auth.emailOtp.sendVerificationOtp({
            email: email(value),
            type: "sign-in",
            fetchOptions
          }),
        "send-code"
      );
    },
    async verifyEmailCode(value: string, otp: string): Promise<void> {
      const code = z
        .string()
        .length(6)
        .regex(/^[A-Za-z0-9]{6}$/)
        .parse(otp);
      const address = email(value);
      await accepted(
        (fetchOptions) =>
          auth.signIn.emailOtp({
            email: address,
            otp: code.toUpperCase(),
            fetchOptions
          }),
        "verify-code"
      );
    },
    async sendMagicLink(value: string): Promise<void> {
      await accepted(
        (fetchOptions) =>
          auth.signIn.magicLink({
            email: email(value),
            callbackURL: MEMBER_ACCOUNT_CONTINUATION_PATH,
            fetchOptions
          }),
        "magic-link"
      );
    },
    async signInGoogle(): Promise<void> {
      await accepted(
        (fetchOptions) =>
          auth.signIn.social({
            provider: "google",
            callbackURL: context === "ticket-checkout" ? MEMBER_TICKET_CHECKOUT_PATH : MEMBER_ACCOUNT_CONTINUATION_PATH,
            ...(context === "ticket-checkout" ? {
              errorCallbackURL: MEMBER_TICKET_CHECKOUT_PATH,
              newUserCallbackURL: MEMBER_TICKET_CHECKOUT_PATH
            } : {}),
            fetchOptions
          }),
        "google"
      );
    },
    async signInPasskey(): Promise<void> {
      await accepted(
        (fetchOptions) => auth.signIn.passkey({ fetchOptions }),
        "passkey"
      );
    },
    async addPasskey(): Promise<void> {
      await accepted(
        (fetchOptions) =>
          auth.passkey.addPasskey({ name: "My passkey", fetchOptions }),
        "add-passkey"
      );
    },
    async signOut(): Promise<void> {
      await accepted((fetchOptions) => auth.signOut({ fetchOptions }), "other");
    }
  };
}
export type MemberClient = Omit<ReturnType<typeof createMemberClient>, "lookupEmail"> & {
  lookupEmail?: (email: string, options?: { signal?: AbortSignal }) => Promise<MemberEmailEntry>;
};
