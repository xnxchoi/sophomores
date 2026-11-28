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
      {/* Four across from lg in the Korean form's order; the address takes two columns, so the seven close two rows. */}
      <dl className="grid gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        {facts.tradeName && <InfoItem label={t("name")}>{facts.tradeName}</InfoItem>}
        {facts.representative && <InfoItem label={t("representative")}>{facts.representative}</InfoItem>}
        {facts.bizNum && <InfoItem label={t("registrationNumber")}>{facts.bizNum}</InfoItem>}
        {facts.mailOrderRegistration && <InfoItem label={t("mailOrderNum")}>{facts.mailOrderRegistration}</InfoItem>}
        {facts.businessAddress && (
          <InfoItem label={t("address")} wide>
            {facts.businessAddress}
          </InfoItem>
        )}
        {facts.customerServicePhone && (
          <InfoItem label={t("phone")}>
            <FactLink href={"tel:" + facts.customerServicePhone.replace(/[^\d+]/g, "")}>{facts.customerServicePhone}</FactLink>
          </InfoItem>
        )}
        {facts.customerServiceEmail && (
          <InfoItem label={t("email")}>
            <FactLink href={"mailto:" + facts.customerServiceEmail}>{facts.customerServiceEmail}</FactLink>
          </InfoItem>
        )}
      </dl>
    </section>
  );
}

/**
 * A tiny label over its value (uppercase, 0.06em), in --color-footer-muted on the footer ground. Owner, 28 Nov: the
 * footer at about a third of its size; 11 and 13 px would be 4 px, so both sit on the 9 px floor.
 */
function InfoItem({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", wide && "sm:col-span-2")}>
      <dt className="text-[9px] leading-3 tracking-[0.06em] text-footer-muted uppercase">{label}</dt>
      <dd className="min-w-0 text-[9px] leading-3 break-words text-foreground">{children}</dd>
    </div>
  );
}

/** A 44 px target around a 12 px line: the negative margin keeps the rows as tight as the plain facts. */
function FactLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group/focus -my-4 inline-flex min-h-11 max-w-full items-center break-all underline decoration-current/40 underline-offset-4 hover:decoration-current"
    >
      <FocusShape className="outline-offset-4">{children}</FocusShape>
    </Link>
  );
}
