"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, magicLinkClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { z } from "zod";
import { normalizeKoreanMobile } from "../phone-verification/model";
import { MEMBER_ACCOUNT_CONTINUATION_PATH } from "./paths";

const capabilitiesSchema = z.object({
  emailOtp: z.boolean(),
  magicLink: z.boolean(),
  google: z.boolean(),
  passkey: z.boolean()
});
const statusSchema = z
  .object({
    authenticated: z.boolean(),
    emailVerified: z.boolean(),
    phoneBound: z.boolean(),
    member: z.boolean(),
    capabilities: capabilitiesSchema
  })
  .refine(
    (value) =>
      (!value.emailVerified || value.authenticated) &&
      (!value.phoneBound || value.authenticated) &&
      (!value.member ||
        (value.authenticated && value.emailVerified && value.phoneBound))
  );
export type MemberStatus = z.infer<typeof statusSchema>;
export const parseMemberStatus = (value: unknown): MemberStatus =>
  statusSchema.parse(value);

type AuthResult = { error?: unknown };
export type MemberAuthBrowserApi = {
  emailOtp: {
    sendVerificationOtp(input: {
      email: string;
      type: "sign-in";
    }): PromiseLike<AuthResult>;
  };
  signIn: {
    emailOtp(input: { email: string; otp: string }): PromiseLike<AuthResult>;
    magicLink(input: {
      email: string;
      callbackURL: string;
    }): PromiseLike<AuthResult>;
    social(input: {
      provider: "google";
      callbackURL: string;
    }): PromiseLike<AuthResult>;
    passkey(): PromiseLike<AuthResult>;
  };
  passkey: { addPasskey(input: { name: string }): PromiseLike<AuthResult> };
  signOut(): PromiseLike<AuthResult>;
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
      code === "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY")
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
  action: () => PromiseLike<AuthResult>,
  operation: AuthOperation
): Promise<void> {
  let result: AuthResult;
  try {
    result = await action();
  } catch (error) {
    throw actionFailure(error, operation);
  }
  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result) ||
    !("error" in result)
  )
    throw unavailable();
  if (result.error === null || result.error === undefined) return;
  throw actionFailure(result.error, operation);
}

/** Same-origin browser adapter. Server membership, never a browser success flag, is authoritative. */
export function createMemberClient(
  auth: MemberAuthBrowserApi = getBrowserClient(),
  fetcher: typeof fetch = fetch
) {
  async function request(path: string, init: RequestInit = {}) {
    try {
      const response = await fetcher(path, {
        ...init,
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(10_000)
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
        () =>
          auth.emailOtp.sendVerificationOtp({
            email: email(value),
            type: "sign-in"
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
        () => auth.signIn.emailOtp({ email: address, otp: code.toUpperCase() }),
        "verify-code"
      );
    },
    async sendMagicLink(value: string): Promise<void> {
      await accepted(
        () =>
          auth.signIn.magicLink({
            email: email(value),
            callbackURL: MEMBER_ACCOUNT_CONTINUATION_PATH
          }),
        "magic-link"
      );
    },
    async signInGoogle(): Promise<void> {
      await accepted(
        () =>
          auth.signIn.social({
            provider: "google",
            callbackURL: MEMBER_ACCOUNT_CONTINUATION_PATH
          }),
        "google"
      );
    },
    async signInPasskey(): Promise<void> {
      await accepted(() => auth.signIn.passkey(), "passkey");
    },
    async addPasskey(): Promise<void> {
      await accepted(
        () => auth.passkey.addPasskey({ name: "My passkey" }),
        "add-passkey"
      );
    },
    async signOut(): Promise<void> {
      await accepted(() => auth.signOut(), "other");
    }
  };
}
export type MemberClient = ReturnType<typeof createMemberClient>;
