import assert from "node:assert/strict";
import test from "node:test";
import { pollZohoOnce } from "../../lib/phone-verification/server/poller";
import type { DeliveryRef } from "../../lib/phone-verification/server/contracts";

const delivery: DeliveryRef = {
  mailboxId: "123",
  messageId: "456",
  receivedAt: new Date(1700000100000)
};
test("poll gathers all bounded pages before enqueueing refs, then processes and stops at idle", async () => {
  const events: string[] = [];
  let processed = 0;
  const result = await pollZohoOnce({
    searchPage: async ({ start, limit }) => {
      events.push(`search:${start}:${limit}`);
      return { deliveries: [delivery], pageFull: start === 1 };
    },
    repository: {
      enqueueDelivery: async (ref) => {
        events.push("enqueue");
        assert.equal(ref, delivery);
        return true;
      }
    },
    processNext: async (allowedMessageIds) => {
      events.push("process");
      assert.deepEqual([...allowedMessageIds], [delivery.messageId]);
      return { outcome: processed++ === 0 ? "completed" : "idle" };
    }
  });
  assert.deepEqual(events, [
    "search:1:20",
    "search:21:20",
    "enqueue",
    "enqueue",
    "process",
    "process"
  ]);
  assert.deepEqual(result, { scannedPages: 2, enqueued: 2, completed: 1, invalidMessages: 0 });
});
test("full third page or search failure enqueue nothing and run no worker", async () => {
  for (const searchError of [false, true]) {
    let pages = 0,
      enqueues = 0,
      workers = 0;
    await assert.rejects(
      pollZohoOnce({
        searchPage: async () => {
          pages++;
          if (searchError && pages === 2) throw new Error("private metadata");
          return { deliveries: [delivery], pageFull: true };
        },
        repository: {
          enqueueDelivery: async () => {
            enqueues++;
            return true;
          }
        },
        processNext: async () => {
          workers++;
          return { outcome: "idle" };
        }
      }),
      /^Error: Zoho poll failed$/
    );
    assert.equal(pages, searchError ? 2 : 3);
    assert.equal(enqueues, 0);
    assert.equal(workers, 0);
  }
});
test("DB enqueue failure stops processing and is sanitized", async () => {
  let workers = 0;
  await assert.rejects(
    pollZohoOnce({
      searchPage: async () => ({ deliveries: [delivery], pageFull: false }),
      repository: {
        enqueueDelivery: async () => {
          throw new Error("secret database URL");
        }
      },
      processNext: async () => {
        workers++;
        return { outcome: "idle" };
      }
    }),
    /^Error: Zoho poll failed$/
  );
  assert.equal(workers, 0);
});
test("retry or stale stops immediately and does not imply a successful poll", async () => {
  for (const outcome of ["retry", "stale"] as const) {
    let calls = 0;
    await assert.rejects(
      pollZohoOnce({
        searchPage: async () => ({ deliveries: [], pageFull: false }),
        repository: { enqueueDelivery: async () => true },
        processNext: async () => {
          calls++;
          return { outcome };
        }
      }),
      /Zoho poll failed/
    );
    assert.equal(calls, 1);
  }
});
test("process at most ten jobs, including existing jobs when metadata scan is empty", async () => {
  let calls = 0;
  const result = await pollZohoOnce({
    searchPage: async () => ({ deliveries: [], pageFull: false }),
    repository: { enqueueDelivery: async () => true },
    processNext: async () => {
      calls++;
      return { outcome: "completed" };
    }
  });
  assert.equal(calls, 10);
  assert.equal(result.completed, 10);
});
test("overlapping duplicate scans after restart use durable repository dedupe", async () => {
  const seen = new Set<string>();
  let enqueues = 0;
  const ports = {
    searchPage: async () => ({ deliveries: [delivery], pageFull: false }),
    repository: {
      enqueueDelivery: async (ref: DeliveryRef) => {
        enqueues++;
        const key = `${ref.mailboxId}/${ref.messageId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }
    },
    processNext: async () => ({ outcome: "idle" as const })
  };
  assert.equal((await pollZohoOnce(ports)).enqueued, 1);
  assert.equal((await pollZohoOnce({ ...ports })).enqueued, 0);
  assert.equal(enqueues, 2);
  assert.equal(seen.size, 1);
});
