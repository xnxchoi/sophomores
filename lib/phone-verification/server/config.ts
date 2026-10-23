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

/** This slice cannot be enabled against a public host or an existing production DB. */
export function loadPhoneVerificationConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): LocalVerificationConfig | null {
  if (!env.PHONE_VERIFICATION_MODE || env.PHONE_VERIFICATION_MODE === 'disabled') return null;
  try {
    if (env.PHONE_VERIFICATION_MODE !== 'local') throw new Error();
    const transport = env.PHONE_VERIFICATION_TRANSPORT ?? 'fixture';
    if (transport !== 'fixture' && transport !== 'zoho-poll') throw new Error();
    const origin = new URL(env.PHONE_VERIFICATION_ORIGIN ?? '');
    const database = new URL(env.PHONE_VERIFICATION_DATABASE_URL ?? '');
    if (origin.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
      || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error();
    if (!['postgres:', 'postgresql:'].includes(database.protocol)
      || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)
      || !/^\/sophomores_verification_[a-z0-9_]+$/.test(database.pathname)
      || database.search || database.hash) throw new Error();
    const secret = env.PHONE_VERIFICATION_STATE_SECRET ?? '';
    const webhookSecret = env.PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET ?? '';
    const recipient = env.PHONE_VERIFICATION_RECIPIENT ?? '';
    const mailboxId = env.PHONE_VERIFICATION_ZOHO_ACCOUNT_ID ?? '';
    const zohoUserId = env.PHONE_VERIFICATION_ZOHO_USER_ID ?? '';
    const zohoIntegrationId = env.PHONE_VERIFICATION_ZOHO_INTEGRATION_ID ?? '';
    if (!/^[a-f0-9]{64}$/.test(secret) || !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/.test(recipient)
      || !/^[1-9][0-9]{0,29}$/.test(mailboxId)) throw new Error();
    if (transport === 'fixture' && (webhookSecret.length < 32 || webhookSecret.length > 1024
      || /\s/.test(webhookSecret) || ![zohoUserId, zohoIntegrationId].every((id) => /^[1-9][0-9]{0,29}$/.test(id)))) throw new Error();
    return Object.freeze({ transport, origin: origin.origin, databaseUrl: database.href, secret,
      webhookSecret: transport === 'fixture' ? webhookSecret : '', recipient, mailboxId,
      zohoUserId: transport === 'fixture' ? zohoUserId : '', zohoIntegrationId: transport === 'fixture' ? zohoIntegrationId : '' });
  } catch { throw new Error('Invalid local phone verification configuration'); }
}
