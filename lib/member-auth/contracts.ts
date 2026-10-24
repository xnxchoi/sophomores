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
  emailVerified: boolean;
  sessionCreatedAt: Date;
  email?: string;
  name?: string;
};
export type MemberCapabilities = {
  emailOtp: boolean;
  magicLink: boolean;
  google: boolean;
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
