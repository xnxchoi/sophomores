import { getTranslations } from "next-intl/server";
import type { SellerInformation } from "@/lib/commerce/disclosures";

export async function HelpContact({ seller }: { seller?: SellerInformation | null }) {
  const t = await getTranslations("Customer.app_site_help_page");
  return <section className="mt-12 rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8" aria-labelledby="help-contact">
    <h2 id="help-contact" className="font-heading text-xl">{t("contact.title")}</h2>
    {seller ? <>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("contact.description")}</p>
      <p className="mt-5 text-sm">{seller.name}</p>
      <a href={`tel:${seller.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-12 items-center text-lg underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{seller.phone}</a>
    </> : <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("contact.unavailable")}</p>}
  </section>;
}
