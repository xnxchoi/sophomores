import messages from "../../../../messages/en.json";
import { getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/commerce/page-frame";

export const metadata = {
  title: messages.PageMetadata.help,
  robots: { index: false, follow: false }
};

// Structure only (03c, Help). Answers and the contact block follow; wording must match the policies.
export default async function HelpPage() {
  const t = await getTranslations("Customer.app_site_help_page");
  return <PageFrame title={t("title")} />;
}
