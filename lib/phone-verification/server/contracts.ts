export type ChallengeState =
  "pending" | "review" | "verified" | "cancelled" | "expired" | "consumed";
export type VerificationErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INVALID_PROOF"
  | "UNAVAILABLE";
export class VerificationError extends Error {
  constructor(readonly code: VerificationErrorCode) {
    super(code);
    this.name = "VerificationError";
  }
}
export interface VerificationConfig {
  secret: string;
  recipient: string;
  mailboxId: string;
  now?: () => Date;
  ttlMs?: number;
  limits?: { session: number; phone: number; ip: number; windowMs: number };
}
export interface ChallengeRecord {
  id: string;
  sessionHash: string;
  phoneHash: string;
  tokenHash: string;
  proofHash: string;
  state: ChallengeState;
  createdAt: Date;
  expiresAt: Date;
}
export interface IssueRecord extends ChallengeRecord {
  ipHash: string;
  limits: { session: number; phone: number; ip: number; windowMs: number };
}
export interface MatchRecord {
  mailboxId: string;
  messageId: string;
  phoneHash: string;
  tokenHash: string;
  receivedAt: Date;
  approved: boolean;
  policyVersion: string;
  now: Date;
  deliveryLease?: { id: string; leaseToken: string };
}
export type MatchResult =
  | { outcome: "matched"; state: "review" | "verified" }
  | { outcome: "ignored" | "duplicate" };
export interface DeliveryRef {
  mailboxId: string;
  messageId: string;
  receivedAt?: Date;
}
export interface DeliveryLease extends DeliveryRef {
  id: string;
  leaseToken: string;
  attempts: number;
  receivedAt: Date;
}
export interface DeliveryClaimScope {
  mailboxId: string;
  messageIds: readonly string[];
}
export interface VerificationRepository {
  issue(input: IssueRecord): Promise<void>;
  findOwned(
    id: string,
    sessionHash: string,
    now: Date
  ): Promise<ChallengeRecord | null>;
  cancel(id: string, sessionHash: string, now: Date): Promise<boolean>;
  match(input: MatchRecord): Promise<MatchResult>;
  consumeProof(input: {
    sessionHash: string;
    phoneHash: string;
    proofHash: string;
    now: Date;
  }): Promise<string | null>;
  enqueueDelivery(input: DeliveryRef, now?: Date): Promise<boolean>;
  claimDelivery(
    now?: Date,
    leaseMs?: number,
    scope?: DeliveryClaimScope
  ): Promise<DeliveryLease | null>;
  completeDelivery(
    input: Pick<DeliveryLease, "id" | "leaseToken">,
    now?: Date
  ): Promise<boolean>;
  failDelivery(
    input: Pick<DeliveryLease, "id" | "leaseToken">,
    now?: Date
  ): Promise<boolean>;
  cleanup(now?: Date): Promise<void>;
}
