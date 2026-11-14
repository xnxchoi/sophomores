import english from "../../../messages/en.json";
import type { GlobalConfig, Payload } from "payload";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { z } from "zod";
import { staffWrite } from "../collections/access";

const label = english.Staff.schema;

/** Owner-maintained legal and business facts. Nothing is seeded or invented here. */
export const BusinessInfo: GlobalConfig = {
  slug: "business-info",
  label: label.businessInformation,
  admin: { description: label.businessInformationDescription },
  access: { read: staffWrite, update: staffWrite },
  fields: [
    { name: "tradeName", type: "text", label: label.tradeName },
    { name: "representative", type: "text", label: label.businessRepresentative },
    { name: "businessAddress", type: "text", label: label.businessAddress },
    { name: "businessRegistrationNumber", type: "text", label: label.businessRegistrationNumber },
    { name: "mailOrderRegistration", type: "text", label: label.mailOrderRegistration,
      admin: { description: label.mailOrderRegistrationDescription } },
    { name: "customerServicePhone", type: "text", label: label.customerServicePhone },
    { name: "customerServiceEmail", type: "email", label: label.customerServiceEmail },
    { name: "terms", type: "richText", label: label.termsOfUse },
    { name: "privacy", type: "richText", label: label.privacyPolicy },
    { name: "refund", type: "richText", label: label.refundShippingPolicy },
  ],
};

const fact = z.string().trim().min(1);
const factsSchema = z.object({
  tradeName: fact, representative: fact, businessAddress: fact, businessRegistrationNumber: fact,
  mailOrderRegistration: fact, customerServicePhone: fact, customerServiceEmail: z.email(),
});
export type BusinessFacts = z.infer<typeof factsSchema>;
export type BusinessPolicyKey = "terms" | "privacy" | "refund";
export type BusinessInformation = Readonly<{
  /** null until every required fact is filled. */
  facts: BusinessFacts | null;
  policies: Readonly<Record<BusinessPolicyKey, SerializedEditorState | null>>;
}>;

/** Lexical state counts as content only when it holds visible text. */
function hasText(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const value = node as { text?: unknown; children?: unknown; root?: unknown };
  if (typeof value.text === "string" && value.text.trim()) return true;
  if (value.root) return hasText(value.root);
  return Array.isArray(value.children) && value.children.some(hasText);
}

export function parseBusinessInformation(value: unknown): BusinessInformation {
  const doc = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const facts = factsSchema.safeParse(doc);
  const policy = (key: BusinessPolicyKey) => hasText(doc[key]) ? doc[key] as SerializedEditorState : null;
  return { facts: facts.success ? facts.data : null,
    policies: { terms: policy("terms"), privacy: policy("privacy"), refund: policy("refund") } };
}

/** Server-side public projection of the admin-only global. */
export async function loadBusinessInformation(payload: Payload): Promise<BusinessInformation> {
  return parseBusinessInformation(await payload.findGlobal({ slug: "business-info", depth: 0, overrideAccess: true }));
}
