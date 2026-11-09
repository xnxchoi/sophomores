import messages from "../../../../../../messages/en.json";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/server";
import type { User } from "@/payload-types";
import GeneralSectionClient from "./page.client";

export const metadata: Metadata = {
  title: messages.PageMetadata.generalSettings,
};

export default async function GeneralSettingsPage() {
  const user = (await currentUser()) as User | null;
  if (!user) {
    return redirect("/account?next=/me/settings/general");
  }

  return <GeneralSectionClient user={user} />;
}
