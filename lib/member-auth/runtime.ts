import { Pool } from "pg";
import { loadMemberAuthConfig, type MemberAuthConfig } from "./config";
import { createMemberAuth } from "./server";
import { createMemberMailer } from "./mail";
import { PgMemberRepository } from "./repository";
import { MemberBindingService } from "./service";
import { PgPhoneIdentifier } from "./identifier";
import type { MemberCapabilities, MemberPrincipal } from "./contracts";

/** No connections, migration, provider calls or credential reads at build import. */
export function createMemberAuthRuntime(config: MemberAuthConfig) {
  const pool = new Pool({ connectionString: config.databaseUrl, options: "-c search_path=member_auth",
    max: 4, connectionTimeoutMillis: 2000, idleTimeoutMillis: 5000,
    statement_timeout: 5000, lock_timeout: 1000, query_timeout: 6000, allowExitOnIdle: true });
  pool.on("error", () => { console.error("Member authentication storage is unavailable."); });
  const repository = new PgMemberRepository(pool);
  const service = new MemberBindingService(repository, { verificationSecret: config.verificationSecret });
  const identifier = new PgPhoneIdentifier(pool, { verificationSecret: config.verificationSecret,
    secret: config.secret, origin: config.origin });
  const capabilities: MemberCapabilities = Object.freeze({ emailOtp: Boolean(config.mail), magicLink: Boolean(config.mail),
    google: Boolean(config.google), passkey: true });
  const auth = createMemberAuth(config, { pool, isActiveMember: (id) => repository.isActiveMember(id),
    sendMail: createMemberMailer(config.mail, config.origin),
    assertPhoneIdentifier: (headers, id) => identifier.assert(headers, id) });
  const toMemberPrincipal = async (request: Request): Promise<MemberPrincipal | null> => {
    const result = await auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } });
    if (!result) return null;
    return { userId: result.user.id, emailVerified: result.user.emailVerified === true,
      sessionCreatedAt: new Date(result.session.createdAt), email: result.user.email, name: result.user.name };
  };
  return { config, auth, pool, repository, service, capabilities, identifier, toMemberPrincipal };
}

type MemberRuntime = ReturnType<typeof createMemberAuthRuntime>;
let current: MemberRuntime | undefined;

export function getMemberAuthRuntime(): MemberRuntime | null {
  const config = loadMemberAuthConfig();
  if (!config) return null;
  current ??= createMemberAuthRuntime(config);
  return current;
}
