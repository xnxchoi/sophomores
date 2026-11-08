import { ReadingStage } from "@/components/reading/reading-stage";
import type { ReadingSurface } from "@/lib/content/reading-surface";

export function ReadingView({ surface, page = 1 }: { surface: ReadingSurface; page?: number }) {
  return (
    <ReadingStage
      key={page}
      posts={surface.posts}
      track={surface.track}
      notifications={surface.notifications}
      memberId={surface.memberId}
      credits={surface.credits}
      parallax={surface.parallax}
      highlights={surface.highlights}
      savedIds={surface.savedIds}
      initialPage={page}
    />
  );
}
