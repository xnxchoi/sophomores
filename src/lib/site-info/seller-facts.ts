import type { BusinessFacts } from "@/payload/globals/business-info";
import type { SellerInformation } from "@/lib/commerce/disclosures";

/** The seven facts the footer shows, in the Korean shop-form order. */
export const sellerFields = [
  "tradeName",
  "representative",
  "bizNum",
  "mailOrderRegistration",
  "businessAddress",
  "customerServicePhone",
  "customerServiceEmail"
] as const satisfies readonly (keyof BusinessFacts)[];
export type FooterSellerFacts = Partial<BusinessFacts>;

/** Per field: the owner-edited global wins; the approved commerce disclosure fills what the global doesn't have yet. */
export function mergeSellerFacts(
  filled: Partial<BusinessFacts>,
  seller: SellerInformation | null
): FooterSellerFacts | null {
  const disclosure: Partial<BusinessFacts> = seller
    ? {
        tradeName: seller.name,
        representative: seller.representative,
        bizNum: seller.registrationNumber,
        mailOrderRegistration: seller.mailOrderNum,
        businessAddress: seller.address,
        customerServicePhone: seller.phone,
        customerServiceEmail: seller.email
      }
    : {};
  const merged = Object.fromEntries(
    sellerFields.flatMap((field) => {
      const value = filled[field] ?? disclosure[field];
      return value ? [[field, value]] : [];
    })
  ) as FooterSellerFacts;
  return Object.keys(merged).length ? merged : null;
}
