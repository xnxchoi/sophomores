import { cache } from "react";
import { getPayload } from "@/payload";
import { type BusinessFacts, loadBusinessInformation } from "@/payload/globals/business-info";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import type { SellerInformation } from "@/lib/commerce/disclosures";
import { type FooterSellerFacts, mergeSellerFacts, sellerFields } from "./seller-facts";

/**
 * The footer's seller facts, read once per request (React cache). The two reads are independent: a failed business-info
 * read must not hide the approved disclosure. Missing facts are logged loudly; they don't block the page. A Payload that
 * can't start is not caught here: the site layout already needs it.
 */
export const loadSellerFacts = cache(async (): Promise<FooterSellerFacts | null> => {
  const payload = await getPayload();
  let filled: Partial<BusinessFacts> = {};
  let seller: SellerInformation | null = null;
  try {
    filled = (await loadBusinessInformation(payload)).filled;
  } catch {
    console.error("Business information is unavailable.");
  }
  if (sellerFields.some((field) => !filled[field])) {
    try {
      seller = (await loadPublishedCommerceDisclosure(payload))?.seller ?? null;
    } catch {
      console.error("Published commerce information is unavailable.");
    }
  }
  const facts = mergeSellerFacts(filled, seller);
  const missing = sellerFields.filter((field) => !facts?.[field]);
  if (missing.length)
    console.error(
      `Seller details incomplete in the site footer; missing: ${missing.join(", ")}. Fill them in Payload admin (Business information).`
    );
  return facts;
});
