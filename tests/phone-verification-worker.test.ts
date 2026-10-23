import assert from "node:assert/strict";
import test from "node:test";
import {
  processNextZohoDelivery,
  type DeliveryLease
} from "../lib/phone-verification/server/worker";
const lease: DeliveryLease = {
  id: "delivery-1",
  mailboxId: "12345",
  messageId: "1711540357880100001",
  leaseToken: "fence-1",
  attempts: 1,
  receivedAt: new Date("2026-01-01T00:00:00Z")
};
const token = `${"A".repeat(41)}_-`;
const raw = `From: <01012345678@emms.nate.com>\r\nTo: <verify@sophomores.co>\r\nMessage-ID: <synthetic@fixture.invalid>\r\nContent-Type: text/plain\r\n\r\nSPHMRS ${token}`;
function ports() {
  const state = { completed: 0, failed: 0, matches: [] as unknown[] };
  return {
    state,
    repository: {
      claimDelivery: async () => lease,
      completeDelivery: async (fence: unknown) => {
        assert.deepEqual(fence, { id: lease.id, leaseToken: lease.leaseToken });
        state.completed++;
        return true;
      },
      failDelivery: async () => {
        state.failed++;
        return true;
      }
    },
    service: {
      match: async (input: unknown) => {
        state.matches.push(input);
        return { outcome: "matched" as const, state: "review" as const };
      }
    },
    fetchOriginal: async () => raw,
    mailboxId: "12345",
    recipient: "verify@sophomores.co"
  };
}
test("worker consumes durable reference with non-granting policy and lease fence", async () => {
  const p = ports();
  assert.equal((await processNextZohoDelivery(p)).outcome, "completed");
  assert.equal(p.state.completed, 1);
  assert.deepEqual(p.state.matches, [
    {
      mailboxId: lease.mailboxId,
      messageId: lease.messageId,
      phone: "+821012345678",
      token,
      receivedAt: lease.receivedAt,
      approved: false,
      policyVersion: "carrier-ingress-unreviewed-v1",
      deliveryLease: { id: lease.id, leaseToken: lease.leaseToken }
    }
  ]);
});
test("worker retries failures without retaining MIME, tokens, phones or error details", async () => {
  for (const fetchOriginal of [
    async () => {
      throw new Error("sensitive-network-error");
    },
    async () => "invalid MIME"
  ]) {
    const p = ports();
    assert.deepEqual(await processNextZohoDelivery({ ...p, fetchOriginal }), {
      outcome: "retry"
    });
    assert.equal(p.state.failed, 1);
    assert.equal(p.state.completed, 0);
    assert.deepEqual(p.state.matches, []);
  }
});
test("worker safely handles idle, wrong mailbox and lost leases", async () => {
  const p = ports();
  assert.deepEqual(
    await processNextZohoDelivery({
      ...p,
      repository: { ...p.repository, claimDelivery: async () => null }
    }),
    { outcome: "idle" }
  );
  assert.deepEqual(await processNextZohoDelivery({ ...p, mailboxId: "999" }), {
    outcome: "retry"
  });
  assert.equal(p.state.matches.length, 0);
  assert.deepEqual(
    await processNextZohoDelivery({
      ...p,
      repository: { ...p.repository, completeDelivery: async () => false }
    }),
    { outcome: "stale" }
  );
  assert.deepEqual(
    await processNextZohoDelivery({
      ...p,
      fetchOriginal: async () => {
        throw Error();
      },
      repository: { ...p.repository, failDelivery: async () => false }
    }),
    { outcome: "stale" }
  );
});
