import { notFound } from "next/navigation";
import { loadReadingSurface } from "@/lib/content/load-reading";
import { ReadingView } from "../reading-view";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const surface = await loadReadingSurface();
  const post = surface.posts.find((item) => item.slug === slug);
  return {
    title: post?.title ?? "Reading",
    robots: { index: false, follow: false }
  };
}

export default async function ReadingArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const surface = await loadReadingSurface();
  const page = surface.posts.findIndex((post) => post.slug === slug) + 1;
  if (page === 0) notFound();
  return <ReadingView surface={surface} page={page} />;
}
