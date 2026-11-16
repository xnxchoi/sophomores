import { redirect } from "next/navigation";
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

export default async function ReadingArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const surface = await loadReadingSurface();
  const page = surface.posts.findIndex((post) => post.slug === slug) + 1;
  // A missing essay goes to the site's 404 (next.config.ts rewrites): throwing notFound here would paint
  // Next's bare error shell before the 404 renders.
  if (page === 0) redirect(`/essays/${encodeURIComponent(slug)}?not-found=1`);
  return <ReadingView surface={surface} page={page} />;
}
