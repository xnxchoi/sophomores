import { productionCarrierTrust } from "./carriers";
import { parseCarrierMessage } from "./message";

export type DeliveryLease = {
  id: string;
  mailboxId: string;
  messageId: string;
  leaseToken: string;
  attempts: number;
  receivedAt: Date;
};
type Fence = Pick<DeliveryLease, "id" | "leaseToken">;
type WorkerPorts = {
  mailboxId: string;
  recipient: string;
  fetchOriginal: (messageId: string) => Promise<string>;
  repository: {
    claimDelivery: (
      now?: Date,
      leaseMs?: number
    ) => Promise<DeliveryLease | null>;
    completeDelivery: (fence: Fence, now?: Date) => Promise<boolean>;
    failDelivery: (fence: Fence, now?: Date) => Promise<boolean>;
  };
  service: {
    match: (input: {
      mailboxId: string;
      messageId: string;
      phone: string;
      token: string;
      receivedAt: Date;
      approved: boolean;
      policyVersion: string;
      deliveryLease: Fence;
    }) => Promise<{
      outcome: "matched" | "ignored" | "duplicate";
      state?: "review" | "verified";
    }>;
  };
};
export type WorkerResult = {
  outcome: "idle" | "completed" | "retry" | "stale";
};

/** Explicit one-shot worker: callers run a bounded CLI job, never a Next timer. */
export async function processNextZohoDelivery(
  ports: WorkerPorts
): Promise<WorkerResult> {
  const lease = await ports.repository.claimDelivery();
  if (!lease) return { outcome: "idle" };
  const fence = { id: lease.id, leaseToken: lease.leaseToken };
  try {
    if (
      lease.mailboxId !== ports.mailboxId ||
      !Number.isFinite(lease.receivedAt.getTime())
    )
      throw new Error("Invalid delivery reference");
    const raw = await ports.fetchOriginal(lease.messageId);
    const message = await parseCarrierMessage(raw, {
      recipient: ports.recipient
    });
    const trust = productionCarrierTrust(message);
    // The service checks the lease fence in the SAME transaction as matching,
    // preventing a late/crashed worker from changing challenges after takeover.
    await ports.service.match({
      mailboxId: lease.mailboxId,
      messageId: lease.messageId,
      phone: message.phone,
      token: message.token,
      receivedAt: lease.receivedAt,
      approved: trust.approved,
      policyVersion: trust.policyVersion,
      deliveryLease: fence
    });
    return {
      outcome: (await ports.repository.completeDelivery(fence))
        ? "completed"
        : "stale"
    };
  } catch {
    // Deliberately store no body, phone, token or provider exception. Repository
    // backoff/attempt cap quarantines poison messages and recovers abandoned leases.
    return {
      outcome: (await ports.repository.failDelivery(fence)) ? "retry" : "stale"
    };
  }
}
