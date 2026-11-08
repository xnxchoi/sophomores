import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadPhoneVerificationConfig } from '@/lib/phone-verification/server/config';
import { createLocalVerificationRuntime } from '@/lib/phone-verification/server/runtime';

test('runtime bounds connection acquisition, PostgreSQL locks and statement execution', async () => {
  const config = loadPhoneVerificationConfig({
    PHONE_VERIFICATION_MODE: 'local', PHONE_VERIFICATION_TRANSPORT: 'zoho-poll',
    PHONE_VERIFICATION_ORIGIN: 'http://127.0.0.1:3217',
    PHONE_VERIFICATION_DATABASE_URL: 'postgres://synthetic@127.0.0.1:5432/sophomores_verification_test',
    PHONE_VERIFICATION_STATE_SECRET: 'a'.repeat(64), PHONE_VERIFICATION_RECIPIENT: 'verify@sophomores.co',
    PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: '123456789',
  })!;
  const runtime = createLocalVerificationRuntime(config);
  try {
    assert.equal(runtime.pool.options.connectionTimeoutMillis, 2000);
    assert.equal(runtime.pool.options.statement_timeout, 5000);
    assert.equal(runtime.pool.options.lock_timeout, 1000);
    assert.equal(runtime.pool.options.query_timeout, 6000);
  } finally { await runtime.pool.end(); }
});
