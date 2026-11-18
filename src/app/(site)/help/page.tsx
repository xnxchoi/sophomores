import messages from "../../../../messages/en.json";
import { getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/commerce/page-frame";
import { Link } from "@/components/core/Link/Link";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import { HelpContact } from "./_components/help-contact";

export const metadata = {
  title: messages.PageMetadata.help,
  robots: { index: false, follow: false }
};

export default async function HelpPage() {
  await connection();
  const t = await getTranslations("Customer.app_site_help_page");
  let disclosure = null;
  try { disclosure = await loadPublishedCommerceDisclosure(await getPayload({ config })); }
  catch { console.error("Published help contact information is unavailable."); }
  return <PageFrame title={t("title")} introduction={t("introduction")}>
    <nav aria-label={t("topics")} className="divide-y divide-border">
      {([
        ["shipping", "/help/shipping"],
        ["account", "/me/settings/account"],
        ["shop", "/shop"],
      ] as const).map(([topic, href], index) => <Link key={topic} href={href}
        className="group grid min-h-28 grid-cols-[2rem_1fr] gap-4 py-7 outline-offset-4 transition-colors hover:text-muted-foreground focus-visible:outline-2 sm:grid-cols-[3rem_1fr]">
        <span aria-hidden="true" className="pt-1 font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
        <div><h2 className="text-xl tracking-tight underline-offset-4 group-hover:underline">{t(`${topic}.title`)}</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{t(`${topic}.description`)}</p></div>
      </Link>)}
    </nav>
    <HelpContact seller={disclosure?.seller} />
    <section className="mt-12 border-t border-border pt-8" aria-labelledby="help-policies">
      <h2 id="help-policies" className="font-heading text-lg">{t("policies")}</h2>
      <nav aria-label={t("policies")} className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
        {(["terms", "privacy", "refund"] as const).map(policy => <Link key={policy} href={`/${policy}`}
          className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t(policy)}</Link>)}
      </nav>
    </section>
  </PageFrame>;
}
