import { productionCarrierTrust, type CarrierTrustDecision } from "./carriers";
import { parseCarrierMessage, type CarrierMessage } from "./message";

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
  expectedCarrierPolicy?: string;
  authenticateCarrier?: (raw: string, message: CarrierMessage) => Promise<CarrierTrustDecision>;
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
export type WorkerResult =
  | { outcome: "idle" | "completed" | "stale" }
  | { outcome: "retry"; reason?: "invalid-message" };

class InvalidCarrierMessage extends Error {}

async function carrierTrust(ports: WorkerPorts, raw: string, message: CarrierMessage): Promise<CarrierTrustDecision> {
  const denied = productionCarrierTrust(message);
  if (ports.expectedCarrierPolicy !== "local-skt-zoho-arc-v1" || !ports.authenticateCarrier) return denied;
  try {
    const decision = await ports.authenticateCarrier(raw, message);
    return decision?.approved === true && decision.policyVersion === ports.expectedCarrierPolicy ? decision : denied;
  } catch {
    // DNS/signature errors are non-granting review outcomes, never approval.
    return denied;
  }
}

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
      recipient: ports.recipient,
      providerMessageId: lease.messageId
    }).catch((error: unknown) => {
      // Tag only the parser's fixed rejection, never provider/database errors.
      if (error instanceof Error && error.message === "Invalid verification message") throw new InvalidCarrierMessage();
      throw error;
    });
    const trust = await carrierTrust(ports, raw, message);
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
  } catch (error) {
    // Deliberately store no body, phone, token or provider exception. Repository
    // backoff/attempt cap quarantines poison messages and recovers abandoned leases.
    if (!(await ports.repository.failDelivery(fence))) return { outcome: "stale" };
    return error instanceof InvalidCarrierMessage
      ? { outcome: "retry", reason: "invalid-message" }
      : { outcome: "retry" };
  }
}
