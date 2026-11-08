import { createHmac } from 'node:crypto';
import { loadPhoneVerificationConfig } from '@/lib/phone-verification/server/config';
import { createLocalVerificationRuntime } from '@/lib/phone-verification/server/runtime';
import { processNextZohoDelivery } from '@/lib/phone-verification/server/worker';
import { buildLocalFixtureMessage } from './phone-verification-fixture';

/** Isolated local operations only: no Zoho network requests, enrollment, or real grants. */
async function main() {
  const config = loadPhoneVerificationConfig();
  if (!config) throw new Error('Local phone verification must be explicitly configured.');
  const [command, flag, token, ...extra] = process.argv.slice(2);
  if (!['migrate', 'cleanup', 'fixture'].includes(command) || extra.length
    || (command !== 'fixture' && (flag || token))
    || (command === 'fixture' && (flag !== '--token' || !/^[A-Za-z0-9_-]{43}$/.test(token ?? '')))) {
    throw new Error('Usage: phone-verification-local.ts migrate|cleanup|fixture --token <local-challenge-token>');
  }
  const active = createLocalVerificationRuntime(config);
  try {
    if (command === 'migrate') { await active.repository.migrate(); console.log('Local verification schema migrated.'); return; }
    if (command === 'cleanup') { await active.repository.cleanup(); console.log('Bounded local verification cleanup completed.'); return; }
    const messageId = (BigInt(Date.now()) * 1_000_000n).toString();
    const body = JSON.stringify({ messageId, receivedTime: Date.now().toString(), zuid: config.zohoUserId, IntegIdList: config.zohoIntegrationId + ',' });
    const response = await fetch(new URL('/api/phone-verification/webhook', config.origin), {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000), body,
      headers: { 'Content-Type': 'application/json', 'X-Hook-Signature': createHmac('sha256', config.webhookSecret).update(body).digest('base64') },
    });
    if (response.status !== 200) throw new Error('Local fixture notification was not accepted.');
    await response.body?.cancel();
    const original = buildLocalFixtureMessage({ token, recipient: config.recipient, messageId });
    for (let index = 0; index < 10; index++) {
      let processedOwn = false;
      const result = await processNextZohoDelivery({
        mailboxId: config.mailboxId, recipient: config.recipient,
        repository: active.repository, service: active.service,
        fetchOriginal: async (requestedId) => {
          if (requestedId !== messageId) throw new Error('Fixture does not match delivery reference');
          processedOwn = true;
          return original;
        },
      });
      if (processedOwn) {
        if (result.outcome !== 'completed') throw new Error('Fixture processing did not complete.');
        console.log('Local synthetic delivery processed; carrier grants remain disabled.');
        return;
      }
    }
    throw new Error('Fixture was not processed within the local queue budget.');
  } finally { await active.pool.end(); }
}
main().catch(() => { console.error('Local verification operation failed. Check configuration and local service readiness.'); process.exitCode = 1; });
