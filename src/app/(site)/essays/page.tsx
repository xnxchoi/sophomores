import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/components/core/Link/Link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { ArticleHero } from "@/components/reading/article-hero";
import { PostArchive } from "@/components/reading/post-archive";
import { ReadingStage } from "@/components/reading/reading-stage";
import { loadReadingSurface } from "@/lib/content/load-reading";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return { title: t("reading"), robots: { index: false, follow: false } };
}

/** The latest essays, each linking to its own page, and the way into the full listing. With none published it says so. */
export default async function ReadingPage() {
  const [surface, t] = await Promise.all([loadReadingSurface(), getTranslations("Customer.components_reading_stage")]);
  const { posts } = surface;
  return (
    <ReadingStage surface={surface}>
      {posts.length > 0 ? (
        <>
          <ArticleHero posts={posts} />
          <PostArchive posts={posts} />
          <div className="mx-auto flex max-w-3xl px-6">
            <Link href="/essays/in" className="group/focus inline-flex min-h-11 items-center text-sm underline underline-offset-4">
              <FocusShape className="group-focus-visible/focus:outline-current">{t("allEssays")}</FocusShape>
            </Link>
          </div>
        </>
      ) : (
        <p className="mx-auto max-w-3xl px-6 py-16 text-base">{t("empty")}</p>
      )}
    </ReadingStage>
  );
}
