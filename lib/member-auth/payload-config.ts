import { loadPhoneVerificationConfig } from "../phone-verification/server/config";
import { loadMemberMailConfig } from "./mail-config";
import type { MemberCapabilities } from "./contracts";

type Environment = Readonly<Record<string, string | undefined>>;
export type PayloadMemberConfig = Readonly<{
  origin: string;
  databaseUrl: string;
  secret: string;
  verificationSecret: string;
  emailDelivery: boolean;
  google: boolean;
}>;

/** Shared public whitelist: provider configuration is not session or storage health. */
export function configuredMemberCapabilities(config: PayloadMemberConfig | null): Readonly<MemberCapabilities> {
  return Object.freeze({
    emailOtp: config?.emailDelivery ?? false,
    magicLink: config?.emailDelivery ?? false,
    google: config?.google ?? false,
    passkey: config !== null
  });
}

/** Local membership uses Payload's database, never a second auth database/issuer. */
export function loadPayloadMemberConfig(env: Environment = process.env): PayloadMemberConfig | null {
  if (!env.MEMBER_AUTH_MODE || env.MEMBER_AUTH_MODE === "disabled") return null;
  try {
    if (env.MEMBER_AUTH_MODE !== "local") throw new Error();
    const verifier = loadPhoneVerificationConfig(env);
    const origin = new URL(env.MEMBER_AUTH_ORIGIN ?? "");
    const database = new URL(env.DATABASE_URI ?? "");
    const secret = env.BETTER_AUTH_SECRET ?? env.PAYLOAD_SECRET ?? "";
    if (!verifier || origin.protocol !== "http:" || origin.hostname !== "localhost"
      || origin.origin !== verifier.origin || origin.pathname !== "/" || origin.search || origin.hash
      || origin.username || origin.password || !origin.port
      || !["postgres:", "postgresql:"].includes(database.protocol)
      || !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)
      || database.search || database.hash || database.href !== verifier.databaseUrl
      || secret.length < 32 || secret === verifier.secret) throw new Error();
    return Object.freeze({ origin: origin.origin, databaseUrl: database.href, secret,
      verificationSecret: verifier.secret, emailDelivery: Boolean(loadMemberMailConfig(env)),
      google: Boolean((env.GOOGLE_CLIENT_ID ?? env.MEMBER_AUTH_GOOGLE_CLIENT_ID)
        && (env.GOOGLE_CLIENT_SECRET ?? env.MEMBER_AUTH_GOOGLE_CLIENT_SECRET)) });
  } catch { throw new Error("Canonical membership requires matching private local database and verification settings."); }
}
