import messages from "../../../../messages/en.json";
import { headers } from "next/headers";
import { loadMemberWelcome } from "@/lib/member-auth/welcome/runtime.server";
import { WelcomeCard } from "./welcome-card";

export const metadata = {
  title: messages.PageMetadata.welcome,
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const
};

export default async function WelcomePage() {
  return <WelcomeCard view={await loadMemberWelcome(await headers())} />;
}
