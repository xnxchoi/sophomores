import type { PurchaseAllowance } from "@/components/commerce/checkout";

/**
 * Legacy (pre-native) offers are closed to new purchases (owner, 22 Nov: no legacy compatibility; no past orders exist).
 * Legacy products have no E1 edition offer, so none is read for them. Native products are shown from E1 on their own pages
 * and in `/shop/checkout?product=<id>`, display-only until native settlement. Retained-attempt recovery is unaffected.
 */
export const legacyPurchaseAllowance: PurchaseAllowance = { source: "server", perAccount: 0, singleMembershipToken: false, includesAdmission: false };
