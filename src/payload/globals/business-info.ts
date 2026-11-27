import english from "../../../messages/en.json";
import type { GlobalConfig, Payload } from "payload";
import { EXPERIMENTAL_TableFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { z } from "zod";
import { staffWrite } from "../collections/access";

const label = english.Staff.schema;
// Policies can need a table (fees, deadlines, retention periods). Tables are added on these three fields
// only; every other rich-text field keeps the site's default editor. Payload marks the feature experimental.
const policyEditor = lexicalEditor({ features: ({ defaultFeatures }) => [...defaultFeatures, EXPERIMENTAL_TableFeature()] });

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
    { name: "bizNum", type: "text", label: label.bizNum },
    { name: "mailOrderRegistration", type: "text", label: label.mailOrderRegistration,
      admin: { description: label.mailOrderRegistrationDescription } },
    { name: "customerServicePhone", type: "text", label: label.customerServicePhone },
    { name: "customerServiceEmail", type: "email", label: label.customerServiceEmail },
    { name: "terms", type: "richText", label: label.termsOfUse, editor: policyEditor, localized: true },
    { name: "privacy", type: "richText", label: label.privacyPolicy, editor: policyEditor, localized: true },
    { name: "refund", type: "richText", label: label.refundShippingPolicy, editor: policyEditor, localized: true },
  ],
};

const fact = z.string().trim().min(1);
const factsSchema = z.object({
  tradeName: fact, representative: fact, businessAddress: fact, bizNum: fact,
  mailOrderRegistration: fact, customerServicePhone: fact, customerServiceEmail: z.email(),
});
export type BusinessFacts = z.infer<typeof factsSchema>;
export type BusinessPolicyKey = "terms" | "privacy" | "refund";
export type BusinessInformation = Readonly<{
  /** null until every required fact is filled. */
  facts: BusinessFacts | null;
  /** Each required fact that is filled on its own, so a partly completed global still shows what it has. */
  filled: Partial<BusinessFacts>;
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
  const filled = Object.fromEntries(Object.entries(factsSchema.shape)
    .flatMap(([key, schema]) => { const value = schema.safeParse(doc[key]); return value.success ? [[key, value.data]] : []; })) as Partial<BusinessFacts>;
  return { facts: facts.success ? facts.data : null, filled,
    policies: { terms: policy("terms"), privacy: policy("privacy"), refund: policy("refund") } };
}

/**
 * Server-side public projection of the admin-only global. The policies are localized (owner, 20 Nov:
 * "Separate fields for the policy pages"); the facts are one value for both languages. Without a locale
 * Payload reads the default (en).
 *
 * Korean falls back to English when it has no text, matching the site's rule for an empty Korean string.
 * Payload's own `fallback: true` covers a Korean field that was never saved (null). A Korean document saved
 * blank isn't null, so Payload keeps it; only then is English read and used for that policy. If that
 * read fails, the Korean read stands as it was.
 */
export async function loadBusinessInformation(payload: Payload, locale?: "en" | "ko"): Promise<BusinessInformation> {
  const read = (code?: "en" | "ko") => payload.findGlobal({ slug: "business-info", depth: 0, overrideAccess: true,
    ...(code ? { locale: code } : {}) }) as Promise<unknown>;
  const raw = await read(locale);
  const info = parseBusinessInformation(raw);
  const doc = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const blank = (key: BusinessPolicyKey) => doc[key] != null && info.policies[key] === null;
  if (locale !== "ko" || !(blank("terms") || blank("privacy") || blank("refund"))) return info;
  let englishPolicies: BusinessInformation["policies"];
  // If the English read fails, keep the first read: the blank policy shows the page's approved fallback.
  try { englishPolicies = parseBusinessInformation(await read("en")).policies; }
  catch { console.error("English policy text is unavailable."); return info; }
  const pick = (key: BusinessPolicyKey) => blank(key) ? englishPolicies[key] : info.policies[key];
  return { facts: info.facts, filled: info.filled, policies: { terms: pick("terms"), privacy: pick("privacy"), refund: pick("refund") } };
}
