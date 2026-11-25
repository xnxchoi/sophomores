import { createPrivateKey } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";
import type { BetterAuthOptions } from "better-auth";

type Environment = Readonly<Record<string, string | undefined>>;
import type { MemberSocialProvider } from "../member-auth/contracts";
type ProviderOptions = NonNullable<BetterAuthOptions["socialProviders"]>;
type Options<K extends MemberSocialProvider> = Exclude<
  NonNullable<ProviderOptions[K]>,
  (...args: never[]) => unknown
>;
/**
 * Google and Kakao are plain options. Apple is Better Auth's lazy form, awaited once
 * at startup so its first client secret is signed before any sign-in starts.
 */
type MemberProviderOptions = {
  google?: Options<"google">;
  kakao?: Options<"kakao">;
  apple?: () => Promise<Options<"apple">>;
};

/** Apple answers the callback with a cross-site form_post from this origin. */
const APPLE_FORM_POST_ORIGIN = "https://appleid.apple.com";
export const APPLE_CALLBACK_PATH = "/api/auth/callback/apple";
/**
 * Apple's client secret lives a day, well under Apple's six-month limit. It is
 * re-signed in the background once half its life has passed, and an hourly
 * check covers a process that sits idle.
 */
const APPLE_SECRET_SECONDS = 24 * 3600;
const APPLE_SECRET_REFRESH_SECONDS = 12 * 3600;
const APPLE_SECRET_CHECK_MS = 3600_000;

type AppleKey = { clientId: string; teamId: string; keyId: string; pem: string };
type ImportKey = (pem: string, alg: string) => Promise<CryptoKey | Uint8Array>;

/**
 * Sign in with Apple's own names. APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY
 * belong to Apple Music and are never read here. The private key is the .p8
 * contents, \n-escaped in the env. Apple is on only when all four are set and the
 * key is a P-256 key in PKCS #8, the only form jose's importPKCS8 accepts (a SEC1
 * "BEGIN EC PRIVATE KEY" parses in Node but not in jose), so a broken key never
 * offers a broken button. jose itself checks the key again at startup.
 */
function appleKey(env: Environment): AppleKey | null {
  const clientId = env.MEMBER_AUTH_APPLE_CLIENT_ID;
  const teamId = env.MEMBER_AUTH_APPLE_TEAM_ID;
  const keyId = env.MEMBER_AUTH_APPLE_KEY_ID;
  const pem = env.MEMBER_AUTH_APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientId || !teamId || !keyId || !pem) return null;
  // PKCS #8's PEM label; written with -{5} so it isn't mistaken for a key block.
  if (!/^-{5}BEGIN PRIVATE KEY-{5}\n[\s\S]+\n-{5}END PRIVATE KEY-{5}$/.test(pem.trim())) return null;
  try {
    const key = createPrivateKey(pem);
    if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1") return null;
    return { clientId, teamId, keyId, pem };
  } catch {
    return null;
  }
}

/**
 * Better Auth reads `clientSecret` as a plain string on each token exchange, so the
 * secret is held here: `ready()` signs the first one (awaited by Better Auth's lazy
 * provider options at startup), and `current()` returns the cached token, starting a
 * background re-sign with jose once half its life has passed. The key is never logged.
 */
function appleClientSecret(
  { clientId, teamId, keyId, pem }: AppleKey,
  now: () => number,
  importKey: ImportKey
) {
  let cached: { token: string; expiresAt: number } | null = null;
  let pending: Promise<void> | null = null;
  let key: ReturnType<ImportKey> | undefined;
  const mint = () => pending ??= (async () => {
    const issuedAt = Math.floor(now() / 1000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: keyId })
      .setIssuer(teamId)
      .setSubject(clientId)
      .setAudience(APPLE_FORM_POST_ORIGIN)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + APPLE_SECRET_SECONDS)
      .sign(await (key ??= importKey(pem, "ES256")));
    cached = { token, expiresAt: issuedAt + APPLE_SECRET_SECONDS };
  })().finally(() => { pending = null; });
  const current = () => {
    if (!cached || cached.expiresAt - Math.floor(now() / 1000) <= APPLE_SECRET_REFRESH_SECONDS)
      void mint().catch(() => console.error("Apple client secret could not be signed."));
    return cached && cached.expiresAt > Math.floor(now() / 1000) ? cached.token : "";
  };
  return { ready: () => cached && cached.expiresAt > Math.floor(now() / 1000) ? Promise.resolve() : mint(), current };
}

