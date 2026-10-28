import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pollZohoOnce } from '../../lib/phone-verification/server/poller';
import { processNextZohoDelivery } from '../../lib/phone-verification/server/worker';

const delivery = { mailboxId: '123', messageId: '456', receivedAt: new Date(1700000100000) };
const token = 'A'.repeat(43);
const raw = `From: 01012345678@emms.nate.com\r\nTo: verify@example.invalid\r\nMessage-ID: <carrier>\r\nSubject: MMS\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nSPHMRS ${token}`;
const malformed = raw.replace(`SPHMRS ${token}`, 'wrong-body');
function workerPorts(original = malformed) {
  const state = { matched: 0, completed: 0, failed: 0 };
  return {
    state, mailboxId: '123', recipient: 'verify@example.invalid',
    repository: {
      claimDelivery: async () => ({ ...delivery, id: 'lease', leaseToken: 'fence', attempts: 1 }),
      failDelivery: async (fence: { id: string; leaseToken: string }) => {
        assert.deepEqual(fence, { id: 'lease', leaseToken: 'fence' }); state.failed++; return true;
      },
      completeDelivery: async () => { state.completed++; return true; },
    },
    fetchOriginal: async () => original,
    service: { match: async () => { state.matched++; return { outcome: 'matched' as const }; } },
  };
}
test('malformed MMS gets a safe disposition after fenced backoff without authentication or matching', async () => {
  const ports = workerPorts(); let authenticated = false;
  assert.deepEqual(await processNextZohoDelivery({ ...ports, expectedCarrierPolicy: 'local-skt-zoho-arc-v1',
    authenticateCarrier: async () => { authenticated = true; throw new Error('must not authenticate'); },
  }), { outcome: 'retry', reason: 'invalid-message' });
  assert.equal(authenticated, false);
  assert.deepEqual(ports.state, { matched: 0, completed: 0, failed: 1 });
});
test('provider errors cannot impersonate parser rejection and stale/failed backoff remains fatal', async () => {
  const ports = workerPorts(raw);
  assert.deepEqual(await processNextZohoDelivery({ ...ports,
    fetchOriginal: async () => { throw new Error('Invalid verification message'); },
  }), { outcome: 'retry' });
  const invalid = workerPorts();
  assert.deepEqual(await processNextZohoDelivery({ ...invalid,
    repository: { ...invalid.repository, failDelivery: async () => false },
  }), { outcome: 'stale' });
  await assert.rejects(processNextZohoDelivery({ ...invalid,
    repository: { ...invalid.repository, failDelivery: async () => { throw new Error('database failed'); } },
  }));
  assert.equal(invalid.state.matched, 0);
});
test('malformed-first then valid MMS both receive dispositions in the same bounded scan', async () => {
  const refs = [delivery, { ...delivery, messageId: '457' }];
  const leases = refs.map((ref) => ({ ...ref, id: `lease-${ref.messageId}`, leaseToken: `fence-${ref.messageId}`, attempts: 1 }));
  const failed: string[] = []; const completed: string[] = []; const matches: unknown[] = [];
  const result = await pollZohoOnce({
    searchPage: async () => ({ deliveries: refs, pageFull: false }),
    repository: { enqueueDelivery: async () => true },
    processNext: (allowed) => processNextZohoDelivery({
      mailboxId: '123', recipient: 'verify@example.invalid',
      repository: {
        claimDelivery: async () => leases.shift() ?? null,
        failDelivery: async (fence) => { failed.push(fence.id); return true; },
        completeDelivery: async (fence) => { completed.push(fence.id); return true; },
      },
      fetchOriginal: async (id) => { assert.equal(allowed.has(id), true); return id === '456' ? malformed : raw; },
      service: { match: async (message) => { matches.push(message); return { outcome: 'matched' }; } },
    }),
  });
  assert.deepEqual(result, { scannedPages: 1, enqueued: 2, completed: 1, invalidMessages: 1 });
  assert.deepEqual(failed, ['lease-456']); assert.deepEqual(completed, ['lease-457']);
  assert.equal(matches.length, 1);
  assert.equal((matches[0] as { approved: boolean }).approved, false);
  assert.equal((matches[0] as { messageId: string }).messageId, '457');
});
test('invalid MMS consumes the unchanged ten-job budget and provider/stale failures still stop', async () => {
  let jobs = 0;
  const ports = {
    searchPage: async () => ({ deliveries: [delivery], pageFull: false }),
    repository: { enqueueDelivery: async () => true },
  };
  const result = await pollZohoOnce({ ...ports, processNext: async () => {
    jobs++; return { outcome: 'retry', reason: 'invalid-message' };
  } });
  assert.equal(jobs, 10); assert.equal(result.invalidMessages, 10); assert.equal(result.completed, 0);
  for (const outcome of ['retry', 'stale'] as const) {
    await assert.rejects(pollZohoOnce({ ...ports, processNext: async () => ({ outcome }) }), /^Error: Zoho poll failed$/);
  }
});
