import { ReadingStage } from "@/components/reading/reading-stage";
import {
  creditFixtures,
  highlightFixtures,
  noticeFixtures,
  parallaxFixtures,
  postFixtures,
  trackFixtures
} from "@/lib/content/fixtures";
import {
  fromCredit,
  fromHighlight,
  fromNotice,
  fromParallax,
  fromPost,
  fromTrack
} from "@/lib/content/map";

export const metadata = {
  title: "Reading",
  robots: { index: false, follow: false }
};

/** Fixture reading surface. Collections are not required for this page. */
export default function ReadingPage() {
  return (
    <ReadingStage
      posts={postFixtures.map(fromPost)}
      track={fromTrack(trackFixtures[0])}
      notices={noticeFixtures.map(fromNotice)}
      credits={creditFixtures.map(fromCredit)}
      parallax={{
        title: fromParallax(parallaxFixtures[0]).title,
        frames: fromParallax(parallaxFixtures[0]).images
      }}
      highlights={highlightFixtures.map(fromHighlight)}
    />
  );
}
