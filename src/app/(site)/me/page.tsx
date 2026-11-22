import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/auth/server";
import { PageFrame } from "@/components/commerce/page-frame";
import { Link } from "@/components/core/Link/Link";
import { AccountCartEntry } from "./_cart/cart-entry";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return {
    title: t("myAccount"),
    robots: { index: false, follow: false }
  };
}

export default async function AccountHomePage() {
  if (!(await currentUser())) redirect("/account?next=/me");
  const t = await getTranslations("Customer.app_site_me_page");
  const settings = await getTranslations("Customer.app_site_me_settings_page_client");
  return <PageFrame title={t("title")} displayTitle>
    <section aria-labelledby="account-shopping-heading">
      <h2 id="account-shopping-heading" className="font-sans text-xs uppercase tracking-widest text-muted-foreground">{t("shopping")}</h2>
      <nav aria-label={t("shopping")} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link href="/me/orders" className="group rounded-xl border border-border bg-card p-6 text-card-foreground outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2 flex items-start justify-between gap-4 sm:col-span-2">
          <div>
            <h3 className="font-heading text-2xl underline-offset-4 group-hover:underline">{t("orders.title")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("orders.description")}</p>
          </div>
          <ArrowRightIcon aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1" />
        </Link>
        <AccountCartEntry />
        <Link href="/shop" className="group rounded-xl border border-border bg-card p-6 text-card-foreground outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2">
          <h3 className="font-heading text-2xl underline-offset-4 group-hover:underline">{t("shop.title")}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("shop.description")}</p>
        </Link>
      </nav>
    </section>
    <section aria-labelledby="account-settings-heading" className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="account-settings-heading" className="font-sans text-xs uppercase tracking-widest text-muted-foreground">{t("settings")}</h2>
        <Link href="/me/settings" className="inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{settings("settings")}</Link>
      </div>
      <nav aria-label={t("settings")} className="mt-5 divide-y divide-border border-y border-border">
        {([
          ["account", "/me/settings/account"],
          ["language", "/me/settings/general"],
          ["security", "/me/settings/security"],
        ] as const).map(([topic, href]) => <Link key={topic} href={href}
          className="group grid min-h-20 grid-cols-[minmax(0,1fr)_1.5rem] items-center gap-4 py-4 outline-offset-4 focus-visible:outline-2">
          <div><h3 className="font-heading text-xl tracking-tight underline-offset-4 group-hover:underline">{t(`${topic}.title`)}</h3>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted-foreground">{t(`${topic}.description`)}</p></div>
          <ArrowRightIcon aria-hidden="true" className="size-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1" />
        </Link>)}
      </nav>
    </section>
    <aside className="mt-12 border-t border-border pt-8">
      <h2 className="font-heading text-xl">{t("help.title")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("help.description")}</p>
      <Link href="/help" className="mt-3 inline-flex min-h-12 items-center text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("help.link")}</Link>
    </aside>
  </PageFrame>;
}
