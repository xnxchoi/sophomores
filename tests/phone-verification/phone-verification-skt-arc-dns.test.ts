import assert from "node:assert/strict";
import test from "node:test";
import { createHash, generateKeyPairSync } from "node:crypto";
import {
  createArcDns,
  requirePinnedLegacyKey
} from "@/lib/phone-verification/server/skt-arc-dns";

test("legacy key exception pins exact selector and decoded public DER SHA256", () => {
  const key = generateKeyPairSync("rsa", { modulusLength: 1024 });
  const der = key.publicKey.export({ type: "spki", format: "der" });
  const records = [[`v=DKIM1; k=rsa; p=${der.toString("base64")}`]];
  const pin = {
    selector: "zohoarc",
    sha256: createHash("sha256").update(der).digest("hex")
  };
  assert.deepEqual(
    requirePinnedLegacyKey("zohoarc._domainkey.zohomail.com", records, pin),
    records
  );
  assert.throws(() =>
    requirePinnedLegacyKey("other._domainkey.zohomail.com", records, pin)
  );
  assert.throws(() =>
    requirePinnedLegacyKey("zohoarc._domainkey.zohomail.com", records, {
      ...pin,
      sha256: "0".repeat(64)
    })
  );
  for (const invalid of [
    [],
    [...records, ...records],
    [["v=DKIM1; p=bad"]],
    [["p=YWJj; p=YWJj"]]
  ])
    assert.throws(() =>
      requirePinnedLegacyKey("zohoarc._domainkey.zohomail.com", invalid, pin)
    );
});

test("DNS admits only bounded Zoho selector TXT requests and stops after query cap", async () => {
  let calls = 0;
  let cancellations = 0;
  const context = createArcDns(
    {
      async resolveTxt() {
        calls++;
        return [["key"]];
      },
      cancel() {
        cancellations++;
      }
    },
    { maxQueries: 1 }
  );
  try {
    for (const [name, type] of [
      ["test._domainkey.zohomail.com.evil", "TXT"],
      ["test._domainkey.zohomail.com", "A"],
      ["_bad._domainkey.zohomail.com", "TXT"],
      ["a".repeat(64) + "._domainkey.zohomail.com", "TXT"]
    ])
      await assert.rejects(context.resolver(name, type));
    assert.equal(calls, 0);
    assert.deepEqual(
      await context.resolver("test._domainkey.zohomail.com.", "TXT"),
      [["key"]]
    );
    await assert.rejects(
      context.resolver("test._domainkey.zohomail.com", "TXT")
    );
    assert.equal(calls, 1);
  } finally {
    context.close();
  }
  assert.equal(cancellations, 1);
  await assert.rejects(context.resolver("test._domainkey.zohomail.com", "TXT"));
});

test("DNS validates response shape, chunk counts and aggregate bytes", async () => {
  for (const response of [
    null,
    ["wrong"],
    [[12]],
    Array.from({ length: 33 }, () => ["x"]),
    [Array(65).fill("x")],
    [["x".repeat(16385)]],
    [["x".repeat(8193)], ["x".repeat(8192)]]
  ]) {
    const context = createArcDns({
      async resolveTxt() {
        return response as string[][];
      },
      cancel() {}
    });
    try {
      await assert.rejects(
        context.resolver("s._domainkey.zohomail.com", "TXT")
      );
    } finally {
      context.close();
    }
  }
});

test("DNS deadline actively cancels outstanding requests", async () => {
  let cancelled = false;
  const context = createArcDns(
    {
      resolveTxt: () => new Promise(() => {}),
      cancel() {
        cancelled = true;
      }
    },
    { deadlineMs: 5 }
  );
  try {
    await assert.rejects(
      Promise.race([
        context.resolver("s._domainkey.zohomail.com", "TXT"),
        context.deadline
      ])
    );
    assert.equal(cancelled, true);
  } finally {
    context.close();
  }
});

test("DNS limit overrides only tighten production ceilings", async () => {
  for (const limits of [
    { deadlineMs: 0 },
    { deadlineMs: NaN },
    { maxQueries: 0 },
    { maxQueries: 1.5 }
  ])
    assert.throws(() => createArcDns(undefined, limits));
  const context = createArcDns(
    {
      async resolveTxt() {
        return [];
      },
      cancel() {}
    },
    { maxQueries: 100, deadlineMs: 10000 }
  );
  try {
    for (let i = 0; i < 4; i++)
      assert.deepEqual(
        await context.resolver("s._domainkey.zohomail.com", "TXT"),
        []
      );
    await assert.rejects(context.resolver("s._domainkey.zohomail.com", "TXT"));
  } finally {
    context.close();
  }
});
