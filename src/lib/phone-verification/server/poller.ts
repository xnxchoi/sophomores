import type { DeliveryRef } from "./contracts";
import type { WorkerResult } from "./worker";
import type { ZohoVerificationPage } from "./zoho";

type PollPorts = {
  searchPage: (page: {
    start: number;
    limit: number;
  }) => Promise<ZohoVerificationPage>;
  repository: { enqueueDelivery: (reference: DeliveryRef) => Promise<boolean> };
  processNext: (
    allowedMessageIds: ReadonlySet<string>
  ) => Promise<WorkerResult>;
};
export type ZohoPollResult = {
  scannedPages: number;
  enqueued: number;
  completed: number;
  invalidMessages: number;
};

/** Bounded one-shot scan. No cursor: overlapping retries use durable inbox dedupe. */
export async function pollZohoOnce(ports: PollPorts): Promise<ZohoPollResult> {
  try {
    let deliveries: DeliveryRef[] = [];
    let scannedPages = 0;
    for (let page = 0; page < 3; page++) {
      const result = await ports.searchPage({
        start: page * 20 + 1,
        limit: 20
      });
      scannedPages++;
      deliveries = [...deliveries, ...result.deliveries];
      if (!result.pageFull) break;
      // Gather the whole bounded scan first. A saturated window cannot silently
      // skip older deliveries, enqueue partial results or appear successful.
      if (page === 2) throw new Error("Saturated metadata window");
    }
    let enqueued = 0;
    for (const delivery of deliveries)
      if (await ports.repository.enqueueDelivery(delivery)) enqueued++;
    let completed = 0;
    let invalidMessages = 0;
    const allowedMessageIds = new Set(deliveries.map((ref) => ref.messageId));
    for (let job = 0; job < 10; job++) {
      const result = await ports.processNext(allowedMessageIds);
      if (result.outcome === "idle") break;
      if (result.outcome === "retry" && result.reason === "invalid-message") {
        invalidMessages++;
        continue;
      }
      if (result.outcome !== "completed")
        throw new Error("Worker did not complete");
      completed++;
    }
    return { scannedPages, enqueued, completed, invalidMessages };
  } catch {
    // Provider/database errors can contain tokens, sender numbers and message
    // contents; only this fixed diagnostic may cross the CLI boundary.
    throw new Error("Zoho poll failed");
  }
}
