import messages from "../../../../messages/en.json";
import { ReadingView } from "./reading-view";
import { loadReadingSurface } from "@/lib/content/load-reading";

export const metadata = {
  title: messages.PageMetadata.reading,
  robots: { index: false, follow: false }
};

/** Published posts fill the slots. Fixtures fill them when the collection is empty. */
export default async function ReadingPage() {
  const surface = await loadReadingSurface();
  return <ReadingView surface={surface} />;
}
