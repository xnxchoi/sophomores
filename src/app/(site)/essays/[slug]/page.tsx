import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadReadingSurface } from "@/lib/content/load-reading";
import { ReadingView } from "../reading-view";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const surface = await loadReadingSurface();
  const post = surface.posts.find((item) => item.slug === slug);
  return {
    title: post?.title || "",
    robots: { index: false, follow: false }
  };
}

// The essay is looked up inside <Suspense>, as in The Hideaway: the styled document is sent first, so a
// missing essay's 404 renders inside it, never in Next's bare error shell (ADR 0002).
export default function ReadingArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense>
      <ReadingArticle params={params} />
    </Suspense>
  );
}

async function ReadingArticle({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const surface = await loadReadingSurface();
  const page = surface.posts.findIndex((post) => post.slug === slug) + 1;
  if (page === 0) notFound();
  return <ReadingView surface={surface} page={page} />;
}
