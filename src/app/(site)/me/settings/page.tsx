import { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, getDeviceSessions } from "@/lib/auth/server";
import type { User } from "@/payload-types";
import SettingsHubClient from "./page.client";

export const metadata: Metadata = {
  title: "Preferences"
};

export default async function SettingsHubPage() {
  const user = (await currentUser()) as User | null;
  if (!user) {
    return redirect("/account?next=/me/settings");
  }

  const sessions = await getDeviceSessions();
  const activeSessionsCount =
    sessions?.filter((s: { userAgent?: string | null }) =>
      Boolean(s?.userAgent)
    ).length ?? 1;

  return (
    <SettingsHubClient user={user} activeSessionsCount={activeSessionsCount} />
  );
}
