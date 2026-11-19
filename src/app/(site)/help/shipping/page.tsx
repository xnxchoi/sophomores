import messages from "../../../../../messages/en.json";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/components/core/Link/Link";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPublishedCommerceShipping, loadPublishedCommerceDisclosure, type CommerceShippingFacts } from "@/lib/commerce/catalogue";
import { loadBusinessInformation, parseBusinessInformation } from "@/payload/globals/business-info";
import { ContentsNav } from "../../_long-form/contents-nav";
import { EditorialPage } from "../../_long-form/editorial-page";
import { LongFormDocument, LongFormSections, documentOutline, editorDocument, sectionsContents, type ContentsEntry } from "../../_long-form/long-form";
import { HelpContact, selectHelpContact } from "../_components/help-contact";

export const metadata = {
  title: messages.PageMetadata.shippingAndReturns,
  robots: { index: false, follow: false }
};

export default async function ShippingHelpPage() {
  await connection();
  const t = await getTranslations("Customer.app_site_help_shipping_page");
  const help = await getTranslations("Customer.app_site_help_page");
  const policy = await getTranslations("Customer.policy");
  const locale = await getLocale();
  let disclosure: Awaited<ReturnType<typeof loadPublishedCommerceDisclosure>> = null;
  let shipping: CommerceShippingFacts | null = null;
  let business = parseBusinessInformation(null);
  try {
    const payload = await getPayload({ config });
    try { disclosure = await loadPublishedCommerceDisclosure(payload); }
    catch { console.error("Published return information is unavailable."); }
    try { shipping = await loadPublishedCommerceShipping(payload); }
    catch { console.error("Published shipping information is unavailable."); }
    try { business = await loadBusinessInformation(payload); }
    catch { console.error("Business information is unavailable."); }
  } catch { console.error("Published commerce information is unavailable."); }
  // Returns follow the same precedence as /refund, so the two pages never disagree: the owner-edited
  // refund text first, then the approved disclosure sections, then the honest unavailable state.
  const document = editorDocument(business.policies.refund);
  const outline = document ? documentOutline(document) : null;
  const returns = document ? null : disclosure?.policies.refund;
  const contents: ContentsEntry[] = [
    { id: "shipping-details", label: t("shippingTitle"), depth: 2 },
    { id: "returns-details", label: t("returnsTitle"), depth: 2 },
    ...(outline ? outline.entries : returns ? sectionsContents(returns.sections, "returns") : []).map((entry) => ({ ...entry, depth: 3 as const })),
    { id: "help-contact-section", label: help("contact.title"), depth: 2 },
  ];

  return <EditorialPage
    title={t("title")}
    standfirst={<p>{t("introduction")}</p>}
    lead={<Link href="/help" className="inline-flex min-h-12 items-center text-sm text-muted-foreground underline decoration-current/40 underline-offset-4 outline-offset-4 transition-colors hover:text-foreground hover:decoration-current focus-visible:outline-2">{t("back")}</Link>}
    rail={<ContentsNav entries={contents} label={policy("contents")} />}
  >
    <section aria-labelledby="shipping-details">
      <h2 id="shipping-details" className="scroll-mt-header font-heading text-2xl tracking-tight sm:text-3xl">{t("shippingTitle")}</h2>
      {/* The past-order pointer goes with published details; the unavailable line carries its own. */}
      {shipping ? <div className="mt-8">
        <h3 className="font-heading text-lg">{shipping.title}</h3>
        <dl className="mt-4 divide-y divide-border border-y border-border text-sm sm:text-base">
          <div className="grid gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6"><dt className="text-muted-foreground">{t("fee")}</dt><dd className="min-w-0 break-words">{new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(shipping.shippingFeeKRW)}</dd></div>
          <div className="grid gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6"><dt className="text-muted-foreground">{t("dispatch")}</dt><dd className="min-w-0 leading-relaxed break-words whitespace-pre-line">{shipping.dispatchSchedule}</dd></div>
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("shippingDescription")}</p>
      </div> : <p className="mt-6 border-l-2 border-border pl-5 text-base leading-relaxed text-muted-foreground">{t("shippingUnavailable")}</p>}
      <Link href="/shop" className="mt-4 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("shop")}</Link>
    </section>
    <section aria-labelledby="returns-details" className="mt-14 border-t border-border pt-10">
      <h2 id="returns-details" className="scroll-mt-header font-heading text-2xl tracking-tight sm:text-3xl">{t("returnsTitle")}</h2>
      {document && outline ? (
        <div className="mt-8"><LongFormDocument data={document} ids={outline.ids} tableLabel={policy("table")} nested /></div>
      ) : returns ? <>
        <p className="mt-4 text-sm text-muted-foreground">{t("effectiveDate", { date: returns.effectiveDate })}</p>
        <div className="mt-8"><LongFormSections sections={returns.sections} prefix="returns" heading="h3" /></div>
      </> : <p className="mt-4 border-l-2 border-border pl-5 text-base leading-relaxed text-muted-foreground">{t("returnsUnavailable")}</p>}
      <Link href="/refund" className="mt-6 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("refund")}</Link>
    </section>
    <HelpContact contact={selectHelpContact(business.facts, disclosure?.seller)} />
  </EditorialPage>;
}
