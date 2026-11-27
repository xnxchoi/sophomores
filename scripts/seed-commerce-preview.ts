import { randomBytes } from "node:crypto";
import { closeSync, lstatSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type { CollectionSlug, GlobalSlug, PayloadRequest, Where } from "payload";
import { PREVIEW_POLICY_MARKER, isPreviewPolicyDocument, previewPolicyDocument } from "./preview/policy-document-fixture";
import { ensurePreviewRoster } from "./preview/team-roster-fixture";

const lease = "/tmp/sphmrs-owner-preview-6lse30ag";
const socket = join(lease, "socket");
const databaseURI = `postgresql://preview_owner@localhost/sphmrs_owner_preview?host=${encodeURIComponent(socket)}&port=55439`;
const marker = "PREVIEW Hamlet commerce fixture v1";
const filename = "preview-hamlet-commerce-v1.png";
const email = "hamlet-commerce-v1@preview.invalid";
const ids = {
  media: "ed98b970-55aa-4e85-a3dc-0b173be1c001",
  editionType: "ed98b970-55aa-4e85-a3dc-0b173be1c002",
  book: "ed98b970-55aa-4e85-a3dc-0b173be1c003",
  event: "ed98b970-55aa-4e85-a3dc-0b173be1c004",
  offer: "ed98b970-55aa-4e85-a3dc-0b173be1c005",
  user: "ed98b970-55aa-4e85-a3dc-0b173be1c006",
  attempt: "ed98b970-55aa-4e85-a3dc-0b173be1c007",
};
const editions = [
  { optionID: "ed98b970-55aa-4e85-a3dc-0b173be1c011", variantID: "ed98b970-55aa-4e85-a3dc-0b173be1c021", label: "PREVIEW Softcover", value: "preview-softcover", price: 24000 },
  { optionID: "ed98b970-55aa-4e85-a3dc-0b173be1c012", variantID: "ed98b970-55aa-4e85-a3dc-0b173be1c022", label: "PREVIEW Hardcover", value: "preview-hardcover", price: 36000 },
];
const bookTitle = "PREVIEW Field Notes";
const offerTitle = "PREVIEW Legacy Release";
const address = "PREVIEW address - do not ship";
const business = {
  tradeName: marker, representative: "PREVIEW representative", businessAddress: address,
  bizNum: "000-00-00000", mailOrderRegistration: "PREVIEW - no registration",
  customerServicePhone: "02-0000-0000", customerServiceEmail: "support@preview.invalid",
};
const policy = {
  effectiveDate: "2020-01-01",
  sections: [{ heading: "PREVIEW only", paragraphs: ["Synthetic layout fixture. Not a real policy or offer."] }],
};
const publication = {
  _status: "published" as const, publicationApproved: true, physicalProductApproved: true,
  fulfillmentReady: true, addressRetentionApproved: true, shippingCountries: ["KR" as const],
  disclosure: {
    seller: { name: marker, representative: business.representative, registrationNumber: business.bizNum,
      address, phone: business.customerServicePhone, mailOrderNum: business.mailOrderRegistration },
    policies: { terms: policy, privacy: policy, refund: policy },
  },
};
// Canonical generated types predate these runtime-registered slugs.
const native = { types: "variantTypes", options: "variantOptions", variants: "variants" } as const;
const businessSlug = "business-info" as GlobalSlug;

function requireFixture(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function localPath(path: string) {
  try { return lstatSync(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return null;
  }
}

function admit() {
  requireFixture(process.argv.length === 3 && ["--seed-disposable-preview", "--seed-edition-offers"].includes(process.argv[2])
    && process.env.DATABASE_URI === databaseURI
    && process.env.NODE_ENV === "development"
    && (!process.env.PORTONE_PAYMENT_MODE || process.env.PORTONE_PAYMENT_MODE === "disabled"),
  "Refusing to seed: use the exact admitted disposable preview lease and explicit seed flag.");
  const uid = process.getuid?.();
  const root = lstatSync(lease);
  const directory = lstatSync(socket);
  const endpoint = lstatSync(join(socket, ".s.PGSQL.55439"));
  requireFixture(root.isDirectory() && root.uid === uid && directory.isDirectory()
    && directory.uid === uid && (directory.mode & 0o777) === 0o700
    && endpoint.isSocket() && endpoint.uid === uid, "Refusing to seed: the owned private PostgreSQL socket is not available.");
  const checkout = process.env.SPHMRS_PREVIEW_CHECKOUT;
  const systemID = process.env.SPHMRS_PREVIEW_CLUSTER_SYSTEM_ID;
  requireFixture(checkout?.startsWith("/") && systemID && /^\d{15,20}$/.test(systemID)
    && process.cwd() === realpathSync(checkout)
    && process.cwd() === realpathSync(fileURLToPath(new URL("..", import.meta.url))),
  "Refusing to seed: pass the independently admitted checkout and PostgreSQL system identifier.");
  const data = realpathSync(join(lease, "data"));
  const [, postmasterData, started, port, socketDirectory] = readFileSync(join(data, "postmaster.pid"), "utf8").split("\n");
  requireFixture(postmasterData && realpathSync(postmasterData) === data
    && started && /^\d+$/.test(started) && port === "55439"
    && socketDirectory && realpathSync(socketDirectory) === realpathSync(socket),
  "Refusing to seed: postmaster is not bound to the owned data and socket directories.");

  // Isolate config from inherited provider keys, dotenv overrides and PG* defaults.
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, {
    NODE_ENV: "development", DATABASE_URI: databaseURI, PAYLOAD_SECRET: randomBytes(48).toString("hex"),
    BETTER_AUTH_URL: "http://127.0.0.1:3000", NEXT_PUBLIC_SERVER_URL: "http://127.0.0.1:3000",
    PORTONE_PAYMENT_MODE: "disabled", NEXT_TELEMETRY_DISABLED: "1", TMPDIR: lease,
    DISABLE_PAYLOAD_HMR: "true",
  });
  return { data, started, systemID };
}

function recordPhase(phase: "preflight-verified" | "catalogue-committed" | "complete") {
  const statusPath = join(lease, "seed-commerce-preview-v2-status.json");
  const temporary = `${statusPath}.${process.pid}.${randomBytes(6).toString("hex")}`;
  writeFileSync(temporary, JSON.stringify({ fixture: marker, phase }) + "\n", { flag: "wx", mode: 0o600 });
  try { renameSync(temporary, statusPath); }
  catch (error) { unlinkSync(temporary); throw error; }
}

async function seed(leaseIdentity: ReturnType<typeof admit>) {
  requireFixture(process.env.DISABLE_PAYLOAD_HMR === "true", "Refusing to seed with Payload HMR enabled.");
  const [{ createLocalReq, getPayload }, { default: canonical }, { serverChosenIDContext },
    { loadCommerceOffer, buildCommerceSnapshot }, { loadPublishedCommerceEditions }, { withCommerceWrite },
    { commerceSnapshotSchema }, { inCommerceTransaction }] = await Promise.all([
    import("payload"), import("../src/payload.config"), import("../src/payload/server-chosen-ids"),
    import("../src/lib/commerce/catalogue"), import("../src/lib/commerce/editions"),
    import("../src/lib/commerce/access"), import("../src/lib/commerce/contracts"),
    import("../src/lib/commerce/_shared/transaction"),
  ]);
  const config = await canonical;
  const payload = await getPayload({
    config: { ...config, typescript: { ...config.typescript, autoGenerate: false } },
    disableDBConnect: true, disableOnInit: true,
  });
  let pool: NonNullable<PostgresAdapter["pool"]> | undefined;
  try {
    const db = payload.db;
    const replicaOptions: unknown = Reflect.get(db, "readReplicaOptions");
    requireFixture(db.name === "postgres" && db.push === false &&
      (replicaOptions === undefined || (Array.isArray(replicaOptions) && replicaOptions.length === 0))
      && !Object.values(db.extensions).some(Boolean) && db.connect
      && Object.keys(db.poolOptions).length === 1 && db.poolOptions.connectionString === databaseURI,
    "Refusing to seed: runtime adapter target or schema-write settings changed.");
    // Own the whole pool, so the adapter does not hold an unreturned startup client.
    db.disableCreateDatabase = true;
    const pg = db.pg;
    requireFixture(pg, "Refusing to seed: configured PostgreSQL driver is unavailable.");
    pool = new pg.Pool({ connectionString: databaseURI, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
    pool.on("error", () => { console.error("PREVIEW seed database connection was interrupted."); });
    const { rows: [identity] } = await pool.query<{
      database: string; role: string; socket_only: boolean; started: string;
      cluster_id: string; data_directory: string; socket_directory: string;
    }>(`SELECT current_database() AS database, current_user AS role,
             inet_server_addr() IS NULL AS socket_only,
             floor(extract(epoch from pg_postmaster_start_time()))::text AS started,
             system_identifier::text AS cluster_id,
             current_setting('data_directory') AS data_directory,
             current_setting('unix_socket_directories') AS socket_directory
      FROM pg_control_system()`);
    requireFixture(identity?.database === "sphmrs_owner_preview" && identity.role === "preview_owner"
      && identity.socket_only && identity.cluster_id === leaseIdentity.systemID && identity.started === leaseIdentity.started
      && realpathSync(identity.data_directory) === leaseIdentity.data
      && realpathSync(identity.socket_directory) === realpathSync(socket),
    "Refusing to seed: PostgreSQL does not match the admitted disposable cluster.");
    db.pool = pool;
    await db.connect();
    requireFixture(Object.values(native).every((slug) => Object.hasOwn(payload.collections, slug)),
      "Native edition collections are not registered.");
    // Check physical columns in both stages, including joins/versions that an empty Local API read may not touch.
    // This is a drift screen, not proof of write constraints or a substitute for the R1 migration assessment.
    const prefixes = ["media", "users", "products", "commerce_events", "business_info", "commerce_publication",
      "variant_types", "variant_options", "variants", "carts", "orders"];
    const requiredTables = Object.values(db.rawTables).filter(({ name }) =>
      prefixes.some((prefix) => name === prefix || name.startsWith(`${prefix}_`) || name.startsWith(`_${prefix}_`)));
    requireFixture(prefixes.every((prefix) => requiredTables.some(({ name }) => name === prefix)),
      "Refusing to seed: the runtime schema changed its fixture table mappings.");
    const { rows: columns } = await pool.query<{ table_name: string; column_name: string }>(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = ANY($2::text[])",
      [db.schemaName ?? "public", requiredTables.map(({ name }) => name)],
    );
    const present = new Set(columns.map(({ table_name, column_name }) => `${table_name}.${column_name}`));
    const missing = requiredTables.flatMap(({ name, columns }) => Object.values(columns)
      .map((column) => `${name}.${column.name}`)).filter((column) => !present.has(column));
    requireFixture(!missing.length, `Refusing to seed: preview schema is missing ${missing.length} expected columns (first: ${missing[0]}).`);
    const upload = payload.collections.media.config.upload;
    requireFixture(typeof upload.staticDir === "string", "The preview media directory is not configured.");
    const mediaDir = resolve(upload.staticDir);
    const mediaPath = join(mediaDir, filename);
    const existingDir = localPath(mediaDir);
    requireFixture(mediaDir === resolve("media") && !upload.disableLocalStorage
      && (!existingDir || existingDir.isDirectory()), "Refusing to write outside the preview media directory.");

    const req = await createLocalReq({}, payload);
    const local = { req, depth: 0, overrideAccess: true } as const;
    const find = (collection: CollectionSlug, where: Where) => payload.find({ ...local, collection, where, limit: 2 });
    const create = (collection: CollectionSlug, id: string, data: Record<string, unknown>) =>
      payload.create({ ...local, collection, data: { id, ...data } as never,
        context: serverChosenIDContext(id), disableVerificationEmail: true });
    const byID = (id: string) => ({ id: { equals: id } });
    const nativeTypes = native.types as CollectionSlug;
    const nativeOptions = native.options as CollectionSlug;
    const nativeVariants = native.variants as CollectionSlug;

    if (process.argv[2] === "--seed-edition-offers") {
      const [mediaRows, typeRows] = await Promise.all([find("media", byID(ids.media)), find(nativeTypes, byID(ids.editionType))]);
      requireFixture(mediaRows.totalDocs === 1 && Reflect.get(mediaRows.docs[0], "filename") === filename &&
        typeRows.totalDocs === 1 && Reflect.get(typeRows.docs[0], "name") === "edition",
      "Run the disposable preview fixture first; its exact media and edition type are required.");
      const { seedPreviewEditionOffers } = await import("./preview/edition-offer-fixture");
      const seeded = await seedPreviewEditionOffers(req, { media: ids.media, editionType: ids.editionType });
      console.log("PREVIEW edition checkout fixtures:", seeded);
      return;
    }

    const cartWhere: Where = { customer: { equals: ids.user } };
    const orderWhere: Where = { or: [{ customer: { equals: ids.user } }, { user: { equals: ids.user } },
      { commerceAttemptID: { equals: ids.attempt } }] };
    const preflightCarts = await find("carts", cartWhere);
    const preflightOrders = await find("orders", orderWhere);
    requireFixture((preflightCarts.totalDocs === 0 && preflightOrders.totalDocs === 0)
      || (preflightCarts.totalDocs === 1 && preflightOrders.totalDocs === 1
        && preflightOrders.docs[0] && Reflect.get(preflightOrders.docs[0], "commerceAttemptID") === ids.attempt),
    "Refusing to seed: existing cart/order do not form the expected fixture scope.");
    recordPhase("preflight-verified");

    // The installed variant plugin reads its parent/options without forwarding req.
    // Commit those dependencies before creating variants; do not serve preview between stages.
    const user = await inCommerceTransaction(req, async () => {
      const bookRows = await find("products", { or: [byID(ids.book), { title: { equals: bookTitle } },
        { and: [{ commerceModel: { equals: "native-edition-v2" } }, { publicationApproved: { equals: true } }] }] });
      const offerRows = await find("products", { or: [byID(ids.offer), { title: { equals: offerTitle } },
        { and: [{ publicationApproved: { equals: true } }, { or: [{ commerceModel: { equals: "legacy-v1" } },
          { commerceModel: { exists: false } }] }] }] });
      const memberRows = await find("users", { or: [byID(ids.user), { email: { equals: email } }] });
      const mediaRows = await find("media", { or: [byID(ids.media), { filename: { equals: filename } }] });
      const eventRows = await find("commerce-events", { or: [byID(ids.event), { name: { equals: marker } }] });
      const typeRows = await find(nativeTypes, { or: [byID(ids.editionType), { name: { equals: "edition" } }] });
      const optionRows = await find(nativeOptions, { id: { in: editions.map((edition) => edition.optionID) } });
      const storedBusiness = await payload.findGlobal({ ...local, slug: businessSlug });
      const storedPublication = await payload.findGlobal({ ...local, slug: "commerce-publication", draft: true });
      const publicPublication = await payload.findGlobal({ ...local, slug: "commerce-publication", draft: false });
      const disclosure = storedPublication.disclosure;
      const seller = disclosure && typeof disclosure === "object" && "seller" in disclosure
        ? disclosure.seller : undefined;
      const initialVariants = await find(nativeVariants, { or: [{ product: { equals: ids.book } },
        { id: { in: editions.map((edition) => edition.variantID) } }] });
      const rows = [bookRows, offerRows, memberRows, mediaRows, eventRows, typeRows];
      if (Reflect.get(storedBusiness, "tradeName") === marker) {
        const expected = [ids.book, ids.offer, ids.user, ids.media, ids.event, ids.editionType];
        const member = memberRows.docs[0];
        requireFixture(rows.every((result, index) => result.totalDocs === 1 && result.docs[0]?.id === expected[index])
          && member && Reflect.get(member, "email") === email && mediaRows.docs[0]
          && Reflect.get(mediaRows.docs[0], "filename") === filename && localPath(mediaPath)?.isFile()
          && optionRows.totalDocs === editions.length
          && Object.entries(business).every(([key, value]) => Reflect.get(storedBusiness, key) === value)
          && seller && typeof seller === "object" && "name" in seller && seller.name === marker,
        "Existing preview fixtures do not match; no repair or replacement was attempted.");
        return { ...member, collection: "users" } as PayloadRequest["user"];
      }
      requireFixture(rows.every((result) => result.totalDocs === 0) && optionRows.totalDocs === 0
        && initialVariants.totalDocs === 0 && preflightOrders.totalDocs === 0 && !localPath(mediaPath)
        && ![...Object.keys(business), "terms", "privacy", "refund"].some((key) => Reflect.get(storedBusiness, key))
        && [storedPublication, publicPublication].every((doc) => doc._status !== "published"
          && !doc.shippingCountries?.length
          && !Object.keys(publication).filter((key) => !["_status", "shippingCountries"].includes(key))
            .some((key) => Reflect.get(doc, key))),
      "Refusing to replace existing data or files in the preview fixture scope.");

      const { default: sharp } = await import("sharp");
      const cover = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640"><rect width="480" height="640" fill="#eee4ce"/><path d="M0 470L480 180V470Z" fill="#b54535"/><path d="M42 38H438V600H42Z" fill="none" stroke="#302d28" stroke-width="3"/><text x="62" y="110" fill="#302d28" font-size="42" font-family="sans-serif">PREVIEW</text></svg>`)).png().toBuffer();
      const media = await payload.create({ ...local, collection: "media", context: serverChosenIDContext(ids.media),
        data: { id: ids.media, alt: "PREVIEW synthetic book cover" } as never,
        file: { name: filename, mimetype: "image/png", size: cover.length, data: cover } });
      requireFixture(media.id === ids.media && media.filename === filename, "Preview media identity was not retained.");
      const editionType = await create(nativeTypes, ids.editionType, { name: "edition", label: "PREVIEW Edition" });
      for (const edition of editions) {
        await create(nativeOptions, edition.optionID, { variantType: editionType.id, label: edition.label, value: edition.value });
      }
      const event = await create("commerce-events", ids.event, {
        name: marker, publicationApproved: true, capacity: 12, transportCapacity: 12,
        partIStartsAt: "2099-11-18T09:00:00Z", partIEndsAt: "2099-11-18T11:00:00Z", claimCutoffAt: "2099-11-18T08:00:00Z",
      });
      await payload.updateGlobal({ ...local, slug: businessSlug, data: business as never });
      await payload.updateGlobal({ ...local, slug: "commerce-publication", draft: false, data: publication });
      const shared = { _status: "published", publicationApproved: true, images: [{ image: media.id }] };
      await create("products", ids.book, {
        ...shared, commerceModel: "native-edition-v2", title: bookTitle,
        description: "PREVIEW book for comparing editions. Not for sale.", variantTypes: [editionType.id],
      });
      await create("products", ids.offer, {
        ...shared, commerceModel: "legacy-v1", title: offerTitle, description: "PREVIEW catalogue fixture. Not for sale.",
        event: event.id, inventory: 12, priceInKRWEnabled: true, priceInKRW: 24000, shippingFeeKRW: 3000,
        saleStartsAt: "2020-01-01T00:00:00Z", saleEndsAt: "2099-11-17T00:00:00Z", dispatchSchedule: "PREVIEW - no dispatch",
      });
      const member = await create("users", ids.user, { email, name: "PREVIEW Member", membershipStatus: "approved", localePreference: "en" });
      requireFixture(member.id === ids.user, "Preview member identity was not retained.");
      return { ...member, collection: "users" } as PayloadRequest["user"];
    });

    recordPhase("catalogue-committed");
    requireFixture(user, "Preview member unavailable.");
    const owner = await createLocalReq({ user }, payload);
    await inCommerceTransaction(owner, async () => {
      const options = { ...local, req: owner };
      const offer = await loadCommerceOffer(payload, owner);
      requireFixture(offer?.productID === ids.offer && offer.event.id === ids.event
        && offer.publication.disclosure.seller.name === marker, "Legacy fixture is not the selected preview offer.");
      const foundVariants = await payload.find({ ...options, collection: nativeVariants, limit: 3,
        where: { or: [{ product: { equals: ids.book } }, { id: { in: editions.map((edition) => edition.variantID) } }] } });
      requireFixture(foundVariants.totalDocs === 0 || (foundVariants.totalDocs === editions.length
        && editions.every((edition) => foundVariants.docs.some((row) => row.id === edition.variantID))),
      "Existing variants do not match the preview fixture.");
      if (!foundVariants.totalDocs) {
        for (const edition of editions) {
          await payload.create({ ...options, collection: nativeVariants, draft: false, context: serverChosenIDContext(edition.variantID),
            data: { id: edition.variantID, product: ids.book, options: [edition.optionID], _status: "published",
              publicationApproved: true, priceInKRWEnabled: true, priceInKRW: edition.price } as never });
        }
      }
      const book = await loadPublishedCommerceEditions(payload, owner);
      requireFixture(book.status === "displayable" && book.product.productID === ids.book && !book.purchaseReady
        && book.editions.length === editions.length && editions.every((expected) => book.editions.some((edition) =>
          edition.variantID === expected.variantID && edition.optionID === expected.optionID
          && edition.value === expected.value && edition.label === expected.label && edition.priceKRW === expected.price)),
      "Native preview editions do not match published display facts.");
      const carts = await payload.find({ ...options, collection: "carts", limit: 2, where: cartWhere });
      const orders = await payload.find({ ...options, collection: "orders", limit: 2, where: orderWhere });
      if (orders.totalDocs > 0) {
        const order = orders.docs[0];
        const snapshot = commerceSnapshotSchema.safeParse(order?.commerceSnapshot);
        requireFixture(orders.totalDocs === 1 && order?.commerceAttemptID === ids.attempt && order.status === "processing"
          && carts.totalDocs === 1 && snapshot.success && snapshot.data.customerID === ids.user
          && snapshot.data.productID === ids.offer && snapshot.data.cartID === carts.docs[0]?.id,
        "Existing order or cart does not match the preview fixture.");
        return;
      }
      requireFixture(carts.totalDocs === 0, "Refusing to reuse an unidentified preview cart.");
      const items = [{ product: ids.offer, quantity: 1 }];
      const cart = await withCommerceWrite(owner, () => payload.create({ ...options, collection: "carts",
        data: { customer: ids.user, currency: "KRW", items } }));
      const snapshot = await buildCommerceSnapshot({ req: owner, cart, shippingAddress: {
        country: "KR", recipientName: "PREVIEW Member", phone: "01000000000", postalCode: "00000", addressLine1: address,
      } });
      const order = await withCommerceWrite(owner, () => payload.create({ ...options, collection: "orders", data: {
        commerceVersion: "commerce-v1", commerceAttemptID: ids.attempt, commerceSnapshot: snapshot,
        customer: ids.user, customerEmail: email, status: "processing", currency: snapshot.currency, amount: snapshot.totalAmount, items,
      } }));
      requireFixture(order.status === "processing" && order.commerceAttemptID === ids.attempt,
        "The preview order did not retain its fixture status and identity.");
    });
    // One synthetic owner document in Terms, so /terms exercises the rich-text policy path. Idempotent: an
    // existing fixture document is left alone, and anything else already in Terms is never replaced.
    const fixtureBusiness = await payload.findGlobal({ ...local, slug: businessSlug });
    requireFixture(Reflect.get(fixtureBusiness, "tradeName") === marker,
      "Refusing to add the policy document outside the preview business fixture.");
    const terms = Reflect.get(fixtureBusiness, "terms");
    if (!isPreviewPolicyDocument(terms)) {
      // Only an absent or null Terms value may be filled: any stored document, even one with no visible text,
      // is someone's and is never replaced.
      requireFixture(terms === undefined || terms === null, "Refusing to replace an existing Terms document.");
      await payload.updateGlobal({ ...local, slug: businessSlug, data: { terms: previewPolicyDocument } as never });
      const stored = await payload.findGlobal({ ...local, slug: businessSlug });
      requireFixture(isPreviewPolicyDocument(Reflect.get(stored, "terms")), "The preview Terms document was not retained.");
    }
    // A synthetic Team roster for /team, behind the same fixture gate (the business global is the preview
    // fixture, checked above). Idempotent; refuses any roster or account it didn't create.
    const roster = await ensurePreviewRoster({ payload, local, create, requireFixture });
    console.log(`PREVIEW Team roster: ${roster}.`);
    recordPhase("complete");
    console.log(`PREVIEW fixtures available: display editions, legacy offer, seller, member, one processing order, and the ${PREVIEW_POLICY_MARKER} in Terms.`);
  } finally {
    try { await payload.destroy(); }
    finally { await pool?.end(); }
  }
}

async function main() {
  const leaseIdentity = admit();
  const lock = join(lease, "seed-commerce-preview.lock");
  const fd = openSync(lock, "wx", 0o600);
  try { await seed(leaseIdentity); }
  finally {
    closeSync(fd);
    unlinkSync(lock);
  }
}

void main().catch((error: unknown) => {
  console.error("PREVIEW seed stopped:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
