import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadCommerceEditionOffer, loadPublishedCommerceEditions, type CommerceEditionOffer } from "@/lib/commerce/editions";
import { CommerceProductView } from "@/components/commerce/book-offer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return { title: t("shop"), robots: { index: false, follow: false } };
}

/** One native product on its own page (each edition is its own product). Display facts from E1; purchase not open yet. */
export default async function ShopProductPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  let product: Parameters<typeof CommerceProductView>[0]["product"] = null;
  let offer: CommerceEditionOffer | null = null;
  try {
    const payload = await getPayload({ config });
    const [catalogue, edition] = await Promise.all([loadPublishedCommerceEditions(payload, undefined, id), loadCommerceEditionOffer(payload, id)]);
    // Both server reads must agree on the product, or nothing is shown (fails closed).
    if (catalogue.status === "displayable" && edition && catalogue.product.productID === edition.productID) { product = catalogue.product; offer = edition; }
  } catch {
    console.error("Published product information is unavailable.");
  }
  return <div className="min-h-dvh bg-background text-foreground"><CommerceProductView product={product} offer={offer} /></div>;
}
