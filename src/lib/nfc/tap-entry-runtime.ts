import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createLocalReq } from "payload";
import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { loadPayloadMemberConfig } from "@/lib/member-auth/payload-config";
import { readOnlyMemberSession } from "@/lib/member-auth/read-only-session";
import { nativeAes128CmacAvailable } from "./aes-cmac";
import { consumeNfcHandoff, hasNfcWelcomedMember, inspectNfcTap, isEligibleNfcMember, persistNfcHandoff, readNfcHandoff } from "./storage";
import { parseSunTapUri } from "./sun-verifier";
import type { NfcSecrets } from "./storage-keys";
import { nfcRef, tapOrigin, type TapPageState } from "./tap-entry";

type Environment = Readonly<Record<string, string | undefined>>;

/** Immutable, dedicated verifier refs only; this does not load station/setup secrets. */
export function configuredTapSecrets(env: Environment): NfcSecrets | null {
  if (env.NFC_TAP_ENABLED !== "1") return null;
  const value = env.NFC_TAP_FINGERPRINT_SECRET ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  const fingerprintSecret = Buffer.from(value, "base64url");
  if (fingerprintSecret.length !== 32 || fingerprintSecret.toString("base64url") !== value) return null;
  return {
    fingerprintSecret,
    async readVerifierKey(ref) {
      if (!/^NFC_TAP_KEY_[A-Z0-9_]{1,80}$/.test(ref)) return null;
      const hex = env[ref] ?? "";
      return /^[A-Fa-f0-9]{32}$/.test(hex) ? Buffer.from(hex, "hex") : null;
    },
  };
}

const browserToken = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const hash = (token: string) => createHash("sha256").update(token, "ascii").digest("hex");

async function openTapContext(request: Request, readOnly: boolean) {
  if (isReviewCopyRequest(request)) return { state: "unavailable" } as const;
  const secrets = configuredTapSecrets(process.env);
  if (!secrets || !nativeAes128CmacAvailable() || loadPayloadMemberConfig()?.origin !== tapOrigin) {
    return { state: "unavailable" } as const;
  }
  const runtime = await import("@/payload");
  const { payload, auth } = await runtime.getNfcPayload(readOnly);
  const principal = await readOnlyMemberSession(request.headers, await auth.$context);
  if (!principal) return { state: "signed-out" } as const;
  if (!principal.emailVerified) return { state: "unavailable" } as const;
  const req = await createLocalReq({ req: { headers: request.headers } }, payload);
  // SYSTEM principal resolution (S0c): the verified session supplies the only user ID.
  const member = await payload.findByID({
    collection: "users", id: principal.userId, overrideAccess: true, disableErrors: true,
    depth: 0, select: { membershipStatus: true, emailVerified: true }, req,
  });
  if (!isEligibleNfcMember(member?.emailVerified, member?.membershipStatus)) return { state: "unavailable" } as const;
  return { state: "ready", req, principal, secrets } as const;
}

export async function beginTapHandoff(request: Request) {
  if (!parseSunTapUri(request.url)) return { state: "unavailable" } as const;
  const context = await openTapContext(request, true);
  if (context.state !== "ready") return context;
  const proof = await inspectNfcTap(context.req, context.principal, request.url, context.secrets);
  if (proof === "stale") return { state: "stale" } as const;
  if (!proof) return { state: "unavailable" } as const;
  const id = randomBytes(16).toString("base64url");
  const browser = randomBytes(32).toString("base64url");
  const { getNfcPayload } = await import("@/payload");
  const { payload } = await getNfcPayload(false);
  await persistNfcHandoff(payload.db.pool, proof, id, hash(browser));
  return { state: "ready", id, browser } as const;
}

export async function inspectTapHandoff(id: string, headers: Headers, browser: string | undefined): Promise<TapPageState> {
  if (id === "signed-out" || id === "unavailable" || id === "stale") return { state: id };
  if (!nfcRef.test(id) || !browser || !browserToken.test(browser)) return { state: "stale" };
  try {
    const context = await openTapContext(new Request(tapOrigin, { headers }), true);
    if (context.state !== "ready") return { state: "stale" };
    const { req, principal } = context;
    const formRef = await readNfcHandoff(req.payload.db.pool, principal.userId, id, hash(browser));
    if (!formRef) return { state: "stale" };
    const welcomed = await hasNfcWelcomedMember(req, principal.userId);
    return { state: welcomed ? "already-linked" : "ready", signet: "unavailable", formRef, confirmation: id };
  } catch { return { state: "stale" }; }
}

export async function confirmTapHandoff(request: Request, id: string, browser: string | undefined) {
  if (!nfcRef.test(id) || !browser || !browserToken.test(browser)) return null;
  const context = await openTapContext(request, false);
  if (context.state !== "ready") return null;
  return consumeNfcHandoff(context.req, context.principal, id, hash(browser), new URL(request.url).pathname.slice("/nfc/".length));
}
