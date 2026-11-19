import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/components/core/Link/Link";
import { CanvasBoundary } from "@/components/gl/canvas-boundary";
import { MemberBadge } from "@/components/membership/member-badge";
import { NotificationList } from "@/components/notifications/notification-list";
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
  const { posts, notifications, memberId } = surface;
  const frame = <div className="port-rule border-[oklch(from_var(--port-shade)_l_c_h_/_0.16)] h-80 rounded-[10px] border" />;
  return (
    <ReadingStage surface={surface}>
      {posts.length > 0 ? (
        <>
          <ArticleHero posts={posts} />
          <PostArchive posts={posts} />
          <div className="mx-auto flex max-w-3xl px-6">
            <Link href="/essays/in" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
              {t("allEssays")}
            </Link>
          </div>
        </>
      ) : (
        <p className="mx-auto max-w-3xl px-6 py-16 text-base">{t("empty")}</p>
      )}
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <NotificationList notifications={notifications} />
        <Link
          href={memberId ? "/me" : "/account"}
          className="inline-flex min-h-11 w-fit items-center text-sm underline underline-offset-4"
        >
          {memberId ? t("memberAccount") : t("accountEntry")}
        </Link>
        <CanvasBoundary fallback={frame}>
          <Suspense fallback={frame}>
            <MemberBadge />
          </Suspense>
        </CanvasBoundary>
      </div>
    </ReadingStage>
  );
}
