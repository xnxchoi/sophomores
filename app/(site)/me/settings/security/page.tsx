import { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, getDeviceSessions, getUserAccounts } from "@/lib/auth/server";
import type { User } from "@/lib/payload/payload-types";
import SecuritySectionClient from "./page.client";

export const metadata: Metadata = {
  title: "Security · Settings — Sophomores",
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
