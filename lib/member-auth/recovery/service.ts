import { createHmac, randomUUID } from "node:crypto";
import { z } from "zod";
import { normalizePhone } from "../../phone-verification/server/crypto";
import { isCmsSuperAdmin } from "../../auth/access";
import {
  RecoveryError,
  recoveryRequestSchema,
  recoveryReviewSchema,
  type RecoveryRepository
} from "./contracts";

export class RecoveryService {
  constructor(
    private readonly repository: RecoveryRepository,
    private readonly secret: string
  ) {
    if (secret.length < 32) throw new Error("Recovery secret is required");
  }
  async submit(input: unknown): Promise<void> {
    const parsed = recoveryRequestSchema.safeParse(input);
    if (!parsed.success) throw new RecoveryError("INVALID_INPUT");
    let phone: string;
    try {
      phone = normalizePhone(parsed.data.phone);
    } catch {
      throw new RecoveryError("INVALID_INPUT");
    }
    const contactEmail = parsed.data.contactEmail.toLowerCase();
    const now = new Date();
    const scopes = [
      ["global", "loopback"],
      ["phone", phone],
      ["email", contactEmail]
    ];
    const keys = scopes.map(([scope, value]) =>
      createHmac("sha256", this.secret)
        .update(`recovery-intake:${scope}\0${value}`)
        .digest("hex")
    );
    try {
      await this.repository.submit({
        id: randomUUID(),
        phone,
        contactEmail,
        keys,
        now,
        expiresAt: new Date(now.getTime() + 30 * 86400_000)
      });
    } catch (error) {
      if (error instanceof RecoveryError) throw error;
      throw new RecoveryError("UNAVAILABLE");
    }
  }
  async review(
    id: string,
    input: unknown,
    principal: unknown
  ): Promise<number> {
    if (!isCmsSuperAdmin(principal)) throw new RecoveryError("FORBIDDEN");
    const reviewerId = (principal as { id?: unknown }).id;
    const parsed = recoveryReviewSchema.safeParse(input);
    if (
      !parsed.success ||
      !z.uuid().safeParse(id).success ||
      !z.uuid().safeParse(reviewerId).success
    )
      throw new RecoveryError("INVALID_INPUT");
    try {
      return await this.repository.review({
        ...parsed.data,
        id,
        reviewerId: reviewerId as string,
        now: new Date()
      });
    } catch (error) {
      if (error instanceof RecoveryError) throw error;
      throw new RecoveryError("UNAVAILABLE");
    }
  }
}
