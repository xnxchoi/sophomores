import { APIError } from "payload";
import { z } from "zod";
import { rateCommerceCustomer } from "../../commerce/access";
import type { MemberPrincipal } from "../contracts";
import {
  acceptMemberRequest,
  memberJson,
  memberRequestFailure,
  readMemberBody
} from "../http";
import {
  WalletError,
  type WalletActivation,
  type WalletErrorCode
} from "./activation";
import type { WalletActivationView } from "./read";

/*
 * /api/member/wallet/* (plan: ENDPOINTS & STATES). Same-origin JSON only,
 * bounded WebAuthn-sized bodies, a per-member rate limit and private no-store
 * responses. GET status never activates anything.
 */

const MAX_BODY = 16 * 1024;
const base64url = z
  .string()
  .regex(/^[A-Za-z0-9_-]+$/)
  .max(4096);
const clientExtensionResults = z.record(z.string(), z.unknown());
const registrationSchema = z
  .object({
    response: z.object({
      id: base64url,
      rawId: base64url,
      type: z.literal("public-key"),
      clientExtensionResults,
      authenticatorAttachment: z
        .enum(["platform", "cross-platform"])
        .optional(),
      response: z.object({
        clientDataJSON: base64url,
        attestationObject: base64url,
        transports: z.array(z.string().max(32)).max(8).optional(),
        publicKeyAlgorithm: z.number().optional(),
        publicKey: base64url.optional(),
        authenticatorData: base64url.optional()
      })
    })
  })
  .strict();
const assertionSchema = z
  .object({
    response: z.object({
      id: base64url,
      rawId: base64url,
      type: z.literal("public-key"),
      clientExtensionResults,
      authenticatorAttachment: z
        .enum(["platform", "cross-platform"])
        .optional(),
      response: z.object({
        clientDataJSON: base64url,
        authenticatorData: base64url,
        signature: base64url,
        userHandle: base64url.optional()
      })
    })
  })
  .strict();
const bindOptionsSchema = z
  .object({ credentialId: base64url.max(1024) })
  .strict();

const status: Record<WalletErrorCode, number> = {
  UNAUTHENTICATED: 401,
  EMAIL_REQUIRED: 403,
  FRESH_AUTH_REQUIRED: 401,
  NOT_ELIGIBLE: 403,
  WALLET_ACTIVE: 409,
  WALLET_CONFLICT: 409,
  INCOMPATIBLE_CREDENTIAL: 422,
  UNKNOWN_CREDENTIAL: 404,
  INVALID_CHALLENGE: 400,
  INVALID_ASSERTION: 400,
  INVALID_REGISTRATION: 400,
  LIMIT_REACHED: 429,
  UNAVAILABLE: 503
};

export function walletFailure(error: unknown): Response {
  if (error instanceof WalletError)
    return memberJson(status[error.code], {
      success: false,
      error: { code: error.code }
    });
  if (error instanceof APIError && error.status === 429) {
    const response = memberJson(429, {
      success: false,
      error: { code: "RATE_LIMITED" }
    });
    response.headers.set("Retry-After", "60");
    return response;
  }
  return memberRequestFailure(error);
}

type Dependencies = {
  origin: string;
  activation: WalletActivation | null;
  resolvePrincipal: (request: Request) => Promise<MemberPrincipal | null>;
  readStatus: (
    principal: MemberPrincipal | null
  ) => Promise<WalletActivationView>;
  bodyTimeoutMs?: number;
};

export function createWalletHandlers(deps: Dependencies) {
  const timeoutMs = deps.bodyTimeoutMs ?? 5000;
  async function mutation<T>(
    request: Request,
    schema: z.ZodType<T> | null,
    act: (
      activation: WalletActivation,
      principal: MemberPrincipal | null,
      input: T
    ) => Promise<unknown>
  ): Promise<Response> {
    try {
      acceptMemberRequest(request, deps.origin, "POST");
      if (!deps.activation) throw new WalletError("UNAVAILABLE");
      const principal = await deps.resolvePrincipal(request);
      if (!principal) throw new WalletError("UNAUTHENTICATED");
      rateCommerceCustomer(`member-wallet:${principal.userId}`);
      let input = undefined as T;
      if (schema) {
        const parsed = schema.safeParse(
          await readMemberBody(request, timeoutMs, MAX_BODY)
        );
        if (!parsed.success)
          return memberJson(400, {
            success: false,
            error: { code: "INVALID_BODY" }
          });
        input = parsed.data;
      }
      return memberJson(200, {
        success: true,
        data: await act(deps.activation, principal, input)
      });
    } catch (error) {
      return walletFailure(error);
    }
  }
  return {
    async status(request: Request): Promise<Response> {
      try {
        acceptMemberRequest(request, deps.origin, "GET");
        const principal = await deps.resolvePrincipal(request);
        // Signed-in reads are rate limited per member; anonymous reads touch no member data.
        if (principal)
          rateCommerceCustomer(`member-wallet-status:${principal.userId}`);
        return memberJson(200, {
          success: true,
          data: await deps.readStatus(principal)
        });
      } catch (error) {
        return walletFailure(error);
      }
    },
    registerOptions: (request: Request) =>
      mutation(request, null, (activation, principal) =>
        activation.registerOptions(principal)
      ),
    registerVerify: (request: Request) =>
      mutation(request, registrationSchema, (activation, principal, input) =>
        activation.registerVerify(principal, input.response as never)
      ),
    bindOptions: (request: Request) =>
      mutation(request, bindOptionsSchema, (activation, principal, input) =>
        activation.bindOptions(principal, input.credentialId)
      ),
    bindVerify: (request: Request) =>
      mutation(request, assertionSchema, (activation, principal, input) =>
        activation.bindVerify(principal, input.response as never)
      )
  };
}
