/**
 *
 * Please check how this is handled on PayloadCMS' most recent versions of the templates and examples, available on their repo.
 *  */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EssayReader } from "@/components/reading/essay-reader";
import { PageLinks } from "@/components/reading/page-links";
import { ReadingStage } from "@/components/reading/reading-stage";
import { loadReadingPost, loadReadingSurface } from "@/lib/content/load-reading";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const essay = await loadReadingPost(slug);
  return {
    title: essay?.post.title || "",
    robots: { index: false, follow: false }
  };
}

/** One essay and its neighbours. The surface still feeds the header's Search and inbox. */
export default async function ReadingArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [essay, surface] = await Promise.all([loadReadingPost(slug), loadReadingSurface()]);
  // A missing essay renders (site)/not-found.tsx (Next 16 docs: functions/not-found.md). The segment's
  // loading.tsx has already started the stream, so the status stays 200 with an injected noindex
  // (file-conventions/not-found.md, guides/streaming.md), as on The Hideaway's essay page.
  if (!essay) notFound();
  return (
    <ReadingStage surface={surface}>
      <EssayReader
        key={essay.post.id}
        post={essay.post}
        highlights={surface.highlights}
        saved={surface.savedIds.includes(essay.post.id)}
      />
      <PageLinks previous={essay.previous} next={essay.next} />
    </ReadingStage>
  );
}
