"use client";

import { Suspense, useState } from "react";
import { ForgotPasswordCard, SignUpCard } from "@/components/auth/account-forms";
import { PasskeyButton, TwoFactorCard } from "@/components/auth/second-factor";
import { SignInCard } from "@/components/auth/sign-in-card";
import { CanvasBoundary } from "@/components/gl/canvas-boundary";
import { MemberBadge } from "@/components/membership/member-badge";
import { NoticeList } from "@/components/notices/notice-list";
import { ArticleHero } from "@/components/reading/article-hero";
import { BookmarkButton } from "@/components/reading/bookmark-button";
import { PageLinks } from "@/components/reading/page-links";
import { PostArchive } from "@/components/reading/post-archive";
import { Reader } from "@/components/reading/reader";
import { TrackPlayer } from "@/components/radio/track-player";
import { SiteHeader } from "@/components/shell/site-header";
import { TickerCrown } from "@/components/shell/ticker/TickerCrown";
import { CreditsRail } from "@/components/sections/credits-rail";
import { ParallaxGrid } from "@/components/sections/parallax-grid";
import { Starliner } from "@/components/sections/starliner";
import type {
  CreditPerson,
  HighlightRange,
  Notice,
  ParallaxFrame,
  PostBody,
  Track
} from "@/lib/content/slots";

export function ReadingStage({
  posts,
  track,
  notices,
  credits,
  parallax,
  highlights
}: {
  posts: PostBody[];
  track: Track;
  notices: Notice[];
  credits: CreditPerson[];
  parallax: { title: string; frames: ParallaxFrame[] };
  highlights: HighlightRange[];
}) {
  const [page, setPage] = useState(1);
  const article = posts[page - 1] ?? posts[0];
  const [ranges, setRanges] = useState(highlights);
  const [bookmarked, setBookmarked] = useState(false);
  const frame = (
    <div className="port-rule h-80 rounded-[10px] border" />
  );

  return (
    <main className="port-shade min-h-screen bg-off-bg pt-[76px] text-faded-fg">
      <SiteHeader />
      <ArticleHero posts={posts} />
      <PostArchive posts={posts} />
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <Reader
          body={article?.body ?? ""}
          highlights={ranges.filter((range) => range.postId === article?.id)}
          onSave={(range) =>
            setRanges((current) => [...current, { ...range, postId: article?.id ?? range.postId }])
          }
        />
        <PageLinks page={page} totalPages={Math.max(posts.length, 1)} onPage={setPage} />
        <BookmarkButton
          kind="post"
          id={article?.id ?? "missing"}
          saved={bookmarked}
          onToggle={({ saved }) => setBookmarked(saved)}
        />
        <NoticeList notices={notices} />
        <SignInCard />
        <SignUpCard />
        <ForgotPasswordCard />
        <TwoFactorCard />
        <PasskeyButton />
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
