import messages from "../../../../messages/en.json";
import { getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/commerce/page-frame";

export const metadata = {
  title: messages.PageMetadata.team,
  robots: { index: false, follow: false }
};

// Structure only (03c, Teams). To be built with the Hideaway Credits component
// (src/hideaway/components/sections/Credits/), modelled on tux.co/en/people (owner, 2026-11-14).
export default async function TeamPage() {
  const t = await getTranslations("Customer.app_site_team_page");
  return <PageFrame title={t("title")} />;
}
