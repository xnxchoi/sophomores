import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/server";
import type { User } from "@/payload-types";
import AccountSectionClient from "./page.client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return {
    title: t("accountSettings"),
  };
}

export default async function AccountSettingsPage() {
  const user = (await currentUser()) as User | null;
  if (!user) {
    return redirect("/account?next=/me/settings/account");
  }

  return <AccountSectionClient user={user} />;
}
