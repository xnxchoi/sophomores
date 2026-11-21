import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { PayloadRequest } from "payload";
import { withCommerceWrite } from "@/lib/commerce/access";
import { keccak256 } from "viem";
import { CommerceKeyGrantIntents } from "@/payload/collections/commerce-key-grant-intents";

const hook = CommerceKeyGrantIntents.hooks!.beforeChange![0];
const hash = (c: string) => `0x${c.repeat(64)}`;
const original = { id: "k", operationKey: "unlock-grant:v1:o:1", order: "o", payment: "t", entitlement: "a", beneficiaryUser: "u", recipientMode: "member_safe",
  state: "failed_retryable", txHash: hash("d"), target: { chainID: 84532, lock: `0x${"a".repeat(40)}`, recipient: `0x${"b".repeat(40)}` } };
const run = (data: Record<string, unknown>, originalDoc: Record<string, unknown> = original, operation = "update") => {
  const req = {} as PayloadRequest;
  return withCommerceWrite(req, async () => hook({ data, originalDoc, operation, req } as never));
};

test("key grants are server owned", async () => {
  await assert.rejects(Promise.resolve().then(() => hook({ data: { state: "pending" }, originalDoc: original, operation: "update", req: {} } as never)), /server owned/);
});

test("only a proven-nonexecution retry may clear the recorded hash", async () => {
  await run({ state: "pending", txHash: null });
  await assert.rejects(run({ state: "pending", txHash: hash("e") }), /cannot change/);
  await assert.rejects(run({ state: "submitted", txHash: null }, { ...original, state: "submitted" }), /cannot change/);
});

test("identity, transitions and grants are guarded", async () => {
  await assert.rejects(run({ beneficiaryUser: "someone-else" }), /immutable/);
  await assert.rejects(run({ state: "granted" }, { ...original, state: "ambiguous" }), /confirmation evidence/);
  await assert.rejects(run({ state: "pending" }, { ...original, state: "ambiguous" }), /cannot move/);
  await assert.rejects(run({ recipientMode: "guest_email", state: "awaiting_wallet" }, {}, "create"), /not enabled/);
  await assert.rejects(run({ recipientMode: "member_safe", beneficiaryUser: "u", state: "pending" }, {}, "create"), /awaiting a wallet/);
  assert.equal((await run({ recipientMode: "member_safe", beneficiaryUser: "u" }, {}, "create") as { state: string }).state, "awaiting_wallet");
});

const send = (fill: string) => ({ txHash: hash(fill), maxFeePerGas: "100", maxPriorityFeePerGas: "10", sentAt: "2026-11-16T00:00:00.000Z" });
const inFlight = { ...original, state: "submitted", txHash: hash("d"), signer: `eip155:84532:0x${"1".repeat(40)}`, nonce: 7, sends: [send("d")] };

test("recorded sends are append-only, and the nonce and signer of an attempt never change", async () => {
  await run({ sends: [send("d"), send("e")] }, inFlight);
  await assert.rejects(run({ sends: [send("e")] }, inFlight), /append-only/);
  await assert.rejects(run({ sends: [send("e"), send("d")] }, inFlight), /append-only/);
  await assert.rejects(run({ sends: [] }, inFlight), /append-only/);
  await assert.rejects(run({ sends: [send("d"), { ...send("e"), txHash: "0x1" }] }, inFlight), /Invalid transaction hash/);
  await assert.rejects(run({ nonce: 8 }, inFlight), /nonce/);
  await assert.rejects(run({ signer: `eip155:84532:0x${"2".repeat(40)}` }, inFlight), /signer/);
  await assert.rejects(run({ txHash: hash("e"), sends: [send("d")], nonce: 1, signer: inFlight.signer }, { ...original, state: "submitted", txHash: null }), /first recorded send/);
  // A proven-nonexecution retry starts a fresh attempt.
  await run({ state: "pending", txHash: null, sends: null, nonce: null, signer: null }, { ...inFlight, state: "failed_retryable" });
});

test("a settled hash must be one the intent recorded", async () => {
  await run({ state: "granted", tokenID: "1", settledTxHash: hash("d") }, inFlight);
  await assert.rejects(run({ state: "granted", tokenID: "1", settledTxHash: hash("9") }, inFlight), /recorded/);
});

const keyHeld = { ...inFlight, state: "granted", tokenID: "5", cancelRequested: true };

test("a granted key is cancelled only with recorded evidence", async () => {
  await assert.rejects(run({ state: "cancelled", cancelledAt: "2026-11-16T00:00:00.000Z" }, keyHeld), /evidence/);
  await run({ state: "cancelled", cancelledAt: "2026-11-16T00:00:00.000Z", lastErrorCode: "key_not_valid" }, keyHeld);
  await run({ state: "cancelled", cancelledAt: "2026-11-16T00:00:00.000Z" }, { ...keyHeld, cancelTxHash: hash("c") });
  await assert.rejects(run({ state: "cancelled", cancelledAt: "2026-11-16T00:00:00.000Z" }, { ...keyHeld, cancelRequested: false, cancelTxHash: hash("c") }), /requested/);
});

test("a recorded cancel hash never changes, and is cleared only with its whole unsent attempt", async () => {
  const sent = { ...keyHeld, cancelAttemptID: "c1", cancelTxHash: hash("c"), cancelNonce: 2, cancelSigner: `eip155:84532:0x${"2".repeat(40)}` };
  await assert.rejects(run({ cancelTxHash: hash("e") }, sent), /cancel transaction/);
  await assert.rejects(run({ cancelTxHash: null }, sent), /cancel transaction/);
  await run({ cancelTxHash: null, cancelAttemptID: null, cancelNonce: null, cancelSigner: null }, sent);
  await assert.rejects(run({ cancelTxHash: "0x1" }, keyHeld), /Invalid transaction hash/);
});

