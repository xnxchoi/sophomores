import { connection } from "next/server";
import { getPayload } from "payload";
import { cache, Suspense, type ReactNode } from "react";
import { loadBusinessInformation, type BusinessFacts } from "@/payload/globals/business-info";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import type { SellerInformation } from "@/lib/commerce/disclosures";
import { useTranslations } from "next-intl";
import { FooterLocaleSwitch } from "./footer-locale-switch";
import { SellerPolicyLinks } from "./seller-disclosure";
import { SellerFactsGate } from "./seller-facts-gate";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { cn } from "@/lib/utils";

/**
 * The layer the lifted page reveals (Osklen study, owner 20 Nov: "legal only"): Terms · Privacy · Refund with EN / KO at
 * the row's end, then the business facts under one hairline. Help and Shipping live in the Help pill and the site menu.
 * The legal links and the switch don't depend on the business-info read; the facts stream into their own section.
 * Redesigned 26 Nov (owner: "It looks fucking ugly. I already gave you the freaking colors, so, you know, just fucking
 * pick something"): its own ground from his palette (globals.css --color-footer; owner, 26 Nov: "Carbon lighter":
 * Carbon Lighter +2 under Titanium ink, Singer Stone labels), the same in both themes, so the page visibly lifts off it. Quiet Host volume, with the contrast in
 * styling: the legal links large and light (the sans at 300), the facts tiny-labelled in a ruled grid.
 * Children that ask for text-foreground get the ink: the footer sets --foreground for its own subtree.
 */
export function BusinessFooterView({ children }: { children?: ReactNode }) {
  return (
    // From md the frame's 30 px bottom rail covers the footer's foot, so md:pb-16 leaves about 34 px under the last line.
    // On touch phones the bottom bar's spacer (client-layout) follows the footer with the page colour and the 36 px bar
    // leaves a sliver of it showing: the after layer carries the footer colour through that spacer, at its exact height.
    <footer className="relative isolate bg-footer px-gutter pt-8 pb-8 text-foreground [--foreground:var(--color-footer-ink)] phone:after:absolute phone:after:inset-x-0 phone:after:top-full phone:after:h-[calc(max(var(--bar-target),var(--frame-bottom))_+_env(safe-area-inset-bottom))] phone:after:bg-footer md:pt-20 md:pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
        {/* Large and light, so a hairline underline (1 px, 30 % ink) is enough to mark them as links. */}
        <SellerPolicyLinks className="flex-col gap-x-8 gap-y-0 text-[22px] leading-tight font-light tracking-[-0.02em] sm:flex-row md:text-[28px] lg:text-[34px] [&_a]:decoration-current/30 [&_a]:decoration-1 [&_a]:underline-offset-[0.18em] [&_a]:hover:decoration-current" />
        <div className="-mx-3 shrink-0 self-start md:self-auto"><FooterLocaleSwitch /></div>
      </div>
      <div className="mt-6 min-w-0 border-t border-current/15 pt-5 empty:hidden md:mt-10 md:pt-6">{children}</div>
      {/* Mersi's grain (--texture-grain), footer only, at the owner's values: 150 px tiles, two layers, the second half a
          tile off (owner, 21 Nov: "a bit more texture"). isolate keeps the blend in the footer, and -z-1 puts it under the
          text, over only the footer's colour (Review-B: over the text it cost ~7 % contrast). Screen in both themes: the
          ground is dark in both now, and dark grounds screened before (multiply only suited the light page colour). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-1 bg-(image:--texture-grain) bg-size-[150px] bg-center mix-blend-screen" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-1 bg-(image:--texture-grain) bg-size-[150px] bg-position-[75px_75px] mix-blend-screen" />
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
      {/* Four across from lg in the Korean form's order; the address takes two columns, so the seven close two rows. */}
      <dl className="grid gap-x-8 gap-y-5 text-shadow-footer-ground sm:grid-cols-2 lg:grid-cols-4">
        {facts.tradeName && <FooterFact label={t("name")}>{facts.tradeName}</FooterFact>}
        {facts.representative && <FooterFact label={t("representative")}>{facts.representative}</FooterFact>}
        {facts.businessRegistrationNumber && <FooterFact label={t("registrationNumber")}>{facts.businessRegistrationNumber}</FooterFact>}
        {facts.mailOrderRegistration && <FooterFact label={t("mailOrderRegistrationNumber")}>{facts.mailOrderRegistration}</FooterFact>}
        {facts.businessAddress && <FooterFact label={t("address")} wide>{facts.businessAddress}</FooterFact>}
        {facts.customerServicePhone && <FooterFact label={t("phone")}>
          <FooterFactLink href={"tel:" + facts.customerServicePhone.replace(/[^\d+]/g, "")}>{facts.customerServicePhone}</FooterFactLink>
        </FooterFact>}
        {facts.customerServiceEmail && <FooterFact label={t("email")}>
          <FooterFactLink href={"mailto:" + facts.customerServiceEmail}>{facts.customerServiceEmail}</FooterFactLink>
        </FooterFact>}
      </dl>
    </section>
  );
}

/**
 * A tiny label over its value (DESIGN.md Label: 11 px, uppercase, 0.06em), in Singer Stone (--color-footer-muted) on
 * the Carbon Lighter +2 ground; the grain stays at the owner's values.
 */
function FooterFact({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", wide && "sm:col-span-2")}>
      <dt className="text-[11px] leading-4 tracking-[0.06em] text-footer-muted uppercase">{label}</dt>
      <dd className="min-w-0 text-[13px] leading-5 break-words text-foreground">{children}</dd>
    </div>
  );
}

/** A 44 px target around a 20 px line: the negative margin keeps the rows as tight as the plain facts. */
function FooterFactLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="group/focus -my-3 inline-flex min-h-11 max-w-full items-center break-all underline decoration-current/40 underline-offset-4 hover:decoration-current">
      <FocusShape className="outline-offset-4">{children}</FocusShape>
    </a>
  );
}

/** The facts print in full on commerce and policy pages only (SellerFactsGate); the legal links and EN / KO show everywhere. */
export function BusinessFooter() {
  return (
    <BusinessFooterView>
      <SellerFactsGate>
        <Suspense fallback={null}>
          <PublishedBusinessFacts />
        </Suspense>
      </SellerFactsGate>
    </BusinessFooterView>
  );
}

/**
 * One read per request (React cache). No page links to the facts any more (owner, 22 Nov: "not as a link, but the actual
 * content"): the footer prints them on commerce and policy pages. Independent reads: a failed business-info read
 * must not hide the approved disclosure. Missing facts are logged loudly; they don't block the page.
 */
const loadFooterSellerFacts = cache(async (): Promise<FooterSellerFacts | null> => {
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
