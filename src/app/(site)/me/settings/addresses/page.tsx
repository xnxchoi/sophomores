import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/components/core/Link/Link";
import { SubRouteHeader } from "@/components/settings/SubRouteHeader";
import { currentUser } from "@/lib/auth/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return {
    title: t("addressesSettings"),
    robots: { index: false, follow: false },
  };
}

export default async function AddressesSettingsPage() {
  if (!(await currentUser())) redirect("/account?next=/me/settings");
  const t = await getTranslations("Customer.app_site_me_settings_addresses_page");

  return (
    <section className="dark space-y-6 text-foreground">
      <SubRouteHeader title={t("title")} className="[&_a]:min-h-11" />
      <p className="max-w-prose text-base leading-relaxed text-muted-foreground">{t("description")}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3">
        <Link
          href="/me/orders"
          className="inline-flex min-h-12 items-center rounded-sm text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2"
        >
          {t("orders")}
        </Link>
        <Link
          href="/help/shipping"
          className="inline-flex min-h-12 items-center rounded-sm text-sm underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2"
        >
          {t("help")}
        </Link>
      </div>
    </section>
  );
}
