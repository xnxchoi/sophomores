import { z } from "zod";
import { digest, normalizePhone, requireId, requireToken } from "../phone-verification/server/crypto";
import { VerificationError } from "../phone-verification/server/contracts";
import { MemberError, type MemberBindingRepository, type MemberPrincipal } from "./contracts";

const principalSchema = z.object({
  userId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  emailVerified: z.boolean(),
  sessionCreatedAt: z.date()
});
const FRESH_SESSION_MS = 15 * 60_000;

export class MemberBindingService {
  private readonly now: () => Date;
  constructor(
    private readonly repository: MemberBindingRepository,
    private readonly config: { verificationSecret: string; now?: () => Date }
  ) {
    if (!/^[a-f0-9]{64}$/.test(config.verificationSecret)) throw new Error("Invalid member binding configuration");
    this.now = config.now ?? (() => new Date());
  }
  private principal(value: unknown): MemberPrincipal {
    const parsed = principalSchema.safeParse(value);
    if (!parsed.success) throw new MemberError("UNAUTHENTICATED");
    return parsed.data;
  }
  private async storage<T>(action: () => Promise<T>): Promise<T> {
    try { return await action(); }
    catch (error) {
      if (error instanceof MemberError) throw error;
      throw new MemberError("UNAVAILABLE");
    }
  }
  async bind(input: { principal: MemberPrincipal; challengeId: string; phone: string; verificationSessionToken: string }) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new MemberError("INVALID_INPUT");
    const principal = this.principal(input.principal);
    const now = this.now();
    if (!principal.emailVerified) throw new MemberError("EMAIL_REQUIRED");
    const age = now.getTime() - principal.sessionCreatedAt.getTime();
    if (!Number.isFinite(age) || age < 0 || age > FRESH_SESSION_MS) throw new MemberError("FRESH_AUTH_REQUIRED");
    let values: { challengeId: string; phoneHash: string; sessionHash: string };
    try {
      values = {
        challengeId: requireId(input.challengeId),
        phoneHash: digest(this.config.verificationSecret, "phone", normalizePhone(input.phone)),
        sessionHash: digest(this.config.verificationSecret, "session", requireToken(input.verificationSessionToken))
      };
    } catch (error) {
      if (error instanceof VerificationError) throw new MemberError("INVALID_INPUT");
      throw error;
    }
    await this.storage(() => this.repository.enforceBindRate({ keyHash: digest(this.config.verificationSecret, "member-bind-rate", principal.userId), now }));
    await this.storage(() => this.repository.bind({ ...values, userId: principal.userId, sessionCreatedAt: principal.sessionCreatedAt, now }));
    return { phoneBound: true as const, member: true as const };
  }
  async status(principal: MemberPrincipal | null) {
    if (!principal) return { authenticated: false, emailVerified: false, phoneBound: false, member: false };
    const valid = this.principal(principal);
    const binding = await this.storage(() => this.repository.getBinding(valid.userId));
    const member = valid.emailVerified && Boolean(binding) && await this.storage(() => this.repository.isActiveMember(valid.userId));
    return { authenticated: true, emailVerified: valid.emailVerified, phoneBound: Boolean(binding), member };
  }
}
