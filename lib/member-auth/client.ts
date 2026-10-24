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
const unavailable = () =>
  new Error("Member authentication is unavailable. Please try again.");
const email = (value: string) => z.email().max(254).parse(value.trim());
async function accepted(result: PromiseLike<AuthResult>): Promise<void> {
  try {
    if ((await result).error) throw unavailable();
  } catch {
    throw unavailable();
  }
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
      const text = await response.text();
      if (text.length > 16384 || !response.ok) throw unavailable();
      const result: unknown = JSON.parse(text);
      if (
        !result ||
        typeof result !== "object" ||
        !("success" in result) ||
        result.success !== true ||
        !("data" in result)
      )
        throw unavailable();
      return result.data;
    } catch {
      throw unavailable();
    }
  }
  const json = (method: string, body?: unknown): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return {
    async status(): Promise<MemberStatus> {
      return parseMemberStatus(await request("/api/member/status"));
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
        auth.emailOtp.sendVerificationOtp({
          email: email(value),
          type: "sign-in"
        })
      );
    },
    async verifyEmailCode(value: string, otp: string): Promise<void> {
      z.string()
        .regex(/^[0-9]{8}$/)
        .parse(otp);
      await accepted(auth.signIn.emailOtp({ email: email(value), otp }));
    },
    async sendMagicLink(value: string): Promise<void> {
      await accepted(
        auth.signIn.magicLink({
          email: email(value),
          callbackURL: MEMBER_ACCOUNT_CONTINUATION_PATH
        })
      );
    },
    async signInGoogle(): Promise<void> {
      await accepted(
        auth.signIn.social({
          provider: "google",
          callbackURL: MEMBER_ACCOUNT_CONTINUATION_PATH
        })
      );
    },
    async signInPasskey(): Promise<void> {
      await accepted(auth.signIn.passkey());
    },
    async addPasskey(): Promise<void> {
      await accepted(auth.passkey.addPasskey({ name: "My passkey" }));
    },
    async signOut(): Promise<void> {
      await accepted(auth.signOut());
    }
  };
}
export type MemberClient = ReturnType<typeof createMemberClient>;
