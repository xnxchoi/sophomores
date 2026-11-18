import messages from "../../../../messages/en.json";
import { TeamCredits } from "./team-credits";

export const metadata = {
  title: messages.PageMetadata.team,
  robots: { index: false, follow: false }
};

export default function TeamPage() {
  // No public roster is supplied yet. Do not publish reading fixtures or user roles.
  return <TeamCredits people={[]} />;
}
