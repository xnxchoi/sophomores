import { connection } from "next/server";
import { getPayload } from "payload";
import { cache, Suspense, type ReactNode } from "react";
import { loadBusinessInformation, type BusinessFacts } from "@/payload/globals/business-info";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import type { SellerInformation } from "@/lib/commerce/disclosures";
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

/** The seven facts the footer shows, in the Korean shop-form order. */
const sellerFields = ["tradeName", "representative", "businessRegistrationNumber", "mailOrderRegistration", "businessAddress",
  "customerServicePhone", "customerServiceEmail"] as const satisfies readonly (keyof BusinessFacts)[];
export type FooterSellerFacts = Partial<BusinessFacts>;

/** Per field: the owner-edited global wins; the approved commerce disclosure fills what the global doesn't have yet. */
export function mergeSellerFacts(filled: Partial<BusinessFacts>, seller: SellerInformation | null): FooterSellerFacts | null {
  const disclosure: Partial<BusinessFacts> = seller ? {
    tradeName: seller.name, representative: seller.representative, businessRegistrationNumber: seller.registrationNumber,
    mailOrderRegistration: seller.mailOrderRegistrationNumber, businessAddress: seller.address,
    customerServicePhone: seller.phone, customerServiceEmail: seller.email,
  } : {};
  const merged = Object.fromEntries(sellerFields.flatMap((field) => {
    const value = filled[field] ?? disclosure[field];
    return value ? [[field, value]] : [];
  })) as FooterSellerFacts;
  return Object.keys(merged).length ? merged : null;
}

/**
 * Korean shop form: the seller's details on one wrapping line, in the footer only (owner, 21 Nov: "The seller information
 * thing should be on the footer ... it shouldn't be part of the fucking page"). A fact nobody has entered yet is left out,
 * never invented, and the server log names it (the owner fills it in Payload admin after launch).
 */
export function BusinessFooterFacts({ facts }: { facts: FooterSellerFacts | null }) {
  const t = useTranslations("Interface.seller");
  if (!facts) return null;
  return (
    <section id="seller-information" aria-label={t("section")} className="scroll-mt-header">
      <dl className="flex flex-wrap items-center gap-x-5 text-xs leading-relaxed text-foreground/65">
        {facts.tradeName && <FooterFact label={t("name")}>{facts.tradeName}</FooterFact>}
        {facts.representative && <FooterFact label={t("representative")}>{facts.representative}</FooterFact>}
        {facts.businessRegistrationNumber && <FooterFact label={t("registrationNumber")}>{facts.businessRegistrationNumber}</FooterFact>}
        {facts.mailOrderRegistration && <FooterFact label={t("mailOrderRegistrationNumber")}>{facts.mailOrderRegistration}</FooterFact>}
        {facts.businessAddress && <FooterFact label={t("address")}>{facts.businessAddress}</FooterFact>}
        {facts.customerServicePhone && <FooterFact label={t("phone")}>
          <a href={"tel:" + facts.customerServicePhone.replace(/[^\d+]/g, "")} className="inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{facts.customerServicePhone}</a>
        </FooterFact>}
        {facts.customerServiceEmail && <FooterFact label={t("email")}>
          <a href={"mailto:" + facts.customerServiceEmail} className="inline-flex min-h-11 max-w-full items-center break-all underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{facts.customerServiceEmail}</a>
        </FooterFact>}
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

/**
 * One read per request (React cache), shared by the footer and by pages that link to it, so a link to
 * #seller-information is drawn only when the footer draws its target. Independent reads: a failed business-info read
 * must not hide the approved disclosure. Missing facts are logged loudly; they don't block the page.
 */
export const loadFooterSellerFacts = cache(async (): Promise<FooterSellerFacts | null> => {
  let payload: Awaited<ReturnType<typeof getPayload>>;
  try {
    // Lazy so the presentational view stays importable without Payload configuration.
    const { default: config } = await import("@payload-config");
    payload = await getPayload({ config });
  }
  catch { console.error("Business information is unavailable."); return null; }
  let filled: Partial<BusinessFacts> = {};
  let seller: SellerInformation | null = null;
  try { filled = (await loadBusinessInformation(payload)).filled; }
  catch { console.error("Business information is unavailable."); }
  if (sellerFields.some((field) => !filled[field])) {
    try { seller = (await loadPublishedCommerceDisclosure(payload))?.seller ?? null; }
    catch { console.error("Published commerce information is unavailable."); }
  }
  const facts = mergeSellerFacts(filled, seller);
  const missing = sellerFields.filter((field) => !facts?.[field]);
  if (missing.length) console.error(`Seller details incomplete in the site footer; missing: ${missing.join(", ")}. Fill them in Payload admin (Business information).`);
  return facts;
});

/** Only approved data is streamed into the already-present footer. */
async function PublishedBusinessFacts() {
  await connection();
  return <BusinessFooterFacts facts={await loadFooterSellerFacts()} />;
}
