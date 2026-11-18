import messages from "../../../../messages/en.json";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/auth/server";
import { PageFrame } from "@/components/commerce/page-frame";
import { Link } from "@/components/core/Link/Link";
import { AccountCartEntry } from "./_cart/cart-entry";

export const metadata = {
  title: messages.PageMetadata.myAccount,
  robots: { index: false, follow: false }
};

export default async function AccountHomePage() {
  if (!(await currentUser())) redirect("/account?next=/me");
  const t = await getTranslations("Customer.app_site_me_page");
  return <PageFrame title={t("title")} introduction={t("introduction")}>
    <section aria-labelledby="account-settings-heading">
      <h2 id="account-settings-heading" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t("settings")}</h2>
      <nav aria-label={t("settings")} className="mt-5 divide-y divide-border border-y border-border">
        {([
          ["account", "/me/settings/account"],
          ["language", "/me/settings/general"],
          ["security", "/me/settings/security"],
        ] as const).map(([topic, href]) => <Link key={topic} href={href}
          className="group grid min-h-28 grid-cols-[minmax(0,1fr)_3rem] items-center gap-5 py-6 outline-offset-4 focus-visible:outline-2">
          <div><h3 className="font-heading text-2xl tracking-tight underline-offset-4 group-hover:underline">{t(`${topic}.title`)}</h3>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{t(`${topic}.description`)}</p></div>
          <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full border border-border transition-transform duration-300 group-hover:translate-x-1">-&gt;</span>
        </Link>)}
      </nav>
    </section>
    <section aria-labelledby="account-shopping-heading" className="mt-12">
      <h2 id="account-shopping-heading" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{t("shopping")}</h2>
      <nav aria-label={t("shopping")} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link href="/me/orders" className="group rounded-xl border border-border bg-card p-6 text-card-foreground outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2 sm:col-span-2">
          <h3 className="font-heading text-2xl underline-offset-4 group-hover:underline">{t("orders.title")}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("orders.description")}</p>
        </Link>
        <AccountCartEntry />
        <Link href="/shop" className="group rounded-xl border border-border bg-card p-6 text-card-foreground outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2">
          <h3 className="font-heading text-2xl underline-offset-4 group-hover:underline">{t("shop.title")}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("shop.description")}</p>
        </Link>
      </nav>
    </section>
    <aside className="mt-12 border-t border-border pt-8">
      <h2 className="font-heading text-xl">{t("help.title")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("help.description")}</p>
      <Link href="/help" className="mt-3 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("help.link")}</Link>
    </aside>
  </PageFrame>;
}
