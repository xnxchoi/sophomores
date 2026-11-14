import english from "../../../messages/en.json";
import { z } from "zod";
import type { CollectionSlug, GlobalConfig, GlobalSlug, Payload, PayloadRequest } from "payload";
import { publishedCommerceDisclosureSchema } from "./disclosures";
import { commerceSnapshotSchema, type CommerceSnapshot, type ShippingAddress } from "./contracts";
import { commerceAdmin } from "./access";

const relation = z.union([z.string().min(1), z.object({ id: z.string().min(1) })]).transform((value) => typeof value === "string" ? value : value.id);
export const commerceProductSchema = z.object({
  id: z.string().min(1), title: z.string().trim().min(1), description: z.string().trim().min(1),
  images: z.array(z.object({ image: z.union([z.string().min(1), z.object({ id: z.string(), url: z.string().optional(), alt: z.string().nullish() })]) })).min(1),
  _status: z.literal("published"), publicationApproved: z.literal(true), event: relation,
  saleStartsAt: z.iso.datetime({ offset: true }), saleEndsAt: z.iso.datetime({ offset: true }),
  dispatchSchedule: z.string().trim().min(1), shippingFeeKRW: z.int().min(0),
  inventory: z.int().min(0), reservedQuantity: z.int().min(0),
  priceInKRWEnabled: z.literal(true), priceInKRW: z.int().min(1), updatedAt: z.string().min(1),
}).refine((product) => Date.parse(product.saleStartsAt) < Date.parse(product.saleEndsAt));

export const commercePublicationSchema = z.object({
  _status: z.literal("published"), publicationApproved: z.literal(true),
  physicalProductApproved: z.literal(true), fulfillmentReady: z.literal(true),
  addressRetentionApproved: z.literal(true), shippingCountries: z.array(z.literal("KR")).min(1),
  disclosure: publishedCommerceDisclosureSchema,
});

/** No approved facts are seeded. Saving a draft never opens purchasing. */
export const CommercePublication: GlobalConfig = {
  slug: "commerce-publication", label: english.Staff.schema.commercePublicationAndPolicies,
  access: { read: commerceAdmin, update: commerceAdmin },
  versions: { drafts: true },
  fields: [
    { name: "publicationApproved", type: "checkbox", defaultValue: false },
    { name: "physicalProductApproved", type: "checkbox", defaultValue: false },
    { name: "fulfillmentReady", type: "checkbox", defaultValue: false },
    { name: "addressRetentionApproved", type: "checkbox", defaultValue: false },
    { name: "shippingCountries", type: "select", hasMany: true, options: [{ label: english.Staff.schema.korea, value: "KR" }] },
    { name: "disclosure", type: "json", admin: { description: english.Staff.schema.ownerApprovedSellerInformationAndTermsPrivacyAnd } },
  ],
  hooks: { beforeChange: [({ data }) => {
    if (data._status === "published") commercePublicationSchema.parse(data);
    return data;
  }] },
};

const eventSchema = z.object({ id: z.string(), name: z.string().min(1), publicationApproved: z.literal(true),
  partIStartsAt: z.string().min(1), updatedAt: z.string().min(1),
  capacity: z.int().min(0), committedQuantity: z.int().min(0), reservedQuantity: z.int().min(0) });

export type CommerceOffer = Readonly<{
  productID: string; title: string; description: string;
  images: readonly Readonly<{ image: string | Readonly<{ id: string; url?: string; alt?: string | null }> }>[];
  priceKRW: number; maximumQuantity: 3; saleStartsAt: string; saleEndsAt: string;
  dispatchSchedule: string; shippingFeeKRW: number; availableQuantity: number;
  productVersion: string; eventVersion: string;
  event: Readonly<{ id: string; title: string; eventStartsAt: string }>;
  publication: z.infer<typeof commercePublicationSchema>;
}>;

/** Standalone policies do not depend on a purchasable product or sale window.
 * This server-owned projection intentionally reads the admin-only global and
 * returns only the validated, explicitly approved publication disclosure.
 */
