import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { cn } from "@/lib/utils";
import type { FooterSellerFacts } from "@/lib/site-info/seller-facts";

/**
 * Korean shop form: the seller's details in the footer only (owner, 21 Nov: "The seller information thing should be on
 * the footer ... it shouldn't be part of the fucking page"). A fact nobody has entered yet is left out, never invented,
 * and the server log names it (the owner fills it in Payload admin after launch).
 */
export function CommerceInfo({ facts }: { facts: FooterSellerFacts | null }) {
  const t = useTranslations("Interface.seller");
  if (!facts) return null;
  return (
    <section id="seller-information" aria-label={t("section")} className="scroll-mt-header">
      {/* One compact block in the Korean form's order (Courtney, 28 Nov: the stacked pairs were a long, sparse column):
          label and value on one row, the labels' column at most 45 % wide (a longer label wraps), the value column
          taking the rest, where the address and email wrap. The same block on every width. The phone's target reaches
          32 px up, and the legal links' targets reach 1 px short of this block; each plain row above the phone covers
          16 px of that reach, so the block reserves the rest (Review-B, 28 Nov): 32 px with no row above the phone,
          16 px with one, nothing from two. */}
      <dl
        className={cn(
          "grid max-w-[40rem] grid-cols-[fit-content(45%)_minmax(0,1fr)] gap-x-3 gap-y-1",
          facts.customerServicePhone && rowsAbovePhone(facts) === 0 && "pt-8",
          facts.customerServicePhone && rowsAbovePhone(facts) === 1 && "pt-4"
        )}
      >
        {facts.tradeName && <InfoItem label={t("name")}>{facts.tradeName}</InfoItem>}
        {facts.representative && <InfoItem label={t("representative")}>{facts.representative}</InfoItem>}
        {facts.bizNum && <InfoItem label={t("registrationNumber")}>{facts.bizNum}</InfoItem>}
        {facts.mailOrderRegistration && <InfoItem label={t("mailOrderNum")}>{facts.mailOrderRegistration}</InfoItem>}
        {facts.businessAddress && <InfoItem label={t("address")}>{facts.businessAddress}</InfoItem>}
        {facts.customerServicePhone && (
          <InfoItem label={t("phone")}>
            <FactLink reach="up" href={"tel:" + facts.customerServicePhone.replace(/[^\d+]/g, "")}>{facts.customerServicePhone}</FactLink>
          </InfoItem>
        )}
        {facts.customerServiceEmail && (
          <InfoItem label={t("email")}>
            <FactLink reach="down" href={"mailto:" + facts.customerServiceEmail}>{facts.customerServiceEmail}</FactLink>
          </InfoItem>
        )}
      </dl>
    </section>
  );
}

/** How many plain fact rows sit above the phone row (the facts print in this fixed order; a missing one is left out). */
function rowsAbovePhone(facts: FooterSellerFacts): number {
  return [facts.tradeName, facts.representative, facts.bizNum, facts.mailOrderRegistration, facts.businessAddress].filter(Boolean).length;
}

/**
 * A tiny label beside its value (uppercase, 0.06em), in --color-footer-muted (10.4:1 on the flat gunmetal; see footer-shell for the grain); one row of the block's
 * shared columns (subgrid). Owner, 28 Nov: the footer at about a third of its size; 11 and 13 px would be 4 px, so both
 * sit on the 9 px floor.
 */
function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="col-span-2 grid grid-cols-subgrid items-baseline">
      <dt className="text-[9px] leading-3 tracking-[0.06em] text-footer-muted uppercase">{label}</dt>
      <dd className="min-w-0 text-[9px] leading-3 break-words text-foreground">{children}</dd>
    </div>
  );
}

/**
 * A 44 px target on a 12 px line, with the negative margin keeping the row as tight as the plain facts. The phone and
 * email rows are adjacent (16 px apart), so their targets must not cross (Santa review, 28 Nov: the email's box covered
 * the phone number): the phone's reaches up over the plain rows above it, the email's down into the footer's foot.
 */
function FactLink({ href, reach, children }: { href: string; reach: "up" | "down"; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/focus inline-flex min-h-11 min-w-11 max-w-full break-all underline decoration-current underline-offset-4 hover:decoration-current",
        reach === "up" ? "-mt-8 items-end" : "-mb-8 items-start"
      )}
    >
      <FocusShape className="outline-offset-4">{children}</FocusShape>
    </Link>
  );
}