function credentials(
  env: Environment,
  provider: "google" | "kakao"
): { clientId: string; clientSecret: string } | null {
  const pair =
    provider === "google"
      ? // The unprefixed names predate member auth and stay accepted.
        [
          env.GOOGLE_CLIENT_ID || env.MEMBER_AUTH_GOOGLE_CLIENT_ID,
          env.GOOGLE_CLIENT_SECRET || env.MEMBER_AUTH_GOOGLE_CLIENT_SECRET
        ]
      : [
            env.MEMBER_AUTH_KAKAO_CLIENT_ID,
            env.MEMBER_AUTH_KAKAO_CLIENT_SECRET
          ];
  const [clientId, clientSecret] = pair;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/**
 * Syntactically configured providers, distinct from runtime readiness.
 * A provider needs its credentials; Kakao also waits for its explicit
 * switch until Kakao's business review passes (owner, 2026-11-16).
 */
export function enabledSocialProviders(
  env: Environment = process.env
): MemberSocialProvider[] {
  return (["apple", "google", "kakao"] as const).filter(
    (provider) =>
      provider === "apple"
        ? appleKey(env) !== null
        : credentials(env, provider) !== null &&
          (provider !== "kakao" || env.MEMBER_AUTH_KAKAO_ENABLED === "true")
  );
}

const appleOptions = new WeakMap<Environment, NonNullable<MemberProviderOptions["apple"]>>();

function lazyAppleOptions(env: Environment, clock: { now: () => number }, importKey: ImportKey) {
  let initialized: Promise<Options<"apple">> | undefined;
  let secret: ReturnType<typeof appleClientSecret> | undefined;
  const disabled = { clientId: "", clientSecret: "", enabled: false } as Options<"apple">;
  return async () => {
    initialized ??= (async () => {
      const key = appleKey(env);
      if (!key) return disabled;
      const candidate = appleClientSecret(key, clock.now, importKey);
      try {
        await candidate.ready();
      } catch {
        console.error("Apple sign-in is off: its client secret could not be signed.");
        return disabled;
      }
      secret = candidate;
      const check = setInterval(candidate.current, APPLE_SECRET_CHECK_MS);
      check.unref();
      const options = { clientId: key.clientId, disableIdTokenSignIn: true, requireEmailVerification: true } as Options<"apple">;
      Object.defineProperty(options, "clientSecret", { get: candidate.current, enumerable: true });
      return options;
    })();
    const options = await initialized;
    try { await secret?.ready(); } catch { return disabled; }
    return options;
  };
}

/** Better Auth and capability projection share the same lazy Apple initialization. */
export function memberSocialProviders(
  env: Environment = process.env,
  clock?: { now: () => number },
  importKey?: ImportKey
): MemberProviderOptions {
  const shared = {
    disableIdTokenSignIn: true,
    requireEmailVerification: true
  } as const;
  const providers: MemberProviderOptions = {};
  if (env.MEMBER_AUTH_APPLE_CLIENT_ID && env.MEMBER_AUTH_APPLE_TEAM_ID
    && env.MEMBER_AUTH_APPLE_KEY_ID && env.MEMBER_AUTH_APPLE_PRIVATE_KEY) {
    const cached = clock || importKey ? undefined : appleOptions.get(env);
    providers.apple = cached ?? lazyAppleOptions(env, clock ?? { now: Date.now }, importKey ?? importPKCS8);
    if (!cached && !clock && !importKey) appleOptions.set(env, providers.apple);
  }
  for (const provider of ["google", "kakao"] as const) {
    if (provider === "kakao" && env.MEMBER_AUTH_KAKAO_ENABLED !== "true") continue;
    const secret = credentials(env, provider);
    if (!secret) continue;
    if (provider === "google")
      providers.google = {
        ...secret,
        ...shared,
        scope: ["openid", "email", "profile"],
        includeGrantedScopes: false,
        accessType: "online"
      };
    if (provider === "kakao")
      providers.kakao = {
        ...secret,
        ...shared,
        disableDefaultScope: true,
        scope: ["account_email", "profile_nickname"]
      };
  }
  return providers;
}

/** Only providers that can actually start sign-in, without loading Payload or calling providers. */
export async function readySocialProviders(providers = memberSocialProviders()): Promise<MemberSocialProvider[]> {
  const apple = await providers.apple?.();
  return [
    ...(apple?.enabled !== false && apple?.clientSecret ? ["apple" as const] : []),
    ...(providers.google ? ["google" as const] : []),
    ...(providers.kakao ? ["kakao" as const] : []),
  ];
}

/** Trust the Apple origin only on the cross-site Apple form POST and while Apple is ready. */
export function memberTrustedOrigins(origin: string, providers = memberSocialProviders()) {
  if (!providers.apple) return [origin];
  return async (request?: Request) =>
    request?.method === "POST" && new URL(request.url).pathname === APPLE_CALLBACK_PATH
      && (await readySocialProviders(providers)).includes("apple")
      ? [origin, APPLE_FORM_POST_ORIGIN]
      : [origin];
}
