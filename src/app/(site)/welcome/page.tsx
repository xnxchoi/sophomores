import messages from "../../../../messages/en.json";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Welcome } from "@/components/membership/welcome";
import { loadWelcomeView } from "@/lib/member-auth/welcome/runtime.server";

export const metadata = {
  title: messages.PageMetadata.welcome,
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

/**
 * The welcome page (ADR-0013): `/welcome` is what the NFC card's first tap
 * opens, so the path is short and stands outside the account it serves; the
 * account page links here too. It needs only a signed-in member.
 */
export default async function WelcomePage() {
  await connection();
  return <Welcome initialView={await loadWelcomeView(await headers())} />;
}
