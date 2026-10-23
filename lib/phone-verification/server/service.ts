import { randomUUID } from "node:crypto";
import {
  type VerificationConfig,
  type VerificationRepository,
  VerificationError
} from "./contracts";
import {
  digest,
  normalizePhone,
  proofToken,
  randomToken,
  requireId,
  requireReference,
  requireToken
} from "./crypto";

export class PhoneVerificationService {
  private readonly config: Required<VerificationConfig>;
  constructor(
    private readonly repo: VerificationRepository,
    config: VerificationConfig
  ) {
    const limits = config.limits ?? {
      session: 5,
      phone: 5,
      ip: 20,
      windowMs: 3_600_000
    };
    if (
      typeof config.secret !== "string" ||
      Buffer.byteLength(config.secret) < 32 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.recipient) ||
      !config.mailboxId ||
      Object.values(limits).some((v) => !Number.isSafeInteger(v) || v < 1) ||
      (config.ttlMs !== undefined &&
        (!Number.isSafeInteger(config.ttlMs) ||
          config.ttlMs < 1000 ||
          config.ttlMs > 300_000))
    )
      throw new Error("Invalid verification configuration");
    this.config = {
      ...config,
      limits: { ...limits },
      now: config.now ?? (() => new Date()),
      ttlMs: config.ttlMs ?? 300_000
    };
  }
  private hash(purpose: string, value: string) {
    return digest(this.config.secret, purpose, value);
  }
  private validateEnvelope(input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new VerificationError("INVALID_INPUT");
  }
  private async storage<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof VerificationError) throw error;
      throw new VerificationError("UNAVAILABLE");
    }
  }
  async issue(input: { sessionToken: string; phone: string; ipKey: string }) {
    this.validateEnvelope(input);
    const phoneHash = this.hash("phone", normalizePhone(input.phone));
    const sessionHash = this.hash("session", requireToken(input.sessionToken));
    if (
      typeof input.ipKey !== "string" ||
      !input.ipKey ||
      input.ipKey.length > 256
    )
      throw new VerificationError("INVALID_INPUT");
    const now = this.config.now();
    const token = randomToken();
    const id = randomUUID();
    const expiresAt = new Date(now.getTime() + this.config.ttlMs);
    await this.storage(() =>
      this.repo.issue({
        id,
        sessionHash,
        phoneHash,
        tokenHash: this.hash("challenge", token),
        proofHash: this.hash(
          "proof",
          proofToken(this.config.secret, id, sessionHash)
        ),
        state: "pending",
        createdAt: now,
        expiresAt,
        ipHash: this.hash("ip", input.ipKey),
        limits: this.config.limits
      })
    );
    return {
      id,
      recipient: this.config.recipient,
      body: `SPHMRS ${token}`,
      expiresAt: expiresAt.toISOString(),
      mode: "trial" as const
    };
  }
  async status(input: { sessionToken: string; id: string }) {
    this.validateEnvelope(input);
    const sessionHash = this.hash("session", requireToken(input.sessionToken));
    const id = requireId(input.id);
    const record = await this.storage(() =>
      this.repo.findOwned(id, sessionHash, this.config.now())
    );
    if (!record) throw new VerificationError("NOT_FOUND");
    return {
      id,
      state: record.state,
      expiresAt: record.expiresAt.toISOString(),
      mode: "trial" as const,
      ...(record.state === "verified"
        ? { proofToken: proofToken(this.config.secret, id, sessionHash) }
        : {})
    };
  }
  async cancel(input: { sessionToken: string; id: string }) {
    this.validateEnvelope(input);
    const sessionHash = this.hash("session", requireToken(input.sessionToken));
    const id = requireId(input.id);
    if (
      !(await this.storage(() =>
        this.repo.cancel(id, sessionHash, this.config.now())
      ))
    )
      throw new VerificationError("NOT_FOUND");
  }
  async match(input: {
    mailboxId: string;
    messageId: string;
    phone: string;
    token: string;
    receivedAt: Date;
    approved: boolean;
    policyVersion: string;
    deliveryLease?: { id: string; leaseToken: string };
  }) {
    this.validateEnvelope(input);
    requireReference(input.mailboxId);
    requireReference(input.messageId);
    if (input.mailboxId !== this.config.mailboxId)
      return { outcome: "ignored" as const };
    const phoneHash = this.hash("phone", normalizePhone(input.phone));
    const tokenHash = this.hash("challenge", requireToken(input.token));
    if (input.deliveryLease) {
      requireId(input.deliveryLease.id);
      requireId(input.deliveryLease.leaseToken);
    }
    if (
      !(input.receivedAt instanceof Date) ||
      !Number.isFinite(input.receivedAt.getTime()) ||
      typeof input.approved !== "boolean" ||
      typeof input.policyVersion !== "string" ||
      !/^[\w.-]{1,100}$/.test(input.policyVersion)
    )
      throw new VerificationError("INVALID_INPUT");
    return this.storage(() =>
      this.repo.match({
        mailboxId: input.mailboxId,
        messageId: input.messageId,
        receivedAt: input.receivedAt,
        approved: input.approved,
        policyVersion: input.policyVersion,
        deliveryLease: input.deliveryLease,
        phoneHash,
        tokenHash,
        now: this.config.now()
      })
    );
  }
  async consumeProof(input: {
    sessionToken: string;
    phone: string;
    proofToken: string;
  }) {
    this.validateEnvelope(input);
    const sessionHash = this.hash("session", requireToken(input.sessionToken));
    const phoneHash = this.hash("phone", normalizePhone(input.phone));
    const proofHash = this.hash("proof", requireToken(input.proofToken));
    const id = await this.storage(() =>
      this.repo.consumeProof({
        sessionHash,
        phoneHash,
        proofHash,
        now: this.config.now()
      })
    );
    if (!id) throw new VerificationError("INVALID_PROOF");
    return { verified: true as const, challengeId: id };
  }
}
