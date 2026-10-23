import { Pool } from 'pg';
import { loadPhoneVerificationConfig, type LocalVerificationConfig } from './config';
import { createPhoneVerificationHandlers, verificationUnavailable } from './http';
import { PgPhoneVerificationRepository } from './postgres';
import { PhoneVerificationService } from './service';

export function createLocalVerificationRuntime(config: LocalVerificationConfig) {
  const pool = new Pool({ connectionString: config.databaseUrl, max: 4, connectionTimeoutMillis: 2000,
    statement_timeout: 5000, lock_timeout: 1000, query_timeout: 6000,
    idleTimeoutMillis: 5000, allowExitOnIdle: true });
  // Idle connection errors must be handled without leaking connection strings.
  pool.on('error', () => { console.error('Phone verification storage connection unavailable.'); });
  const repository = new PgPhoneVerificationRepository(pool);
  const service = new PhoneVerificationService(repository, { secret: config.secret, recipient: config.recipient, mailboxId: config.mailboxId });
  const handlers = createPhoneVerificationHandlers({ ...config, service, deliveries: repository });
  return { pool, repository, service, handlers };
}

type Runtime = ReturnType<typeof createLocalVerificationRuntime>;
let runtime: Runtime | undefined;
function localRuntime(): Runtime | null {
  const config = loadPhoneVerificationConfig();
  if (!config) return null;
  runtime ??= createLocalVerificationRuntime(config);
  return runtime;
}

/** Lazy composition: disabled routes do not open DB connections or load secrets at build. */
export async function phoneVerificationResponse(
  operation: 'issue' | 'status' | 'cancel' | 'webhook', request: Request, id = '',
): Promise<Response> {
  try {
    const active = localRuntime();
    if (!active) return verificationUnavailable();
    if (operation === 'status' || operation === 'cancel') return await active.handlers[operation](request, id);
    return await active.handlers[operation](request);
  } catch { return verificationUnavailable(); }
}
