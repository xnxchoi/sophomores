import { loadPhoneVerificationConfig, productionDatabaseUrl, productionOrigin } from "../phone-verification/server/config";
import { loadMemberMailConfig, type MemberMailConfig } from "./mail-config";

type Environment = Readonly<Record<string, string | undefined>>;
export type MemberAuthConfig = Readonly<{
  mode: "local" | "production";
  origin: string;
  databaseUrl: string;
  secret: string;
  verificationSecret: string;
  rpId: string;
  google: Readonly<{ clientId: string; clientSecret: string }> | null;
  mail: MemberMailConfig | null;
}>;

const invalid = () => new Error("Member authentication needs a valid private local configuration.");

function googleConfig(env: Environment): MemberAuthConfig["google"] {
  const clientId = env.MEMBER_AUTH_GOOGLE_CLIENT_ID;
  const clientSecret = env.MEMBER_AUTH_GOOGLE_CLIENT_SECRET;
  if (clientId === undefined && clientSecret === undefined) return null;
  if (!clientId || !/^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/.test(clientId)
    || !clientSecret || !/^[A-Za-z0-9_-]{16,512}$/.test(clientSecret)) throw invalid();
  return Object.freeze({ clientId, clientSecret });
}

/** Explicit enrollment: loopback `local`, or the single configured https `production` origin. */
export function loadMemberAuthConfig(env: Environment = process.env): MemberAuthConfig | null {
  if (!env || typeof env !== "object" || Array.isArray(env)) throw invalid();
  if (!env.MEMBER_AUTH_MODE || env.MEMBER_AUTH_MODE === "disabled") return null;
  try {
    const mode = env.MEMBER_AUTH_MODE;
    if (mode !== "local" && mode !== "production") throw invalid();
    const verifier = loadPhoneVerificationConfig(env);
    const secret = env.MEMBER_AUTH_SECRET ?? "";
    if (mode === "production") {
      const origin = new URL(productionOrigin(env.MEMBER_AUTH_ORIGIN) ?? "");
      const database = productionDatabaseUrl(env.MEMBER_AUTH_DATABASE_URL);
      if (!verifier || env.PHONE_VERIFICATION_MODE !== "production" || !database
        || origin.origin !== verifier.origin || database.href !== verifier.databaseUrl
        || !/^[a-f0-9]{64}$/.test(secret) || secret === verifier.secret) throw invalid();
      return Object.freeze({ mode, origin: origin.origin, databaseUrl: database.href,
        secret, verificationSecret: verifier.secret, rpId: origin.hostname,
        google: googleConfig(env), mail: loadMemberMailConfig(env) });
    }
    const origin = new URL(env.MEMBER_AUTH_ORIGIN ?? "");
    const database = new URL(env.MEMBER_AUTH_DATABASE_URL ?? "");
    if (!verifier || env.PHONE_VERIFICATION_MODE !== "local" || origin.protocol !== "http:" || origin.hostname !== "localhost"
      || !origin.port || Number(origin.port) < 1024 || origin.pathname !== "/"
      || origin.username || origin.password || origin.search || origin.hash
      || origin.origin !== verifier.origin || database.href !== verifier.databaseUrl
      || !/^[a-f0-9]{64}$/.test(secret) || secret === verifier.secret) throw invalid();
    return Object.freeze({ mode, origin: origin.origin, databaseUrl: database.href,
      secret, verificationSecret: verifier.secret, rpId: "localhost",
      google: googleConfig(env), mail: loadMemberMailConfig(env) });
  } catch { throw invalid(); }
}
