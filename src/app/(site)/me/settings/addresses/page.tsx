import messages from "../../../../../../messages/en.json";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/auth/server";

export const metadata = {
  title: messages.PageMetadata.addressesSettings,
  robots: { index: false, follow: false }
};

// Empty on purpose (03c, Addresses; pending C-20). The code deliberately keeps no address
// book, so this route has no form and no data until the owner decides.
export default async function AddressesSettingsPage() {
  if (!(await currentUser())) redirect("/account?next=/me/settings/addresses");
  const t = await getTranslations(
    "Customer.app_site_me_settings_addresses_page"
  );
  return (
    <section>
      <h1 className="mb-8 text-3xl font-medium tracking-tight">{t("title")}</h1>
    </section>
  );
}
