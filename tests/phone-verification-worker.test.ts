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
test("worker accepts only an explicitly selected authenticated policy and preserves the lease fence", async () => {
  const p = ports();
  const policyVersion = "local-skt-zoho-arc-v1";
  assert.deepEqual(await processNextZohoDelivery({
    ...p,
    expectedCarrierPolicy: policyVersion,
    authenticateCarrier: async (original, message) => {
      assert.equal(original, raw);
      assert.equal(message.phone, "+821012345678");
      return { approved: true, policyVersion, reason: "authenticated" };
    }
  }), { outcome: "completed" });
  assert.deepEqual(p.state.matches, [{
    mailboxId: lease.mailboxId, messageId: lease.messageId,
    phone: "+821012345678", token, receivedAt: lease.receivedAt,
    approved: true, policyVersion,
    deliveryLease: { id: lease.id, leaseToken: lease.leaseToken }
  }]);
});
test("worker cannot approve from a policy flag without an authenticator", async () => {
  const p = ports();
  await processNextZohoDelivery({ ...p, expectedCarrierPolicy: "local-skt-zoho-arc-v1" });
  assert.equal((p.state.matches[0] as { approved: boolean }).approved, false);
});
test("worker rejects missing, empty or unrecognized policy even with a positive authenticator", async () => {
  for (const expectedCarrierPolicy of [undefined, "", "other-policy"]) {
    const p = ports();
    let authenticated = false;
    await processNextZohoDelivery({
      ...p, expectedCarrierPolicy,
      authenticateCarrier: async () => {
        authenticated = true;
        return { approved: true, policyVersion: "local-skt-zoho-arc-v1", reason: "synthetic" };
      }
    });
    assert.equal(authenticated, false);
    assert.equal((p.state.matches[0] as { approved: boolean }).approved, false);
  }
});
test("worker routes rejected, mismatched, malformed and failed authentication into review", async () => {
  const policyVersion = "local-skt-zoho-arc-v1";
  for (const authenticateCarrier of [
    async () => ({ approved: false, policyVersion, reason: "not-authenticated" }),
    async () => ({ approved: true, policyVersion: "", reason: "no-policy" }),
    async () => ({ approved: true, policyVersion: "other-policy", reason: "wrong-policy" }),
    async () => ({ approved: "true", policyVersion, reason: "invalid-type" }) as unknown as Promise<import("../lib/phone-verification/server/carriers").CarrierTrustDecision>,
    async () => null as unknown as import("../lib/phone-verification/server/carriers").CarrierTrustDecision,
    async () => { throw new Error("sensitive-authentication-error"); }
  ]) {
    const p = ports();
    assert.deepEqual(await processNextZohoDelivery({ ...p, expectedCarrierPolicy: policyVersion, authenticateCarrier }), { outcome: "completed" });
    assert.equal(p.state.failed, 0);
    assert.equal((p.state.matches[0] as { approved: boolean }).approved, false);
    assert.equal((p.state.matches[0] as { policyVersion: string }).policyVersion, "carrier-ingress-unreviewed-v1");
  }
});
test("worker retries failures without retaining MIME, tokens, phones or error details", async () => {
  for (const { fetchOriginal, expected } of [
    { fetchOriginal: async () => {
      throw new Error("sensitive-network-error");
    }, expected: { outcome: "retry" } },
    { fetchOriginal: async () => "invalid MIME", expected: { outcome: "retry", reason: "invalid-message" } }
  ]) {
    const p = ports();
    assert.deepEqual(await processNextZohoDelivery({ ...p, fetchOriginal }), expected);
    assert.equal(p.state.failed, 1);
    assert.equal(p.state.completed, 0);
    assert.deepEqual(p.state.matches, []);
  }
});
test("worker passes the claimed provider reference for MIME without Message-ID", async () => {
  const p = ports();
  assert.deepEqual(
    await processNextZohoDelivery({
      ...p,
      fetchOriginal: async (messageId) => {
        assert.equal(messageId, lease.messageId);
        return raw.replace("Message-ID: <synthetic@fixture.invalid>\r\n", "");
      }
    }),
    { outcome: "completed" }
  );
  assert.equal(p.state.completed, 1);
  assert.equal(p.state.failed, 0);
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
