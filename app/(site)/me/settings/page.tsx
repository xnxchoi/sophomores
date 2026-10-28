import { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, getDeviceSessions } from "@/lib/auth/server";
import type { User } from "@/lib/payload/payload-types";
import SettingsHubClient from "./page.client";

export const metadata: Metadata = {
  title: "Settings — Sophomores",
};

export default async function SettingsHubPage() {
  const user = (await currentUser()) as User | null;
  if (!user) {
    return redirect("/account?next=/me/settings");
  }

  const sessions = await getDeviceSessions();
  const activeSessionsCount =
    sessions?.filter((s: { userAgent?: string | null }) => Boolean(s?.userAgent)).length ?? 1;

  return (
    <SettingsHubClient
      user={user}
      activeSessionsCount={activeSessionsCount}
    />
  );
}
