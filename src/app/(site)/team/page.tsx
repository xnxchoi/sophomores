import messages from "../../../../messages/en.json";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadTeamRoster } from "@/lib/content/team-roster.server";
import { TeamCredits } from "./team-credits";

export const metadata = {
  title: messages.PageMetadata.team,
  robots: { index: false, follow: false }
};

export default async function TeamPage() {
  await connection();
  // Published roster entries only. A failed read shows the same honest empty state as an empty roster.
  let people: Awaited<ReturnType<typeof loadTeamRoster>> = [];
  try {
    people = await loadTeamRoster(await getPayload({ config }));
  } catch {
    console.error("The Team roster is unavailable.");
  }
  return <TeamCredits people={people} />;
}