test("a settled hash is written once", async () => {
  const settled = { ...inFlight, state: "granted", tokenID: "1", settledTxHash: hash("d"), sends: [send("d"), send("e")] };
  await assert.rejects(run({ settledTxHash: hash("e") }, settled), /settled/);
  await run({ tokenID: "1" }, settled);
});

const signed = (fill: string) => { const raw = `0x02${fill.repeat(8)}`; return { ...send("0"), txHash: keccak256(raw as `0x${string}`), raw, accepted: false }; };

test("recorded raw bytes must hash to their transaction; only acceptance and the re-send count may change on an entry", async () => {
  const entry = signed("a");
  const withRaw = { ...inFlight, txHash: entry.txHash, sends: [entry] };
  await assert.rejects(run({ txHash: hash("e"), sends: [{ ...send("e"), raw: "0x02aa" }], nonce: 1, signer: inFlight.signer }, { ...original, state: "submitted", txHash: null }), /raw/);
  await run({ sends: [{ ...entry, accepted: true }] }, withRaw);
  await run({ sends: [{ ...entry, rebroadcasts: 1 }] }, withRaw);
  await assert.rejects(run({ sends: [{ ...entry, accepted: false }] }, { ...withRaw, sends: [{ ...entry, accepted: true }] }), /append-only/);
  await assert.rejects(run({ sends: [{ ...entry, rebroadcasts: 0 }] }, { ...withRaw, sends: [{ ...entry, rebroadcasts: 2 }] }), /append-only/);
  await assert.rejects(run({ sends: [{ ...entry, raw: signed("b").raw }] }, withRaw), /append-only|raw/);
});

test("a cancel's sends are append-only from its first hash, and its nonce and signer never change", async () => {
  const entry = signed("c");
  const sent = { ...keyHeld, cancelAttemptID: "c1", cancelTxHash: entry.txHash, cancelNonce: 2, cancelSigner: `eip155:84532:0x${"2".repeat(40)}`, cancelSends: [entry] };
  await run({ cancelSends: [entry, signed("d")] }, sent);
  await assert.rejects(run({ cancelSends: [signed("d")] }, sent), /append-only/);
  await assert.rejects(run({ cancelNonce: 3 }, sent), /cancel/);
  await assert.rejects(run({ cancelSigner: `eip155:84532:0x${"3".repeat(40)}` }, sent), /cancel/);
  await run({ cancelTxHash: null, cancelAttemptID: null, cancelNonce: null, cancelSigner: null, cancelSends: null }, sent);
});

test("grant write-ahead and suppression never expose raw bytes; only the exact completed send can attach them", async () => {
  const { raw, ...audit } = signed("a");
  const pending = { ...inFlight, txHash: audit.txHash, sends: [audit], lastErrorCode: "grant_broadcast_pending" };
  await run({ sends: [audit], lastErrorCode: "grant_broadcast_pending" }, { ...inFlight, txHash: audit.txHash, sends: null });
  await assert.rejects(run({ sends: [{ ...audit, raw }], lastErrorCode: "grant_broadcast_pending" }, { ...pending, sends: null }), /unbroadcast bytes/);
  await run({ lastErrorCode: "grant_broadcast_suppressed" }, pending);
  await assert.rejects(run({ sends: [{ ...audit, raw }], lastErrorCode: "grant_broadcast_suppressed" }, pending), /append-only/);
  await run({ sends: [{ ...audit, raw, accepted: true }], lastErrorCode: null }, pending);
  await run({ state: "ambiguous", sends: [{ ...audit, raw }], lastErrorCode: "outcome_unknown" }, pending);
  await assert.rejects(run({ sends: [{ ...audit, raw }], lastErrorCode: null }, { ...pending, lastErrorCode: "grant_broadcast_suppressed" }), /append-only/);
});

test("Payload field reads preserve the grant audit and expose raw bytes only to trusted server overrides", async () => {
  const entry = pathToFileURL(createRequire(import.meta.url).resolve("payload"));
  const { afterRead } = await import(new URL("./fields/hooks/afterRead/index.js", entry).href);
  const fixture = signed("a");
  const project = (payloadAPI: string, overrideAccess: boolean, select?: { sends: true }) => afterRead({
    collection: CommerceKeyGrantIntents, context: {}, depth: 0,
    doc: { ...inFlight, sends: [fixture] }, draft: false, fallbackLocale: null, global: null, locale: "en",
    overrideAccess, select, showHiddenFields: true,
    req: { payloadAPI, context: {}, user: { collection: "admins", role: "superadmin" },
      payload: { config: { defaultDepth: 0, maxDepth: 10, localization: false }, collections: {} } },
  });
  for (const surface of ["REST", "GraphQL", "local"]) {
    for (const select of [undefined, { sends: true } as const]) {
      const result = await project(surface, false, select);
      const [send] = result.sends;
      assert.equal(send.txHash, fixture.txHash);
      assert.equal(send.maxFeePerGas, fixture.maxFeePerGas);
      assert.equal(send.accepted, false);
      assert.equal(Object.hasOwn(send, "raw"), false);
      assert.equal(JSON.stringify(result).includes(fixture.raw), false);
    }
  }
  const field = CommerceKeyGrantIntents.fields.find(field => "name" in field && field.name === "sends");
  assert.ok(field?.type === "json" && field.access?.read);
  assert.equal(await field.access.read({ req: {} as PayloadRequest }), false, "document-less distinct reads cannot expose the JSON");
  const internal = await project("local", true);
  assert.equal(internal.sends[0].raw, fixture.raw, "recovery still has its original signed bytes");
});
