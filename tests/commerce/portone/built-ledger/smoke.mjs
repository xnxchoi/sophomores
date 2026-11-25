/*
 * Built-server ledger smoke, step 2 of 2 (see ./seed.mts for why). Sends one signed PortOne "Transaction.Paid" webhook
 * for the seeded, review-held attempt to a running `next start` build, and checks the answer:
 *   200 {"outcome":"payment-quarantined"}: the route ran recordReconciliationEvent through inLedgerTransaction (the
 *   ledger works in built output) and stopped before any provider read.
 *   409 is the P0 failure (the ledger threw); anything else is a failure too.
 *
 *   BASE_URL=http://localhost:3217 PORTONE_WEBHOOK_SECRET=whsec_... PORTONE_STORE_ID=store-... \
 *     node tests/commerce/portone/built-ledger/smoke.mjs <paymentID>
 *
 * The signature is the Standard Webhooks scheme the server verifies with @portone/server-sdk. The secret must be the
 * throwaway one the scratch server was started with, never a real PortOne secret. Prints one JSON line; exit 0 = pass.
 */
import { createHmac, randomUUID } from "node:crypto";

const [paymentID] = process.argv.slice(2);
const base = new URL(process.env.BASE_URL ?? "");
const secret = process.env.PORTONE_WEBHOOK_SECRET ?? "";
const storeId = process.env.PORTONE_STORE_ID ?? "";
if (!paymentID || !["localhost", "127.0.0.1"].includes(base.hostname) || !secret.startsWith("whsec_") || !storeId) {
  console.log(JSON.stringify({ pass: false, reason: "usage" }));
  process.exit(2);
}
const body = JSON.stringify({ type: "Transaction.Paid", timestamp: new Date().toISOString(), data: { paymentId: paymentID, storeId } });
const id = "msg_" + randomUUID().replaceAll("-", "");
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = "v1," + createHmac("sha256", Buffer.from(secret.slice("whsec_".length), "base64"))
  .update(`${id}.${timestamp}.${body}`).digest("base64");
const response = await fetch(new URL("/api/payments/portone/webhooks", base), {
  method: "POST", redirect: "manual",
  headers: { "content-type": "application/json", "webhook-id": id, "webhook-timestamp": timestamp, "webhook-signature": signature },
  body,
});
const text = await response.text();
let outcome = null;
try { outcome = JSON.parse(text).outcome ?? null; } catch { /* not JSON */ }
const pass = response.status === 200 && outcome === "payment-quarantined";
console.log(JSON.stringify({ pass, status: response.status, outcome }));
process.exit(pass ? 0 : 1);
