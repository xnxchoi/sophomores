import english from "../../../messages/en.json";
import { randomUUID } from "node:crypto";
import { ecommercePlugin } from "@payloadcms/plugin-ecommerce";
import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeOperationHook, type CollectionConfig, type Endpoint, type Field, type PayloadRequest, type Plugin, type Where } from "payload";
import { z } from "zod";
import { isCmsSuperAdmin } from "../auth/access";
import { Orders } from "../../payload/collections/orders";
import { assertCommerceBrowserMutation, commerceAdmin, commerceAdminField, commerceOwnerRead, commerceServerField, commerceServerWrite } from "./access";
import { commerceProductSchema, commercePublicationSchema, loadCommerceCatalogue } from "./catalogue";
import { commerceSnapshotSchema, shippingAddressSchema } from "./contracts";
import { readCommerceJSON } from "./_shared/request-body";
import { inPaymentEndpoint, lockCommerce, readCommerce, relationshipID } from "./_shared/transaction";
import { settleReservation } from "./reservations";
import { grantOrderAdmissions } from "./guests";
import { assertPaymentRiskReviewed, flushDeferredPaymentRisk, portonePaymentAdapter } from "./portone/adapter";
import { isVerifiedCommerceWebhook } from "./portone/endpoints";
import { isVerifiedPaymentCancellation } from "./portone/review";

const deny = () => false;
const immutableFields = (fields: Field[]): Field[] => fields.map((field): Field => {
  if (field.type === "tabs") return { ...field, tabs: field.tabs.map((tab) => ({ ...tab, fields: immutableFields(tab.fields) })) };
  if ("fields" in field) return { ...field, fields: immutableFields(field.fields), ...("name" in field ? { access: { ...field.access, create: commerceServerField, update: commerceServerField } } : {}) } as Field;
  if (field.type === "ui" || field.type === "join") return field;
  return { ...field, access: { ...field.access, create: commerceServerField, update: commerceServerField }, admin: { ...field.admin, readOnly: true } } as Field;
});

const secureCart: CollectionBeforeChangeHook = async ({ req, data, originalDoc, operation }) => {
  const internal = commerceServerWrite(req);
  const owner = internal ? req.user?.id : await assertCommerceBrowserMutation(req);
  if (!owner || req.user?.collection !== "users") throw new APIError("Cart ownership required", 403);
  let current = originalDoc;
  if (operation === "update") {
    await lockCommerce(req, [`cart:${originalDoc.id}`]);
    current = await readCommerce(req, "carts", String(originalDoc.id));
  }
  if (current?.purchasedAt || (current?.customer && relationshipID(current.customer) !== String(owner))) throw new APIError("Cart is locked", 409);
  // Official finalization owns purchasedAt and inventory. A reserved sold-out
  // item must still settle at its immutable charge, not at a fresh quotation.
  if (internal && data.purchasedAt) return { ...data, customer: String(owner), currency: "KRW", items: current.items, subtotal: current.subtotal };
  if (!internal && operation === "update") {
    const active = await req.payload.find({ collection: "transactions" as never, req, overrideAccess: true, depth: 0, limit: 1,
      where: { and: [{ cart: { equals: current.id } }, { status: { in: ["pending", "processing"] } }] } });
    if (active.docs.length) throw new APIError("Resolve the existing payment before editing this cart", 409);
  }
  if (data.customer && relationshipID(data.customer) !== String(owner)) throw new APIError("Cart ownership mismatch", 403);
  // Payload beforeValidate restores omitted fields from the document (including
  // undefined values and virtual status). Presence is not submitted intent.
  if (!internal && ((data.purchasedAt != null && data.purchasedAt !== current?.purchasedAt)
    || (data.secret != null && data.secret !== current?.secret))) throw new APIError("Cart field is server owned", 403);
  if (data.currency && data.currency !== "KRW") throw new APIError("Unsupported currency", 400);
  const items = z.array(z.object({ id: z.string().optional(), product: z.union([z.string().min(1), z.object({ id: z.string().min(1) })]), quantity: z.int().min(1).max(3), variant: z.nullish(z.unknown()) })).max(1).parse(data.items ?? current?.items ?? []);
  let subtotal = 0;
  for (const item of items) {
    if (item.variant != null) throw new APIError("Variants unavailable", 400);
    const offer = await loadCommerceCatalogue({ req, productID: relationshipID(item.product) });
    if (!offer || item.quantity > offer.availableQuantity) throw new APIError("Offer unavailable", 409);
    subtotal += offer.priceKRW * item.quantity;
  }
  return { ...data, ...(operation === "create" ? { id: randomUUID() } : {}), customer: String(owner), currency: "KRW", items, subtotal };
};

