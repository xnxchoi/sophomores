import messages from "../../../../messages/en.json";
import { getTranslations } from "next-intl/server";
import { Link } from "@/components/core/Link/Link";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import { loadBusinessInformation, type BusinessFacts } from "@/payload/globals/business-info";
import { EditorialPage } from "../_long-form/editorial-page";
import { InterfaceTourOpener } from "@/components/UX/Tour/InterfaceTour";
import { HelpContact, selectHelpContact } from "./_components/help-contact";

export const metadata = {
  title: messages.PageMetadata.help,
  robots: { index: false, follow: false }
};

export default async function HelpPage() {
  await connection();
  const t = await getTranslations("Customer.app_site_help_page");
  let disclosure: Awaited<ReturnType<typeof loadPublishedCommerceDisclosure>> = null;
  let facts: BusinessFacts | null = null;
  try {
    const payload = await getPayload({ config });
    try { disclosure = await loadPublishedCommerceDisclosure(payload); }
    catch { console.error("Published help contact information is unavailable."); }
    try { facts = (await loadBusinessInformation(payload)).facts; }
    catch { console.error("Business information is unavailable."); }
  } catch { console.error("Published commerce information is unavailable."); }

  return <EditorialPage title={t("title")} standfirst={<>
    <p>{t("introduction")}</p>
    {/* The visible way into the site guide; the menu carries the same opener (UI-Shell R-TOUR). */}
    <div className="mt-6"><InterfaceTourOpener /></div>
  </>}>
    <nav aria-label={t("topics")}>
      <ol className="divide-y divide-border border-y border-border">
        {([
          ["shipping", "/help/shipping"],
          ["account", "/me/settings/account"],
          ["shop", "/shop"],
        ] as const).map(([topic, href], index) => <li key={topic}>
          <Link href={href} className="group grid min-h-28 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-4 py-7 outline-offset-4 transition-colors hover:text-muted-foreground focus-visible:outline-2 sm:grid-cols-[3rem_minmax(0,1fr)_auto]">
            <span aria-hidden="true" className="pt-2 font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <h2 className="text-2xl leading-tight tracking-tight sm:text-3xl">{t(`${topic}.title`)}</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{t(`${topic}.description`)}</p>
            </div>
            <span aria-hidden="true" className="pt-2 transition-transform duration-[var(--duration-spring)] ease-[var(--ease-spring)] group-hover:translate-x-1">-&gt;</span>
          </Link>
        </li>)}
      </ol>
    </nav>
    <HelpContact contact={selectHelpContact(facts, disclosure?.seller)} />
    <section className="mt-14 border-t border-border pt-10" aria-labelledby="help-policies">
      <h2 id="help-policies" className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{t("policies")}</h2>
      <nav aria-label={t("policies")} className="mt-3 flex flex-wrap gap-x-8 gap-y-1">
        {(["terms", "privacy", "refund"] as const).map(policy => <Link key={policy} href={`/${policy}`}
          className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t(policy)}</Link>)}
      </nav>
    </section>
  </EditorialPage>;
}
