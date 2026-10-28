import { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/server";
import type { User } from "@/lib/payload/payload-types";
import AccountSectionClient from "./page.client";

export const metadata: Metadata = {
  title: "Account · Settings — Sophomores",
};

export default async function AccountSettingsPage() {
  const user = (await currentUser()) as User | null;
  if (!user) {
    return redirect("/account?next=/me/settings/account");
  }

  return <AccountSectionClient user={user} />;
}
