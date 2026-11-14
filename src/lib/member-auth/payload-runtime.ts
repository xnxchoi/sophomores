import { Pool } from "pg";
import { z } from "zod";
import { configuredMemberCapabilities, loadPayloadMemberConfig, type PayloadMemberConfig } from "./payload-config";
import { PgPayloadMemberRepository } from "./payload-repository";
import { MemberBindingService } from "./service";
import { PgPhoneIdentifier, IdentifierError, identifierCookieToken } from "./identifier";
import type { MemberPrincipal } from "./contracts";

type CanonicalSession = {
  user: { id: string; emailVerified?: boolean; email?: string; name?: string };
  session: { id: string; createdAt: Date | string; expiresAt: Date | string };
} | null;
type Dependencies = { getSession?: (request: Request) => Promise<CanonicalSession>; pool?: Pool };
const canonicalId = z.uuid();

/** Construction neither creates an auth issuer nor connects/migrates/sends providers. */
export function createPayloadMemberRuntime(config: PayloadMemberConfig, dependencies: Dependencies = {}) {
  const pool = dependencies.pool ?? new Pool({ connectionString: config.databaseUrl, max: 4,
    connectionTimeoutMillis: 2000, idleTimeoutMillis: 5000, statement_timeout: 5000,
    lock_timeout: 1000, query_timeout: 6000, allowExitOnIdle: true });
  pool.on("error", () => { console.error("Canonical member storage is unavailable."); });
  const repository = new PgPayloadMemberRepository(pool);
  const service = new MemberBindingService(repository, { verificationSecret: config.verificationSecret });
  const identifier = new PgPhoneIdentifier(pool, { origin: config.origin, secret: config.secret,
    verificationSecret: config.verificationSecret, schema: "canonical_member",
    // Loading already proved production (https) or local (http) mode and the matching origin.
    production: config.origin.startsWith("https:") });
  const capabilities = configuredMemberCapabilities(config);
  const getSession = dependencies.getSession ?? (async (request: Request) => {
    const { getPayload } = await import("../../payload");
    const payload = await getPayload();
    return await payload.betterAuth.api.getSession({ headers: request.headers,
      query: { disableCookieCache: true } }) as CanonicalSession;
  });
  const toMemberPrincipal = async (request: Request): Promise<MemberPrincipal | null> => {
    const result = await getSession(request);
    if (!result || !canonicalId.safeParse(result.user.id).success || !canonicalId.safeParse(result.session.id).success) return null;
    const createdAt = new Date(result.session.createdAt);
    const expiresAt = new Date(result.session.expiresAt);
    if (!Number.isFinite(createdAt.getTime()) || !Number.isFinite(expiresAt.getTime())
      || createdAt.getTime() > Date.now() || expiresAt.getTime() <= Date.now()) return null;
    return { userId: result.user.id, sessionId: result.session.id, emailVerified: result.user.emailVerified === true,
      sessionCreatedAt: createdAt, email: result.user.email, name: result.user.name };
  };
  return { config, pool, repository, service, identifier, capabilities, toMemberPrincipal };
}

let current: ReturnType<typeof createPayloadMemberRuntime> | undefined;
export function getPayloadMemberRuntime() {
  const config = loadPayloadMemberConfig();
  if (!config) return null;
  current ??= createPayloadMemberRuntime(config);
  return current;
}

export async function assertPayloadPhoneIdentifier(headers: Headers, userId: string): Promise<void> {
  // Ordinary auth stays usable with local phone enrollment disabled; an existing
  // selection constraint must never silently disappear when storage is offline.
  if (!identifierCookieToken(headers)) return;
  const runtime = getPayloadMemberRuntime();
  if (!runtime) throw new IdentifierError("UNAVAILABLE");
  await runtime.identifier.assert(headers, userId);
}

export async function isPayloadActiveMember(userId: string): Promise<boolean> {
  const runtime = getPayloadMemberRuntime();
  return runtime ? runtime.repository.isActiveMember(userId) : false;
}

export async function payloadPasskeyUser(credentialId: string): Promise<string | null> {
  const runtime = getPayloadMemberRuntime();
  if (!runtime || !credentialId || credentialId.length > 2048) return null;
  const result = await runtime.pool.query<{ user_id: string }>(
    "SELECT user_id FROM public.passkeys WHERE credential_id=$1", [credentialId]);
  return result.rows[0]?.user_id ?? null;
}
