import { assertOwnedPreviewSocketAdmission, configurationError, configurationVariables, loadPhoneVerificationConfig, productionDatabaseUrl, productionOrigin } from "../phone-verification/server/config";
import { loadMemberMailConfig } from "./mail-config";
import { enabledSocialProviders, readySocialProviders } from "../auth/social-providers";
import { isReviewEditorProfile } from "../auth/review-editor-policy";
import type { MemberCapabilities } from "./contracts";

type Environment = Readonly<Record<string, string | undefined>>;
export type PayloadMemberConfig = Readonly<{
  origin: string;
  databaseUrl: string;
  secret: string;
  verificationSecret: string;
  emailDelivery: boolean;
  google: boolean;
  apple?: boolean;
  kakao?: boolean;
}>;

/** Shared public whitelist: provider configuration is not session or storage health. */
export function configuredMemberCapabilities(config: PayloadMemberConfig | null): Readonly<MemberCapabilities> {
  return Object.freeze({
    emailOtp: config?.emailDelivery ?? false,
    magicLink: config?.emailDelivery ?? false,
    google: config?.google ?? false,
    apple: config?.apple ?? false,
    kakao: config?.kakao ?? false,
    passkey: config !== null
  });
}

/** Report configured switches only when their local provider initialization succeeds. */
export async function resolveMemberCapabilities(config: PayloadMemberConfig | null,
  ready = readySocialProviders): Promise<Readonly<MemberCapabilities>> {
  const flags = configuredMemberCapabilities(config);
  return flags.apple ? Object.freeze({ ...flags, apple: (await ready()).includes("apple") }) : flags;
}

/** The site URL the canonical Better Auth stack resolves (see `getAppURL` in `src/lib/auth/options.ts`). */
function canonicalSiteUrl(env: Environment): string {
  return (env.NEXT_PUBLIC_SERVER_URL || env.BETTER_AUTH_URL || env.NEXT_PUBLIC_BETTER_AUTH_URL
    || "http://localhost:3000").replace(/\/+$/, "");
}

/** Local membership uses Payload's database, never a second auth database/issuer. */
export function loadPayloadMemberConfig(env: Environment = process.env): PayloadMemberConfig | null {
  if (!env.MEMBER_AUTH_MODE || env.MEMBER_AUTH_MODE === "disabled") {
    assertOwnedPreviewSocketAdmission(env);
    return null;
  }
  // Names (never values) of the settings under check, reported with the failure.
  let variables: readonly string[] = ["MEMBER_AUTH_MODE"];
  try {
    const production = env.MEMBER_AUTH_MODE === "production";
    if (!production && env.MEMBER_AUTH_MODE !== "local") throw new Error();
    let verifier: ReturnType<typeof loadPhoneVerificationConfig>;
    try { verifier = loadPhoneVerificationConfig(env); }
    catch (error) { variables = configurationVariables(error); throw error; }
    variables = ["PHONE_VERIFICATION_MODE"];
    if (!verifier) throw new Error();
    variables = ["MEMBER_AUTH_ORIGIN"];
    const origin = new URL(production ? productionOrigin(env.MEMBER_AUTH_ORIGIN) ?? "" : env.MEMBER_AUTH_ORIGIN ?? "");
    variables = ["DATABASE_URI"];
    const database = production ? productionDatabaseUrl(env.DATABASE_URI) : new URL(env.DATABASE_URI ?? "");
    if (!database) throw new Error();
    variables = ["MEMBER_AUTH_ORIGIN", "PHONE_VERIFICATION_ORIGIN"];
    if (origin.origin !== verifier.origin) throw new Error();
    variables = ["DATABASE_URI", "PHONE_VERIFICATION_DATABASE_URL"];
    if (database.href !== verifier.databaseUrl) throw new Error();
    variables = [env.BETTER_AUTH_SECRET !== undefined ? "BETTER_AUTH_SECRET" : "PAYLOAD_SECRET"];
    const secret = env.BETTER_AUTH_SECRET ?? env.PAYLOAD_SECRET ?? "";
    if (secret.length < 32 || secret === verifier.secret) throw new Error();
    variables = production ? ["PHONE_VERIFICATION_MODE", "NEXT_PUBLIC_SERVER_URL"]
      : ["PHONE_VERIFICATION_MODE", "MEMBER_AUTH_ORIGIN", "DATABASE_URI"];
    if (production) {
      // Better Auth's base URL, trusted origins and passkey relying party come from the site URL.
      if (env.PHONE_VERIFICATION_MODE !== "production" || canonicalSiteUrl(env) !== origin.origin) throw new Error();
    } else if (env.PHONE_VERIFICATION_MODE !== "local" || origin.protocol !== "http:" || origin.hostname !== "localhost"
      || origin.pathname !== "/" || origin.search || origin.hash
      || origin.username || origin.password || !origin.port
      || !["postgres:", "postgresql:"].includes(database.protocol)
      || !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)
      // The matching local verifier above has already validated any socket parameters.
      || database.hash || (database.search && canonicalSiteUrl(env) !== origin.origin)) throw new Error();
    variables = []; // Provider switches have their own diagnostics; fall back to the generic line.
    const providers = isReviewEditorProfile(origin.origin, env) ? [] : enabledSocialProviders(env);
    // The mail loader validates these together and does not say which one failed.
    variables = ["MEMBER_AUTH_MAIL_MODE", "MEMBER_AUTH_SMTP_HOST", "MEMBER_AUTH_SMTP_PORT",
      "MEMBER_AUTH_SMTP_USERNAME", "MEMBER_AUTH_SMTP_PASSWORD", "MEMBER_AUTH_SMTP_FROM"];
    const emailDelivery = Boolean(loadMemberMailConfig(env));
    return Object.freeze({ origin: origin.origin, databaseUrl: database.href, secret,
      verificationSecret: verifier.secret, emailDelivery,
      google: providers.includes("google"), apple: providers.includes("apple"), kakao: providers.includes("kakao") });
  } catch { throw configurationError("Canonical membership requires matching private local database and verification settings.", variables); }
}