const commerceOrderFields: Field[] = [
  { name: "commerceVersion", type: "select", defaultValue: "legacy", required: true, options: [{ label: english.Staff.schema.legacy, value: "legacy" }, { label: english.Staff.schema.commerceV1, value: "commerce-v1" }] },
  { name: "commerceAttemptID", type: "text", index: true },
  { name: "commerceSnapshot", type: "json" },
  { name: "fulfillment", type: "group", fields: [
    { name: "status", type: "select", options: [{ label: english.Staff.schema.pending, value: "pending" }, { label: english.Staff.schema.packed, value: "packed" }, { label: english.Staff.schema.shipped, value: "shipped" }, { label: english.Staff.schema.delivered, value: "delivered" }, { label: english.Staff.schema.returnRequested, value: "return-requested" }, { label: english.Staff.schema.returned, value: "returned" }], defaultValue: "pending" },
    { name: "carrier", type: "text" }, { name: "trackingNumber", type: "text" },
    { name: "shippedAt", type: "date" }, { name: "deliveredAt", type: "date" },
    { name: "returnDisposition", type: "select", options: [{ label: english.Staff.schema.pendingInspection, value: "pending-inspection" }, { label: english.Staff.schema.restock, value: "restock" }, { label: english.Staff.schema.doNotRestock, value: "do-not-restock" }] },
  ] },
];

function ordersOverride(defaultCollection: CollectionConfig): CollectionConfig {
  const legacyFields = Orders.fields.filter((field) => !("name" in field) || !["currency", "status"].includes(field.name)).map((field) => ({ ...field, required: false }) as Field);
  // The existing currency column may contain legacy USD receipts. Preserve its
  // enum, while commerce-v1 creation below still requires the KRW snapshot.
  const preserveLegacyFields = (entries: Field[]): Field[] => entries.map((field): Field => {
    if ("name" in field && field.name === "status" && field.type === "select") return {
      ...field, defaultValue: "pending", options: [...field.options, { label: english.Staff.schema.legacyPending, value: "pending" }, { label: english.Staff.schema.legacyPaid, value: "paid" }, { label: english.Staff.schema.legacyHeld, value: "held" }],
    };
    if ("name" in field && field.name === "currency" && field.type === "select") return { ...field, options: [...field.options, { label: english.Staff.schema.legacyUSD, value: "USD" }] };
    if ("fields" in field) return { ...field, fields: preserveLegacyFields(field.fields) } as Field;
    if (field.type === "tabs") return { ...field, tabs: field.tabs.map((tab) => ({ ...tab, fields: preserveLegacyFields(tab.fields) })) };
    return field;
  });
  const fields = preserveLegacyFields(defaultCollection.fields);
  return { ...defaultCollection,
    access: { admin: commerceAdmin, create: deny, update: deny, delete: deny,
      read: ({ req }) => {
        if (isCmsSuperAdmin(req.user)) return true;
        if (req.user?.collection !== "users") return false;
        const where: Where = { or: [{ customer: { equals: req.user.id } }, { user: { equals: req.user.id } }] };
        return where;
      } },
    fields: [...immutableFields([...fields, ...legacyFields, ...commerceOrderFields]), { name: "commerceOperations", type: "ui", admin: { components: { Field: "@/payload/admin/commerce/fields#OrderOperationsField" } } }],
    hooks: { ...defaultCollection.hooks, beforeChange: [...(defaultCollection.hooks?.beforeChange ?? []), ({ data, req, operation, originalDoc }) => {
      if (!commerceServerWrite(req) || (operation === "update" && originalDoc?.commerceVersion !== "commerce-v1")) throw new APIError("Order history is immutable", 403);
      if (operation === "create") {
        if (data.commerceVersion !== "commerce-v1" || !z.uuid().safeParse(data.commerceAttemptID).success) throw new APIError("Invalid commerce order", 400);
        const snapshot = commerceSnapshotSchema.parse(data.commerceSnapshot);
        if (data.amount !== snapshot.totalAmount || data.currency !== snapshot.currency || relationshipID(data.customer) !== snapshot.customerID || data.status !== "processing") throw new APIError("Order snapshot mismatch", 409);
        return { ...data, id: randomUUID(), commerceSnapshot: snapshot };
      }
      // Financial snapshots and identity never change during fulfillment workflows.
      if (Object.keys(data).some((key) => !["fulfillment", "updatedAt"].includes(key) && JSON.stringify(data[key]) !== JSON.stringify(originalDoc[key]))) throw new APIError("Financial order fields are immutable", 403);
      return data;
    }] },
  };
}

