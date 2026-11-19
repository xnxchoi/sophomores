import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadReadingSurface } from "@/lib/content/load-reading";
import { ReadingStage } from "@/components/reading/reading-stage";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const surface = await loadReadingSurface();
  const post = surface.posts.find((item) => item.slug === slug);
  return {
    title: post?.title || "",
    robots: { index: false, follow: false }
  };
}

export default async function ReadingArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const surface = await loadReadingSurface();
  const page = surface.posts.findIndex((post) => post.slug === slug) + 1;
  // A missing essay renders (site)/not-found.tsx (Next 16 docs: functions/not-found.md). The segment's
  // loading.tsx has already started the stream, so the status stays 200 with an injected noindex
  // (file-conventions/not-found.md, guides/streaming.md), as on The Hideaway's essay page.
  if (page === 0) notFound();
  return <ReadingStage key={page} surface={surface} initialPage={page} />;
}
