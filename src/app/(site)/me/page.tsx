import messages from "../../../../messages/en.json";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/auth/server";
import { PageFrame } from "@/components/commerce/page-frame";

export const metadata = {
  title: messages.PageMetadata.myAccount,
  robots: { index: false, follow: false }
};

// Structure only (03c, Account home). The latest order and the links follow separately.
export default async function AccountHomePage() {
  if (!(await currentUser())) redirect("/account?next=/me");
  const t = await getTranslations("Customer.app_site_me_page");
  return <PageFrame title={t("title")} />;
}
