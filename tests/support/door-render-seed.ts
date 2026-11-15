// Live-render seed for the door page (docs/qa/door-check-in-20261116). Synthetic data only,
// against a disposable loopback PostgreSQL; never run it against an application database.
// Usage: DATABASE_URI=postgres://…@127.0.0.1:<port>/door_render… PAYLOAD_SECRET=… BETTER_AUTH_SECRET=…
//        DOOR_RENDER_QR_KEY=<throwaway hex key> node --import tsx tests/support/door-render-seed.ts <out.json>
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createLocalReq, getPayload, type CollectionSlug } from "payload";
import { privateKeyToAccount } from "viem/accounts";
import config from "../../src/payload.config";

const database = new URL(String(process.env.DATABASE_URI));
if (database.hostname !== "127.0.0.1" || !database.pathname.startsWith("/door_render")) throw new Error("Seed only the disposable door render database");
const qrKey = process.env.DOOR_RENDER_QR_KEY as `0x${string}`;
const out = process.argv[2];
if (!qrKey || !out) throw new Error("A throwaway QR key and an output path are required");

const LOCK = "0x1111111111111111111111111111111111111111";
async function main() {
  const payload = await getPayload({ config });
  const req = await createLocalReq({}, payload);
  const now = new Date();
  const iso = (offset = 0) => new Date(now.getTime() + offset).toISOString();
  // Fixture preparation only: adapter-level creates for rows whose business hooks
  // belong to other slices (checkout, settlement, the key-grant worker).
  const raw = async (collection: string, data: Record<string, unknown>, id = randomUUID()) => {
    await payload.db.create({ collection: collection as CollectionSlug, customID: id, data: { ...data, createdAt: iso(), updatedAt: iso() }, req });
    return id;
  };
  const create = async (collection: string, data: Record<string, unknown>) =>
    String((await payload.create({ collection: collection as CollectionSlug, data: data as never, overrideAccess: true, req })).id);

  const staffEmail = "door.staff@sophomores.co";
  const staffUser = await raw("users", { email: staffEmail, emailVerified: true, name: "Door Staff", role: ["staff"], membershipStatus: "staff", localePreference: "en" });
  await create("admins", { email: staffEmail, name: "Door Staff", role: "staff" });
  const token = randomBytes(24).toString("base64url");
  await raw("sessions", { token, user: staffUser, expiresAt: iso(24 * 3600_000) });
  const secret = String(process.env.BETTER_AUTH_SECRET || process.env.PAYLOAD_SECRET);
  const cookie = encodeURIComponent(`${token}.${createHmac("sha256", secret).update(token).digest("base64")}`);

  const event = await raw("commerce-events", { name: "First Night (render fixture)", publicationApproved: true, capacity: 40, transportCapacity: 40, reservedQuantity: 0, committedQuantity: 0, partIStartsAt: iso(-3600_000), partIEndsAt: iso(3 * 3600_000), claimCutoffAt: iso(-600_000) });
  const buyer = await raw("users", { email: "bora.fixture@example.invalid", emailVerified: true, name: "Bora Kim", membershipStatus: "approved", localePreference: "en" });
  const member = await raw("users", { email: "mina.fixture@example.invalid", emailVerified: true, name: "Mina Park", membershipStatus: "approved", localePreference: "en" });

  async function order(customer: string, hold: Record<string, unknown> = {}) {
    const orderID = randomUUID();
    const transaction = await raw("transactions", { customer, currency: "KRW", amount: 13000, status: "succeeded", paymentMethod: "portone",
      portone: { paymentID: randomUUID().replaceAll("-", ""), prepareKey: randomUUID(), snapshot: {}, snapshotHash: randomUUID(), storeID: "store-render-fixture", channelKey: "channel-render-fixture" }, ...hold });
    await raw("orders", { customer, currency: "KRW", amount: 13000, status: "processing", commerceVersion: "commerce-v1", transactions: [transaction] }, orderID);
    await payload.db.updateOne({ collection: "transactions" as CollectionSlug, id: transaction, data: { order: orderID }, req });
    return { orderID, transaction };
  }
  const admissions: Record<string, { id: string; orderID: string; transaction: string }> = {};
  async function admission(label: string, customer: string, data: Record<string, unknown>) {
    const { orderID, transaction } = await order(customer);
    admissions[label] = { orderID, transaction, id: await create("commerce-admissions", { orderUnitKey: `${orderID}:1`, order: orderID, transaction, event, buyer: customer, unit: 1, status: "available", ...data }) };
  }
  await admission("guest", buyer, { guestName: "Jun Lee" });
  await admission("member", member, { eventAccountKey: randomUUID() });
  await admission("held", buyer, { guestName: "Sora Han", benefitReview: true, benefitHoldReason: "render fixture" });
  for (const name of ["Ara Choi", "Hana Yoon", "Jisoo Lim"]) await admission(name, buyer, { guestName: name, status: "checked-in", checkedInAt: iso(-1800_000) });
  for (const name of ["Daniel Seo", "Yuna Jang"]) await admission(name, buyer, { guestName: name });

  const target = { chainID: 84532, lock: LOCK, recipient: `0x${"b".repeat(40)}` };
  for (const [label, tokenID] of [["guest", "7"], ["held", "8"]] as const) {
    const { id, orderID, transaction } = admissions[label];
    await raw("commerce-key-grant-intents", { operationKey: `render:${label}`, order: orderID, payment: transaction, entitlement: id, recipientMode: "member_safe", beneficiaryUser: buyer, state: "granted", tokenID, target, attempts: 1, grantedAt: iso() });
  }

  const signer = privateKeyToAccount(qrKey);
  const qr = async (tokenId: string) => {
    const data = JSON.stringify({ network: 84532, account: `0x${"0".repeat(39)}1`, lockAddress: LOCK, tokenId, timestamp: now.getTime() });
    return `https://app.unlock-protocol.com/verification?data=${encodeURIComponent(data)}&sig=${await signer.signMessage({ message: data })}`;
  };
  await writeFile(out, JSON.stringify({ cookie, signer: signer.address, event, qr: { admitted: await qr("7"), held: await qr("8"), notFound: await qr("999") } }, null, 2), { mode: 0o600 });
  console.log("door render seed complete");
}

main().then(() => process.exit(0), (error: unknown) => { console.error(error); process.exit(1); });
