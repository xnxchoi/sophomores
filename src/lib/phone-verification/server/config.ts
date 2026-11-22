import { isIP } from 'node:net';

export interface LocalVerificationConfig {
  readonly transport: 'fixture' | 'zoho-poll';
  readonly origin: string;
  readonly databaseUrl: string;
  readonly secret: string;
  readonly webhookSecret: string;
  readonly recipient: string;
  readonly mailboxId: string;
  readonly zohoUserId: string;
  readonly zohoIntegrationId: string;
}

const PRODUCTION_TLS_MODES = new Set(['require', 'verify-ca', 'verify-full']);
const OWNED_PREVIEW_DATABASE = 'postgresql://preview_owner@localhost/sphmrs_owner_preview?host=%2Ftmp%2Fsphmrs-owner-preview-6lse30ag%2Fsocket&port=55439';
const OWNED_PREVIEW_ORIGIN = 'http://localhost:3000';

/** Used at Node startup and by the verifier before accepting socket parameters. */
export function assertOwnedPreviewSocketAdmission(env: Readonly<Record<string, string | undefined>>): boolean {
  const admission = env.SPHMRS_LOCAL_PREVIEW_SOCKET_ADMITTED;
  if (admission === undefined) {
    for (const value of [env.DATABASE_URI, env.PHONE_VERIFICATION_DATABASE_URL, env.MEMBER_AUTH_DATABASE_URL]) {
      if (!value || !URL.canParse(value)) continue;
      const url = new URL(value);
      if (['postgres:', 'postgresql:'].includes(url.protocol) &&
          url.searchParams.getAll('host').some((host) =>
            host === '/tmp/sphmrs-owner-preview-6lse30ag/socket' ||
            host === '/private/tmp/sphmrs-owner-preview-6lse30ag/socket')) {
        throw new Error('Owned preview socket requires explicit launcher admission.');
      }
    }
    return false;
  }
  if (admission !== '1') throw new Error('Invalid owned preview socket admission flag.');
  if (env.MEMBER_AUTH_ORIGIN !== OWNED_PREVIEW_ORIGIN || env.PHONE_VERIFICATION_ORIGIN !== OWNED_PREVIEW_ORIGIN ||
      env.NEXT_PUBLIC_SERVER_URL !== OWNED_PREVIEW_ORIGIN ||
      [env.BETTER_AUTH_URL, env.NEXT_PUBLIC_BETTER_AUTH_URL]
        .some((origin) => origin !== undefined && origin !== '' && origin !== OWNED_PREVIEW_ORIGIN)) {
    throw new Error('Owned preview socket admission requires only http://localhost:3000 origins.');
  }
  if (env.MEMBER_AUTH_MODE !== 'local' || env.PHONE_VERIFICATION_MODE !== 'local' ||
      env.PHONE_VERIFICATION_TRANSPORT !== 'fixture' ||
      env.DATABASE_URI !== OWNED_PREVIEW_DATABASE || env.PHONE_VERIFICATION_DATABASE_URL !== OWNED_PREVIEW_DATABASE) {
    throw new Error('Owned preview socket admission requires the exact local fixture database profile.');
  }
  return true;
}

/**
 * Production origin: https, an exact public DNS hostname, no port, path, credentials,
 * query or hash. Returns the normalized origin or null.
 */
export function productionOrigin(value: string | undefined): string | null {
  try {
    const url = new URL(value ?? '');
    if (url.protocol !== 'https:' || url.port || url.pathname !== '/' || url.username || url.password
      || url.search || url.hash || !url.hostname.includes('.') || url.hostname.endsWith('.localhost')
      || isIP(url.hostname.replace(/^\[|\]$/g, '')) || url.hostname.startsWith('.') || url.hostname.endsWith('.')) return null;
    return url.origin;
  } catch { return null; }
}

