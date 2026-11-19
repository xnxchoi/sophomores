import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, getDeviceSessions, getUserAccounts } from "@/lib/auth/server";
import type { User } from "@/payload-types";
import SecuritySectionClient from "./page.client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return {
    title: t("securitySettings"),
  };
}

export default async function SecuritySettingsPage() {
  const user = (await currentUser()) as User | null;
  if (!user) {
    return redirect("/account?next=/me/settings/security");
  }

  const [sessions, accounts] = await Promise.all([
    getDeviceSessions(),
    getUserAccounts(),
  ]);

  return (
    <SecuritySectionClient
      user={user}
      initialSessions={sessions || []}
      initialAccounts={accounts || []}
    />
  );
}