function transactionsOverride(defaultCollection: CollectionConfig): CollectionConfig {
  return { ...defaultCollection, access: { admin: commerceAdmin, create: deny, update: deny, delete: deny, read: commerceOwnerRead },
    fields: immutableFields([...defaultCollection.fields, { name: "commerceReviewHold", type: "checkbox", defaultValue: false, admin: { description: english.Staff.schema.verifiedPaymentRiskQuarantineNeverResetAutomatically } },
      { name: "commerceResolutionConflict", type: "checkbox", defaultValue: false, admin: { description: english.Staff.schema.authoritativePaymentConflictsWithARetiredAttemptOr } }]), hooks: { ...defaultCollection.hooks,
      beforeChange: [...(defaultCollection.hooks?.beforeChange ?? []), ({ data, req, operation, originalDoc }) => {
        if (!commerceServerWrite(req)) throw new APIError("Transaction is server owned", 403);
        const verifiedCancellation = originalDoc?.status === "succeeded" && data.status === "cancelled"
          && data.commerceReviewHold === true && isVerifiedPaymentCancellation(req, String(originalDoc.id));
        if (operation === "update" && ["succeeded", "failed", "refunded", "cancelled"].includes(originalDoc?.status) && data.status !== undefined && data.status !== originalDoc.status && !verifiedCancellation) throw new APIError("Terminal payment state cannot regress", 409);
        if (originalDoc?.commerceReviewHold === true && data.commerceReviewHold === false) throw new APIError("Payment review hold cannot be reset", 409);
        if (originalDoc?.commerceResolutionConflict === true && data.commerceResolutionConflict === false) throw new APIError("Payment resolution conflict cannot be reset", 409);
        return operation === "create" ? { ...data, id: data.id ?? randomUUID() } : data;
      }],
      afterChange: [...(defaultCollection.hooks?.afterChange ?? []), async ({ doc, previousDoc, req }) => {
        if (doc.status !== "succeeded" || previousDoc?.status === "succeeded") return doc;
        if (!commerceServerWrite(req) || !await req.transactionID) throw new Error("Settlement requires its active transaction");
        const orderID = relationshipID(doc.order);
        const order = await readCommerce(req, "orders", orderID);
        if (order.commerceVersion !== "commerce-v1") throw new Error("Legacy orders cannot grant commerce benefits");
        await settleReservation({ req, attemptID: String(order.commerceAttemptID), orderID });
        await grantOrderAdmissions({ req, orderID, transactionID: String(doc.id) });
        return doc;
      }],
    } };
}

// beforeOperation runs BEFORE field beforeValidate fills omitted values from a
// stale draft. A private request map records input intent, never body trust flags.
const productSubmittedKeys = new WeakMap<PayloadRequest, ReadonlySet<string>>();
const captureProductSubmission: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (["create", "update", "updateByID"].includes(operation) && "data" in args && args.data && typeof args.data === "object") {
    productSubmittedKeys.set(args.req, new Set(Object.keys(args.data)));
  }
  return args;
};

