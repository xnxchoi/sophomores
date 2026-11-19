"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import { CanvasBoundary } from "@/components/gl/canvas-boundary";
import { MemberBadge } from "@/components/membership/member-badge";
import { NotificationList } from "@/components/notifications/notification-list";
import { ArticleHero } from "@/components/reading/article-hero";
import { BookmarkButton } from "@/components/reading/bookmark-button";
import { PageLinks } from "@/components/reading/page-links";
import { PostArchive } from "@/components/reading/post-archive";
import { Reader } from "@/components/reading/reader";
import { TrackPlayer } from "@/components/radio/track-player";
import { ReadingChrome } from "@/components/shell/reading-chrome";
import { TickerCrown } from "@/components/shell/ticker/TickerCrown";
import { CreditsRail } from "@/components/sections/credits-rail";
import { ParallaxGrid } from "@/components/sections/parallax-grid";
import { Starliner } from "@/components/sections/starliner";
import type {
  CreditPerson,
  HighlightRange,
  Notification,
  ParallaxFrame,
  PostBody,
  Track
} from "@/lib/content/slots";
import type { ReadingSurface } from "@/lib/content/reading-surface";

export function ReadingStage({ surface, initialPage = 1 }: { surface: ReadingSurface; initialPage?: number }) {
  const { posts, track, notifications, memberId, credits, parallax, highlights, savedIds } = surface;
  const t = useTranslations("Customer.components_reading_stage");
  const [page, setPage] = useState(initialPage);
  const article = posts[page - 1] ?? posts[0];
  const [ranges, setRanges] = useState(highlights);
  const [saved, setSaved] = useState(() => new Set(savedIds));
  const frame = (
    <div className="port-rule border-[oklch(from_var(--port-shade)_l_c_h_/_0.16)] h-80 rounded-[10px] border" />
  );

  return (
    <main className="port-shade [--port-shade:var(--faded-fg)] font-[family-name:var(--font-port-sans),Helvetica_Neue,Helvetica,sans-serif] min-h-screen bg-off-bg pt-[76px] text-faded-fg">
      {/* The site frame mounts the one header; this hands it the posts and the inbox its rows. */}
      <ReadingChrome posts={posts} notifications={notifications} userId={memberId} />
      <ArticleHero posts={posts} />
      <PostArchive posts={posts} />
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        {article && (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <BookmarkButton
                saved={saved.has(article.id)}
                onToggle={() => setSaved((current) => {
                  const next = new Set(current);
                  if (next.has(article.id)) next.delete(article.id);
                  else next.add(article.id);
                  return next;
                })}
              />
              <p className="text-sm text-muted-foreground">{t("localReadingTools")}</p>
            </div>
            <Reader
              key={article.id}
              body={article.body}
              highlights={ranges.filter((range) => range.postId === article.id)}
              onHighlight={(range) => setRanges((current) => current.some(
                (item) => item.postId === article.id && item.start === range.start && item.end === range.end
              ) ? current : [...current, { ...range, postId: article.id }])}
            />
          </>
        )}
        <PageLinks page={page} totalPages={Math.max(posts.length, 1)} onPage={setPage} />
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
      <TrackPlayer track={track} />
      <CreditsRail people={credits} />
      <ParallaxGrid title={parallax.title} frames={parallax.frames} />
      <Starliner />
      <TickerCrown />
    </main>
  );
}
