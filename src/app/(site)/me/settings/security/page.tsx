import messages from "../../../../../../messages/en.json";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, getDeviceSessions, getUserAccounts } from "@/lib/auth/server";
import type { User } from "@/payload-types";
import SecuritySectionClient from "./page.client";

export const metadata: Metadata = {
  title: messages.PageMetadata.securitySettings,
};

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
