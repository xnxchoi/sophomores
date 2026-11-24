export type MemberErrorCode =
  | "INVALID_INPUT" | "UNAUTHENTICATED" | "EMAIL_REQUIRED"
  | "FRESH_AUTH_REQUIRED" | "INVALID_PHONE_PROOF" | "PHONE_CONFLICT"
  | "RATE_LIMITED" | "UNAVAILABLE";

export class MemberError extends Error {
  constructor(readonly code: MemberErrorCode) {
    super(code);
    this.name = "MemberError";
  }
}

export type MemberPrincipal = {
  userId: string;
  sessionId?: string;
  emailVerified: boolean;
  sessionCreatedAt: Date;
  email?: string;
  name?: string;
};
export type MemberSocialProvider = "apple" | "google" | "kakao";
export type MemberCapabilities = {
  emailOtp: boolean;
  magicLink: boolean;
  google: boolean;
  // Older capability producers omit these providers; absence means switched off.
  apple?: boolean;
  kakao?: boolean;
  passkey: boolean;
};
export type MemberBinding = {
  userId: string;
  challengeId: string;
  policyVersion: string;
  verifiedAt: Date;
};
export type BindRecord = {
  userId: string;
  sessionId?: string;
  challengeId: string;
  phoneHash: string;
  sessionHash: string;
  sessionCreatedAt: Date;
  now: Date;
};
export type BoundMember = { userId: string; email: string; name: string };
export interface MemberBindingRepository {
  enforceBindRate(input: { keyHash: string; now: Date }): Promise<void>;
  bind(input: BindRecord): Promise<MemberBinding>;
  getBinding(userId: string): Promise<MemberBinding | null>;
  isActiveMember(userId: string): Promise<boolean>;
  findBoundUserByPhoneHash(phoneHash: string): Promise<BoundMember | null>;
}

export type MemberEmailEntry = { account: "existing" | "new" };

/**
 * Phone proofs a member binding accepts. The local SKT pilot as before; the preview carrier trial (owner, 24 Nov:
 * staff on SKT, an SKT MVNO, KT and LG U+ test on preview) only in the preview sandbox runtime. Production stays as it was.
 */
export function memberPhonePolicies(env: Readonly<Record<string, string | undefined>> = process.env): readonly string[] {
  return env.PREVIEW_RUNTIME === "sandbox"
    ? ["local-skt-zoho-arc-v1", "preview-trial-zoho-arc-v1"]
    : ["local-skt-zoho-arc-v1"];
}
