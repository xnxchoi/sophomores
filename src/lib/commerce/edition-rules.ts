import { z } from "zod";

// Keep recorded rule versions immutable. A new policy gets a new version.
const editionRuleV1 = {
  "book-only": { priceKRW: 35_000, bundle: false },
  personal: { priceKRW: 82_000, bundle: true },
  premium: { priceKRW: 329_000, bundle: true },
} as const;
const editionKind = z.enum(["book-only", "personal", "premium"]);

export const editionRuleFacts = {
  editionRuleVersion: z.literal(1),
  editionKind,
  maximumQuantity: z.literal(1),
  editionEntitlements: z.strictObject({
    membershipSignet: z.boolean(),
    freeLaunchTicket: z.boolean(),
  }),
};

export function resolveEditionRule(optionValue: string, priceKRW: number) {
  const kind = editionKind.safeParse(optionValue);
  if (!kind.success) return null;
  const rule = editionRuleV1[kind.data];
  if (priceKRW !== rule.priceKRW) return null;
  return {
    editionRuleVersion: 1,
    editionKind: kind.data,
    maximumQuantity: 1,
    editionEntitlements: { membershipSignet: rule.bundle, freeLaunchTicket: rule.bundle },
  } as const;
}

type EditionRuleFacts = z.infer<z.ZodObject<typeof editionRuleFacts>>;

export function matchesRecordedEditionRule(facts: EditionRuleFacts & { unitAmount: number }) {
  // This validator is for v1 only; the consuming schemas require exactly v1.
  const rule = editionRuleV1[facts.editionKind];
  return facts.unitAmount === rule.priceKRW &&
    facts.editionEntitlements.membershipSignet === rule.bundle &&
    facts.editionEntitlements.freeLaunchTicket === rule.bundle;
}