function privateNetworkHost(hostname: string): boolean {
  if (['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return true;
  if (isIP(hostname) === 4) {
    const [first, second] = hostname.split('.').map(Number);
    return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
  }
  // A single-label name is a container-network service name (for example `postgres`).
  return /^[a-z0-9][a-z0-9_-]{0,62}$/.test(hostname);
}

/**
 * Production database: PostgreSQL that either requires TLS through `sslmode`
 * (the only permitted parameter) or is reachable only on a private network.
 */
export function productionDatabaseUrl(value: string | undefined): URL | null {
  try {
    const url = new URL(value ?? '');
    const mode = url.searchParams.get('sslmode');
    const parameters = [...url.searchParams.keys()];
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.hash
      || !/^\/[A-Za-z0-9_-]{1,63}$/.test(url.pathname)
      || (url.search !== '' && !(parameters.length === 1 && mode !== null && PRODUCTION_TLS_MODES.has(mode)))) return null;
    return mode !== null || privateNetworkHost(url.hostname) ? url : null;
  } catch { return null; }
}

/**
 * A configuration failure that names the settings at fault, never their values.
 * The message and the plain Error name stay stable for callers that match them.
 */
export type ConfigurationError = Error & { readonly variables: readonly string[] };
// Only errors made here are trusted to carry names; any other error reports none.
const ownErrors = new WeakSet<Error>();
export function configurationError(message: string, variables: readonly string[]): ConfigurationError {
  const error = Object.assign(new Error(message), { variables: Object.freeze([...variables]) });
  ownErrors.add(error);
  return error;
}
export function configurationVariables(error: unknown): readonly string[] {
  if (!(error instanceof Error) || !ownErrors.has(error)) return [];
  const { variables } = error as ConfigurationError;
  return variables.every((name) => /^[A-Z][A-Z0-9_]*$/.test(name)) ? variables : [];
}

/** Local loopback verifier DB or shared canonical development DB; or the production origin/database. */
export function loadPhoneVerificationConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): LocalVerificationConfig | null {
  const ownedPreview = assertOwnedPreviewSocketAdmission(env);
  if (!env.PHONE_VERIFICATION_MODE || env.PHONE_VERIFICATION_MODE === 'disabled') return null;
  // Names (never values) of the settings under check, reported with the failure.
  let variables: string[] = ['PHONE_VERIFICATION_MODE'];
  try {
    const production = env.PHONE_VERIFICATION_MODE === 'production';
    if (!production && env.PHONE_VERIFICATION_MODE !== 'local') throw new Error();
    variables = ['PHONE_VERIFICATION_TRANSPORT'];
    const transport = env.PHONE_VERIFICATION_TRANSPORT ?? 'fixture';
    if (transport !== 'fixture' && transport !== 'zoho-poll') throw new Error();
    variables = ['PHONE_VERIFICATION_ORIGIN'];
    const origin = production ? new URL(productionOrigin(env.PHONE_VERIFICATION_ORIGIN) ?? '')
      : new URL(env.PHONE_VERIFICATION_ORIGIN ?? '');
    variables = ['PHONE_VERIFICATION_DATABASE_URL'];
    const database = production ? productionDatabaseUrl(env.PHONE_VERIFICATION_DATABASE_URL)
      : new URL(env.PHONE_VERIFICATION_DATABASE_URL ?? '');
    if (!database) throw new Error();
    if (!production) {
      variables = ['MEMBER_AUTH_MODE', 'DATABASE_URI'];
      const canonicalLocalDatabase = env.MEMBER_AUTH_MODE === 'local' && !!env.DATABASE_URI
        && new URL(env.DATABASE_URI).href === database.href;
      variables = ['PHONE_VERIFICATION_ORIGIN'];
      if (origin.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
        || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error();
      variables = ['PHONE_VERIFICATION_DATABASE_URL'];
      if (!['postgres:', 'postgresql:'].includes(database.protocol)
        || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)
        || (!/^\/sophomores_verification_[a-z0-9_]+$/.test(database.pathname) && !canonicalLocalDatabase)
        || (database.search && !ownedPreview) || database.hash) throw new Error();
    }
    const secret = env.PHONE_VERIFICATION_STATE_SECRET ?? '';
    const webhookSecret = env.PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET ?? '';
    const recipient = env.PHONE_VERIFICATION_RECIPIENT ?? '';
    const mailboxId = env.PHONE_VERIFICATION_ZOHO_ACCOUNT_ID ?? '';
    const zohoUserId = env.PHONE_VERIFICATION_ZOHO_USER_ID ?? '';
    const zohoIntegrationId = env.PHONE_VERIFICATION_ZOHO_INTEGRATION_ID ?? '';
    const zohoId = /^[1-9][0-9]{0,29}$/;
    variables = Object.entries({
      PHONE_VERIFICATION_STATE_SECRET: /^[a-f0-9]{64}$/.test(secret),
      PHONE_VERIFICATION_RECIPIENT: /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(recipient),
      PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: zohoId.test(mailboxId),
      ...(transport === 'fixture' ? {
        PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET: webhookSecret.length >= 32 && webhookSecret.length <= 1024 && !/\s/.test(webhookSecret),
        PHONE_VERIFICATION_ZOHO_USER_ID: zohoId.test(zohoUserId),
        PHONE_VERIFICATION_ZOHO_INTEGRATION_ID: zohoId.test(zohoIntegrationId),
      } : {}),
    }).filter(([, valid]) => !valid).map(([name]) => name);
    if (variables.length) throw new Error();
    return Object.freeze({ transport, origin: origin.origin, databaseUrl: database.href, secret,
      webhookSecret: transport === 'fixture' ? webhookSecret : '', recipient, mailboxId,
      zohoUserId: transport === 'fixture' ? zohoUserId : '', zohoIntegrationId: transport === 'fixture' ? zohoIntegrationId : '' });
  } catch { throw configurationError('Invalid local phone verification configuration', variables); }
}
