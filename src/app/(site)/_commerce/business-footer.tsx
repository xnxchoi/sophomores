import { connection } from "next/server";
import { getPayload } from "payload";
import { Suspense, type ReactNode } from "react";
import { loadBusinessInformation, type BusinessFacts } from "@/payload/globals/business-info";
import { useTranslations } from "next-intl";
import { FooterLocaleSwitch } from "./footer-locale-switch";
import { SellerPolicyLinks } from "./seller-disclosure";

/**
 * Full width, left-aligned (Osklen study, owner 20 Nov: "legal only"): Terms · Privacy · Refund, then one thin strip of
 * business facts with EN / KO at its end. Help and Shipping live in the Help pill and the site menu, not here.
 * The legal links and the switch don't depend on the business-info read; the facts stream into the strip.
 * `bg-background` (owner, 21 Nov: "Use the seamless color"): the page's own colour, so nothing bands where the page ends.
 * Mersi's grain (texture-grain) lies over it, so the footer reads apart from the page while keeping its colour.
 */
export function BusinessFooterView({ children }: { children?: ReactNode }) {
  return (
    <footer data-themed="background-color" className="relative isolate bg-background px-gutter pt-10 pb-6 text-foreground md:pt-14 md:pb-8">
      <SellerPolicyLinks />
      <div className="mt-4 flex flex-col gap-2 border-t border-current/20 pt-3 md:flex-row md:items-start md:justify-between md:gap-10">
        <div className="min-w-0 flex-1">{children}</div>
        <div className="-mx-3 shrink-0"><FooterLocaleSwitch /></div>
      </div>
      {/* Mersi's grain over the page colour (--texture-grain), footer only. Mersi dodges it over a creme page; on our pages dodge
          can't show (white in light, near-black in dark), so light multiplies and dark screens. isolate keeps the blend in the footer,
          and -z-1 puts the grain under the text, over only the footer's colour (Review-B: over the text it cost ~7 % contrast).
          Two layers, the second half a tile off (owner, 21 Nov: "a bit more texture"), so the speckles don't coincide: about a
          third more texture than one layer. A contrast filter barely moved it; one layer stacked on itself nearly doubled it. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-1 bg-(image:--texture-grain) bg-size-[150px] bg-center mix-blend-multiply dark:mix-blend-screen" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-1 bg-(image:--texture-grain) bg-size-[150px] bg-position-[75px_75px] mix-blend-multiply dark:mix-blend-screen" />
    </footer>
  );
}

/** Korean shop form: every approved fact on one wrapping line. Nothing shows until all seven are published. */
export function BusinessFooterFacts({ facts }: { facts: BusinessFacts | null }) {
  const t = useTranslations("Interface.seller");
  if (!facts) return null;
  return (
    <section aria-label={t("section")}>
      <dl className="flex flex-wrap items-center gap-x-5 text-xs leading-relaxed text-foreground/65">
        <FooterFact label={t("name")}>{facts.tradeName}</FooterFact>
        <FooterFact label={t("representative")}>{facts.representative}</FooterFact>
        <FooterFact label={t("registrationNumber")}>{facts.businessRegistrationNumber}</FooterFact>
        <FooterFact label={t("mailOrderRegistrationNumber")}>{facts.mailOrderRegistration}</FooterFact>
        <FooterFact label={t("address")}>{facts.businessAddress}</FooterFact>
        <FooterFact label={t("phone")}>
          <a href={"tel:" + facts.customerServicePhone.replace(/[^\d+]/g, "")} className="inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{facts.customerServicePhone}</a>
        </FooterFact>
        <FooterFact label={t("email")}>
          <a href={"mailto:" + facts.customerServiceEmail} className="inline-flex min-h-11 max-w-full items-center break-all underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{facts.customerServiceEmail}</a>
        </FooterFact>
      </dl>
    </section>
  );
}

function FooterFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 min-w-0 items-center gap-1.5">
      <dt className="opacity-70">{label}</dt>
      <dd className="min-w-0 break-words text-foreground/90">{children}</dd>
    </div>
  );
}

export function BusinessFooter() {
  return (
    <BusinessFooterView>
      <Suspense fallback={null}>
        <PublishedBusinessFacts />
      </Suspense>
    </BusinessFooterView>
  );
}

/** Only approved data is streamed into the already-present footer. */
async function PublishedBusinessFacts() {
  await connection();
  let facts: BusinessFacts | null = null;
  try {
    // Lazy so the presentational view stays importable without Payload configuration.
    const { default: config } = await import("@payload-config");
    facts = (await loadBusinessInformation(await getPayload({ config }))).facts;
  }
  catch { console.error("Business information is unavailable."); }
  return <BusinessFooterFacts facts={facts} />;
}
