import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { PhoneVerificationService } from "@/lib/phone-verification/server/service";

const config = {
  secret: "test-secret-never-used-outside-tests-123456",
  recipient: "verify@example.test",
  mailboxId: "test-mailbox"
};

test("configuration and public inputs fail closed before storage", async () => {
  const repo = {
    issue: async () => {
      throw new Error("storage must not be touched");
    }
  };
  assert.throws(
    () =>
      new PhoneVerificationService(repo as never, {
        ...config,
        secret: "short"
      }),
    /configuration/
  );
  const service = new PhoneVerificationService(repo as never, config);
  for (const phone of [
    null,
    undefined,
    "",
    "01112345678",
    "01012345678';DROP TABLE users;",
    "📞"
  ]) {
    await assert.rejects(
      service.issue({
        phone: phone as never,
        sessionToken: randomBytes(32).toString("base64url"),
        ipKey: "local"
      }),
      { code: "INVALID_INPUT" }
    );
  }
  await assert.rejects(
    service.issue({ phone: "01012345678", sessionToken: "", ipKey: "local" }),
    { code: "INVALID_INPUT" }
  );
});

test("provider errors are replaced by a non-sensitive service error", async () => {
  const service = new PhoneVerificationService(
    {
      issue: async () => {
        throw new Error("password=secret phone=01012345678");
      }
    } as never,
    config
  );
  await assert.rejects(
    service.issue({
      phone: "01012345678",
      sessionToken: randomBytes(32).toString("base64url"),
      ipKey: "local"
    }),
    (error: unknown) => {
      assert.equal((error as { code: string }).code, "UNAVAILABLE");
      assert.doesNotMatch(String(error), /password|01012345678/);
      return true;
    }
  );
});

test("null request envelopes, malformed references, and dates produce stable validation errors", async () => {
  const service = new PhoneVerificationService({} as never, config);
  for (const input of [null, undefined]) {
    await assert.rejects(service.issue(input as never), {
      code: "INVALID_INPUT"
    });
    await assert.rejects(service.status(input as never), {
      code: "INVALID_INPUT"
    });
    await assert.rejects(service.cancel(input as never), {
      code: "INVALID_INPUT"
    });
    await assert.rejects(service.match(input as never), {
      code: "INVALID_INPUT"
    });
    await assert.rejects(service.consumeProof(input as never), {
      code: "INVALID_INPUT"
    });
  }
  const sessionToken = randomBytes(32).toString("base64url");
  await assert.rejects(service.status({ sessionToken, id: "not-a-uuid" }), {
    code: "INVALID_INPUT"
  });
  await assert.rejects(
    service.issue({ sessionToken, phone: "01012345678", ipKey: "" }),
    { code: "INVALID_INPUT" }
  );
  const candidate = {
    mailboxId: config.mailboxId,
    messageId: "test",
    phone: "01012345678",
    token: sessionToken,
    receivedAt: new Date(),
    approved: false,
    policyVersion: "test"
  };
  await assert.rejects(
    service.match({ ...candidate, messageId: "x';drop tables" }),
    { code: "INVALID_INPUT" }
  );
  await assert.rejects(
    service.match({ ...candidate, receivedAt: new Date("invalid") }),
    { code: "INVALID_INPUT" }
  );
  await assert.rejects(
    service.match({
      ...candidate,
      deliveryLease: { id: "bad", leaseToken: "bad" }
    }),
    { code: "INVALID_INPUT" }
  );
  assert.deepEqual(
    await service.match({ ...candidate, mailboxId: "another" }),
    { outcome: "ignored" }
  );
});

test("the storage boundary receives only digests, never candidate raw phone or token", async () => {
  let captured: Record<string, unknown> = {};
  const service = new PhoneVerificationService(
    {
      match: async (input: Record<string, unknown>) => {
        captured = input;
        return { outcome: "ignored" };
      }
    } as never,
    config
  );
  await service.match({
    mailboxId: config.mailboxId,
    messageId: "test",
    phone: "01012345678",
    token: randomBytes(32).toString("base64url"),
    receivedAt: new Date(),
    approved: false,
    policyVersion: "test"
  });
  assert.equal(captured.phone, undefined);
  assert.equal(captured.token, undefined);
  assert.match(String(captured.phoneHash), /^[0-9a-f]{64}$/);
});
