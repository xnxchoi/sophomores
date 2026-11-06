import { z } from "zod";

export type SellerInformation = Readonly<{
  name: string;
  registrationNumber: string;
  representative: string;
  address: string;
  /** Approved business contact; a mobile number does not satisfy PG review. */
  phone: string;
  mailOrderRegistrationNumber?: string;
}>;

export type ApprovedPolicy = Readonly<{
  effectiveDate: string;
  sections: readonly Readonly<{
    heading: string;
    paragraphs: readonly string[];
  }>[];
}>;

export type PolicyKey = "terms" | "privacy" | "refund";

export const policyTitles: Readonly<Record<PolicyKey, string>> = {
  terms: "이용약관",
  privacy: "개인정보처리방침",
  refund: "취소·환불 안내"
};

/**
 * Canonical disclosure owner for public surfaces and the payment server gate.
 * Populate only from approved seller documents and
 * approved policy copy, never copied footers or provider documentation.
 * null means unavailable, not a placeholder policy or review readiness.
 */
export const commerceDisclosure: Readonly<{
  seller: SellerInformation | null;
  policies: Readonly<Record<PolicyKey, ApprovedPolicy | null>>;
}> = {
  seller: {
    name: "리스토어드프로젝트",
    registrationNumber: "753-32-01007",
    representative: "최성윤",
    address:
      "서울특별시 송파구 올림픽로4길 15, 7동 705호(잠실동, 아시아선수촌아파트)",
    phone: "+82 10 4637 9289"
  },
  policies: { terms: null, privacy: null, refund: null }
};
const sellerInformationSchema = z.object({
  name: z.string().trim().min(1),
  registrationNumber: z
    .string()
    .trim()
    .regex(/^(?:\d{10}|\d{3}-\d{2}-\d{5})$/),
  representative: z.string().trim().min(1),
  address: z.string().trim().min(1),
  // Basic Korean non-mobile business-contact shape, not proof of ownership.
  phone: z
    .string()
    .trim()
    .regex(
      /^(?:(?:0|\+82[ -]?)(?:2|[3-6][1-5]|70|80)[ -]?\d{3,4}[ -]?\d{4}|1[568]\d{2}[ -]?\d{4})$/
    ),
  mailOrderRegistrationNumber: z.string().trim().min(1).optional()
});

const approvedPolicySchema = z.object({
  effectiveDate: z.iso
    .date()
    .refine((value) => Date.parse(value) <= Date.now(), {
      message: "Policy is not yet effective"
    }),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().min(1),
        paragraphs: z.array(z.string().trim().min(1)).min(1)
      })
    )
    .min(1)
});

/** Structural publication gate; actual seller facts and policy approval remain owner responsibilities. */
export const publishedCommerceDisclosureSchema = z.object({
  seller: sellerInformationSchema,
  policies: z.object({
    terms: approvedPolicySchema,
    privacy: approvedPolicySchema,
    refund: approvedPolicySchema
  })
});
