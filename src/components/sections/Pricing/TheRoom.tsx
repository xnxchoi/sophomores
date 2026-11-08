import { MarkerLink } from "@/components/UX/MarkerStroke";
import { MembershipBand } from "./MembershipBand";
import type { Benefit } from "./BenefitList";
import type { ResolvedPlan } from "@/app/(frontend)/(site)/(pages)/plans/getPlansData";
import s from "./Pricing.module.scss";

export type TheRoomProps = {
  plans: ResolvedPlan[];
};

/**
 * Single-identity composition: Patron is the membership; Resident appears
 * as a one-line on-ramp underneath. Cofounder Plans are filtered out by
 * getPlansData() at the data layer (Track A), so this component never sees
 * one even if a cofounder Plan exists in the admin.
 *
 * INTERIM heuristic — patron-exclusivity is derived from feature label text
 * with word-boundary anchors. Each keyword targets a specific seed feature
 * label so an admin editor can predict the match:
 *
 *   patron       → "Patron-only quarterly print"
 *   quarterly    → "Patron-only quarterly print"
 *   demimonde    → "Demimonde — the address two days before"
 *   drop         → "Priority access to drops"
 *   address      → "Demimonde — the address two days before"
 *
 * Word boundaries (\b) prevent over-match on substrings like "Drop shipping",
 * "Address book", "Patronage". The right long-term fix is a
 * `patronOnly: boolean` field on Plan features in Payload — that's a
 * schema change with migration overhead and is out of scope here.
 */
const PATRON_KEYWORDS =
  /\bpatron\b|\bquarterly\b|\bdemimonde\b|\bdrop\b|\baddress\b/i;

export function TheRoom({ plans }: TheRoomProps) {
  const patron = plans.find((p) => p.tier === "patron");
  const resident = plans.find((p) => p.tier === "resident");

  if (!patron) return null;

  const benefits: Benefit[] = patron.features
    .filter((f) => f.included)
    .map((f) => ({
      label: f.label,
      patronOnly: PATRON_KEYWORDS.test(f.label)
    }));

  return (
    <section aria-label="Patron membership" className={s.theRoom}>
      <MembershipBand
        variant="page"
        tierLabel={patron.tier_label}
        priceDisplay={patron.price.display}
        validityLabel={
          patron.validity === "lifetime" ? "lifetime · once" : "per year"
        }
        description={patron.description}
        benefits={benefits}
        ctaLabel="Request access"
        ctaHref={`/checkout?plan=${encodeURIComponent(patron.id)}`}
      />
      {resident ? (
        <p className={s.residentOnRamp}>
          <span className={s.residentMuted}>Or start as a Resident — </span>
          <MarkerLink
            href={`/checkout?plan=${encodeURIComponent(resident.id)}`}
            variant="underline"
          >
            {resident.price.display} / year, same door, smaller key.
          </MarkerLink>
        </p>
      ) : null}
    </section>
  );
}