function productsOverride(defaultCollection: CollectionConfig): CollectionConfig {
  return { ...defaultCollection, access: { ...defaultCollection.access, admin: commerceAdmin, delete: deny },
    admin: { ...defaultCollection.admin, useAsTitle: "title" }, fields: [...defaultCollection.fields,
      { name: "title", type: "text", required: true }, { name: "description", type: "textarea", required: true },
      { name: "images", type: "array", fields: [{ name: "image", type: "upload", relationTo: "media", required: true }] },
      { name: "event", type: "relationship", relationTo: "commerce-events" as never, required: true },
      { name: "saleStartsAt", type: "date", required: true }, { name: "saleEndsAt", type: "date", required: true },
      { name: "dispatchSchedule", type: "textarea", required: true },
      { name: "shippingFeeKRW", type: "number", min: 0, required: true, validate: (value: unknown) => Number.isSafeInteger(value) || "Shipping must be an approved integer KRW amount" },
      { name: "publicationApproved", type: "checkbox", defaultValue: false },
      { name: "reservedQuantity", type: "number", defaultValue: 0, min: 0, access: { create: commerceServerField, update: commerceServerField }, admin: { readOnly: true } },
    ], hooks: { ...defaultCollection.hooks,
      beforeOperation: [captureProductSubmission, ...(defaultCollection.hooks?.beforeOperation ?? [])],
      beforeChange: [...(defaultCollection.hooks?.beforeChange ?? []), async ({ req, data, originalDoc, operation }) => {
      let current = originalDoc;
      let next: Record<string, unknown> = { ...data, reservedQuantity: 0 };
      if (operation === "update") {
        await lockCommerce(req, [`product:${originalDoc.id}`]);
        current = await req.payload.db.findOne({ collection: "products", where: { id: { equals: originalDoc.id } }, draftsEnabled: false, req });
        if (!current || !Number.isSafeInteger(current.inventory) || !Number.isSafeInteger(current.reservedQuantity)) throw new APIError("Canonical product inventory unavailable", 409);
        const inventoryChanged = productSubmittedKeys.get(req)?.has("inventory") === true && data.inventory !== originalDoc.inventory;
        if (inventoryChanged && originalDoc.inventory !== current.inventory) throw new APIError("Inventory changed; reload before adjusting stock", 409);
        const inventory = inventoryChanged ? data.inventory : current.inventory;
        if (!Number.isSafeInteger(inventory) || Number(inventory) < Number(current.reservedQuantity)) throw new APIError("Inventory cannot fall below active reservations", 409);
        // Never publish the stale draft's operational counters back to main.
        next = { ...data, inventory, reservedQuantity: current.reservedQuantity };
        if (data.event && relationshipID(data.event) !== relationshipID(current.event)) {
          const paid = await req.payload.find({ collection: "transactions" as never, req, overrideAccess: true, depth: 0, limit: 1,
            where: { and: [{ "items.product": { equals: current.id } }, { status: { in: ["pending", "processing", "succeeded"] } }] } });
          if (Number(current.reservedQuantity ?? 0) > 0 || paid.docs.length) throw new APIError("Release event is immutable after reservation or sale", 409);
        }
      }
      if (data._status === "published" && originalDoc?._status !== "published") {
        commercePublicationSchema.parse(await req.payload.findGlobal({ slug: "commerce-publication" as never, draft: false, overrideAccess: true, req }));
      }
      if (data._status === "published" || (originalDoc?._status === "published" && data._status !== "draft")) {
        commerceProductSchema.parse({ ...current, ...next, id: current?.id ?? data.id ?? "new", updatedAt: new Date().toISOString() });
      }
      return next;
    }] } };
}

const paymentBase = { cartID: z.uuid(), currency: z.literal("KRW").optional(), secret: z.null().optional() };
const initiateInput = z.strictObject({ ...paymentBase, attemptID: z.uuid(), shippingAddress: shippingAddressSchema });
const confirmInput = z.strictObject({ ...paymentBase, transactionID: z.uuid(), paymentID: z.string().regex(/^[a-f0-9]{32}$/) });

