import messages from "../../../../../../messages/en.json";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/auth/server";

export const metadata = {
  title: messages.PageMetadata.notificationsSettings,
  robots: { index: false, follow: false }
};

// Structure only (03c, Notifications). Order notices and marketing consent follow separately;
// the channel depends on C-3.
export default async function NotificationsSettingsPage() {
  if (!(await currentUser()))
    redirect("/account?next=/me/settings/notifications");
  const t = await getTranslations(
    "Customer.app_site_me_settings_notifications_page"
  );
  return (
    <section>
      <h1 className="mb-8 text-3xl font-medium tracking-tight">{t("title")}</h1>
    </section>
  );
}
