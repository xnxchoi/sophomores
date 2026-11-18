import messages from "../../../../../messages/en.json";
import { getLocale, getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/commerce/page-frame";
import { Link } from "@/components/core/Link/Link";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPublishedCommerceShipping, loadPublishedCommerceDisclosure, type CommerceShippingFacts } from "@/lib/commerce/catalogue";
import { HelpContact } from "../_components/help-contact";

export const metadata = {
  title: messages.PageMetadata.shippingAndReturns,
  robots: { index: false, follow: false }
};

export default async function ShippingHelpPage() {
  await connection();
  const t = await getTranslations("Customer.app_site_help_shipping_page");
  const locale = await getLocale();
  let disclosure: Awaited<ReturnType<typeof loadPublishedCommerceDisclosure>> = null;
  let shipping: CommerceShippingFacts | null = null;
  try {
    const payload = await getPayload({ config });
    try { disclosure = await loadPublishedCommerceDisclosure(payload); }
    catch { console.error("Published return information is unavailable."); }
    try { shipping = await loadPublishedCommerceShipping(payload); }
    catch { console.error("Published shipping information is unavailable."); }
  } catch { console.error("Published commerce information is unavailable."); }
  const returns = disclosure?.policies.refund;
  return <PageFrame title={t("title")} introduction={t("introduction")}>
    <Link href="/help" className="mb-10 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("back")}</Link>
    <section aria-labelledby="shipping-details">
      <h2 id="shipping-details" className="font-heading text-2xl">{t("shippingTitle")}</h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t("shippingDescription")}</p>
      {shipping ? <div className="mt-6 rounded-xl border border-border bg-card p-6 text-card-foreground">
        <h3 className="text-lg font-medium">{shipping.title}</h3>
        <dl className="mt-5 divide-y divide-border text-sm">
          <div className="grid gap-2 py-4 sm:grid-cols-[9rem_1fr]"><dt className="text-muted-foreground">{t("fee")}</dt><dd>{new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(shipping.shippingFeeKRW)}</dd></div>
          <div className="grid gap-2 py-4 sm:grid-cols-[9rem_1fr]"><dt className="text-muted-foreground">{t("dispatch")}</dt><dd className="whitespace-pre-line leading-relaxed">{shipping.dispatchSchedule}</dd></div>
        </dl>
      </div> : <p className="mt-6 border-l-2 border-border pl-5 text-sm leading-relaxed text-muted-foreground">{t("shippingUnavailable")}</p>}
      <Link href="/shop" className="mt-4 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("shop")}</Link>
    </section>
    <section aria-labelledby="returns-details" className="mt-10 border-t border-border pt-10">
      <h2 id="returns-details" className="font-heading text-2xl">{t("returnsTitle")}</h2>
      {returns ? <>
        <p className="mt-4 text-sm text-muted-foreground">{t("effectiveDate", { date: returns.effectiveDate })}</p>
        <div className="mt-8 space-y-8">{returns.sections.map((section, index) => <section key={index}>
          <h3 className="text-lg font-medium">{section.heading}</h3>
          <div className="mt-3 space-y-4 text-base leading-relaxed text-muted-foreground">{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="whitespace-pre-line">{paragraph}</p>)}</div>
        </section>)}</div>
      </> : <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t("returnsUnavailable")}</p>}
      <Link href="/refund" className="mt-4 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("refund")}</Link>
    </section>
    <HelpContact seller={disclosure?.seller} />
  </PageFrame>;
}
