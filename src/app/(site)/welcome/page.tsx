import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { loadMemberWelcome } from "@/lib/member-auth/welcome/runtime.server";
import { WelcomeCard } from "./welcome-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return {
    title: t("welcome"),
    robots: { index: false, follow: false },
    referrer: "no-referrer" as const
  };
}

export default async function WelcomePage() {
  return <WelcomeCard view={await loadMemberWelcome(await headers())} />;
}