/** Wrap generated browser endpoints without replacing official cart/payment operations. */
const secureEndpoint = (endpoint: Endpoint): Endpoint => ({ ...endpoint, handler: async (req) => {
  if (endpoint.path.endsWith("/webhooks") || endpoint.path.endsWith("/pending") || (endpoint.path === "/payments/portone/result" && endpoint.method === "get")) return endpoint.handler(req);
  const originalText = req.text;
  try {
    if (!isVerifiedCommerceWebhook(req)) {
      await assertCommerceBrowserMutation(req);
      if (!endpoint.path.endsWith("/resume")) {
        const raw = await readCommerceJSON(req);
        const parsed = endpoint.path.endsWith("/initiate") ? initiateInput.parse(raw)
          : endpoint.path.endsWith("/confirm-order") ? confirmInput.parse(raw) : z.record(z.string(), z.unknown()).parse(raw);
        req.data = parsed;
        req.text = async () => JSON.stringify(parsed);
        if (endpoint.path.endsWith("/confirm-order")) {
          const confirmation = confirmInput.parse(parsed);
          await assertPaymentRiskReviewed(req, confirmation);
        }
      }
    }
    const response = endpoint.path.endsWith("/confirm-order") || endpoint.path.endsWith("/initiate")
      ? await inPaymentEndpoint(req, (ownedRequest) => endpoint.handler(ownedRequest))
      : await endpoint.handler(req);
    if (endpoint.path.endsWith("/confirm-order")) await flushDeferredPaymentRisk(req);
    return response;
  } catch (error) {
    if (endpoint.path.endsWith("/confirm-order")) {
      try { await flushDeferredPaymentRisk(req); }
      catch (reviewError) { error = reviewError; }
    }
    return Response.json({ success: false, error: { code: "COMMERCE_REJECTED", message: "Commerce request could not be completed." } },
      { status: error instanceof APIError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503, headers: { "Cache-Control": "private, no-store" } });
  } finally {
    req.text = originalText;
  }
} });

export const commercePlugin: Plugin = async (config) => {
  const plugin = ecommercePlugin({
    access: { isAdmin: commerceAdmin, adminOnlyFieldAccess: commerceAdminField,
      isAuthenticated: ({ req }) => req.user?.collection === "users", isCustomer: ({ req }) => req.user?.collection === "users",
      isDocumentOwner: commerceOwnerRead, adminOrPublishedStatus: async ({ req }) => {
        if (isCmsSuperAdmin(req.user)) return true;
        const publication = await req.payload.findGlobal({ slug: "commerce-publication" as never, draft: false, depth: 0, overrideAccess: true, req });
        const where: Where = { and: [{ _status: { equals: "published" } }, { publicationApproved: { equals: true } }] };
        return commercePublicationSchema.safeParse(publication).success ? where : false;
      }, publicAccess: deny },
    customers: { slug: "users" },
    // 3.92.1 sanitizePluginConfig turns addresses:false back into a truthy
    // object, and type generation unconditionally references its definition.
    // Keep that required schema inert: no address-book CRUD or retention path.
    addresses: { addressesCollectionOverride: ({ defaultCollection }) => ({ ...defaultCollection,
      admin: { ...defaultCollection.admin, hidden: true }, endpoints: [],
      access: { admin: deny, create: deny, read: deny, update: deny, delete: deny },
      hooks: { ...defaultCollection.hooks, beforeChange: [() => { throw new APIError("Address books are disabled", 403); }] },
    }) },
    currencies: { defaultCurrency: "KRW", supportedCurrencies: [{ code: "KRW", decimals: 0, label: english.Staff.schema.koreanWon, symbol: "₩" }] },
    inventory: true, products: { variants: false, productsCollectionOverride: ({ defaultCollection }) => productsOverride(defaultCollection) },
    carts: { allowGuestCarts: false, cartsCollectionOverride: ({ defaultCollection }) => ({ ...defaultCollection,
      access: { ...defaultCollection.access, admin: commerceAdmin, delete: deny },
      fields: defaultCollection.fields.map((field): Field => (field.type === "text" || field.type === "date" || field.type === "relationship")
        && ["secret", "purchasedAt", "customer"].includes(field.name) ? { ...field, access: { ...field.access,
          create: field.name === "secret" ? deny : commerceServerField, update: field.name === "secret" ? deny : commerceServerField } } : field),
      endpoints: (Array.isArray(defaultCollection.endpoints) ? defaultCollection.endpoints : []).filter((endpoint) => !endpoint.path.includes("merge")).map(secureEndpoint),
      hooks: { ...defaultCollection.hooks, beforeChange: [secureCart] } }) },
    orders: { ordersCollectionOverride: ({ defaultCollection }) => ordersOverride(defaultCollection) },
    transactions: { transactionsCollectionOverride: ({ defaultCollection }) => transactionsOverride(defaultCollection) },
    payments: { paymentMethods: [portonePaymentAdapter] },
  });
  const result = await plugin({ ...config, collections: [...(config.collections ?? [])], endpoints: [...(config.endpoints ?? [])] });
  return { ...result, endpoints: (result.endpoints ?? []).map((endpoint) => endpoint.path.startsWith("/payments/") ? secureEndpoint(endpoint) : endpoint) };
};