export async function loadPublishedCommerceDisclosure(payload: Payload, req?: PayloadRequest) {
  const publication = commercePublicationSchema.safeParse(await payload.findGlobal({
    slug: "commerce-publication" as GlobalSlug, draft: false, depth: 0,
    overrideAccess: true, req,
  }));
  return publication.success ? publication.data.disclosure : null;
}

/** Reads published CMS state only; importing this module never initializes Payload. */
export async function loadCommerceOffer(payload: Payload, req?: PayloadRequest, productID?: string, now = Date.now()): Promise<CommerceOffer | null> {
  const publication = commercePublicationSchema.safeParse(await payload.findGlobal({ slug: "commerce-publication" as GlobalSlug, draft: false, depth: 0, overrideAccess: true, req }));
  if (!publication.success) return null;
  const products = await payload.find({ collection: "products" as CollectionSlug, draft: false, depth: 1, limit: 2,
    overrideAccess: true, req, where: { and: [{ _status: { equals: "published" } }, { publicationApproved: { equals: true } }, ...(productID ? [{ id: { equals: productID } }] : [])] } });
  // Multiple configured releases need an explicit product selection, never a first-row fallback.
  if (products.docs.length !== 1) return null;
  const parsed = commerceProductSchema.safeParse(products.docs[0]);
  if (!parsed.success) return null;
  const product = parsed.data;
  if (now < Date.parse(product.saleStartsAt) || now >= Date.parse(product.saleEndsAt)) return null;
  const event = eventSchema.safeParse(await payload.findByID({ collection: "commerce-events" as CollectionSlug,
    id: product.event, depth: 0, overrideAccess: true, req }));
  if (!event.success) return null;
  return { productID: product.id, title: product.title, description: product.description, images: product.images,
    priceKRW: product.priceInKRW, maximumQuantity: 3, saleStartsAt: product.saleStartsAt, saleEndsAt: product.saleEndsAt,
    dispatchSchedule: product.dispatchSchedule, shippingFeeKRW: product.shippingFeeKRW,
    availableQuantity: Math.max(0, Math.min(product.inventory - product.reservedQuantity,
      event.data.capacity - event.data.committedQuantity - event.data.reservedQuantity)),
    productVersion: product.updatedAt, eventVersion: event.data.updatedAt,
    event: { id: event.data.id, title: event.data.name, eventStartsAt: event.data.partIStartsAt }, publication: publication.data };
}
export const isCommerceReady = (offer: CommerceOffer | null): offer is CommerceOffer => offer !== null;
export function loadCommerceCatalogue({ req, productID, now }: { req: PayloadRequest; productID?: string; now?: number }) {
  return loadCommerceOffer(req.payload, req, productID, now);
}

export async function buildCommerceSnapshot({ req, cart, shippingAddress }: {
  req: PayloadRequest; cart: unknown; shippingAddress: ShippingAddress;
}): Promise<CommerceSnapshot> {
  const parsed = z.object({ id: z.string(), customer: relation, currency: z.literal("KRW"), purchasedAt: z.nullish(z.string()),
    items: z.array(z.object({ product: relation, quantity: z.int().min(1).max(3), variant: z.nullish(z.unknown()) })).length(1) }).parse(cart);
  const item = parsed.items[0];
  // Sunday launch: one unit per purchase. Stored older snapshots still parse at 1-3.
  if (item?.quantity !== 1) throw new Error("Only one unit per purchase");
  if (!item || parsed.purchasedAt || item.variant != null || req.user?.collection !== "users" || String(req.user.id) !== parsed.customer) throw new Error("Cart is not available");
  const offer = await loadCommerceCatalogue({ req, productID: item.product });
  if (!offer || item.quantity > offer.availableQuantity) throw new Error("Offer is not available");
  return commerceSnapshotSchema.parse({ version: 1, customerID: parsed.customer, cartID: parsed.id,
    productID: offer.productID, eventID: offer.event.id, releaseID: offer.productID, quantity: item.quantity,
    currency: "KRW", unitAmount: offer.priceKRW, shippingAmount: offer.shippingFeeKRW,
    totalAmount: offer.priceKRW * item.quantity + offer.shippingFeeKRW, orderName: offer.title,
    shippingAddress, productVersion: offer.productVersion, eventVersion: offer.eventVersion });
}
