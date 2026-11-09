import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { CreditsRail } from "@/components/sections/credits-rail";
import { ParallaxGrid } from "@/components/sections/parallax-grid";
import { Starliner } from "@/components/sections/starliner";
import { PageLinks } from "@/components/reading/page-links";
import { ArticleHero } from "@/components/reading/article-hero";
import { MEMBER_BADGE_URL } from "@/lib/content/assets";
import { PostCardView } from "@/components/reading/post-card";
import { ClientLayout } from "@/app/(site)/client-layout";
import { Providers } from "@/providers";
import { PlayPauseButton } from "@/components/radio/play-pause";
import { TrackRow } from "@/components/radio/track-row";
import { creditFixtures, parallaxFixtures, postFixtures, trackFixtures } from "@/lib/content/fixtures";
import { getHeaderScrollProgress } from "@/lib/content/header-motion";
import { spawnConfetti, stepConfetti } from "@/lib/content/confetti";
import { clampSeek, counterReadout, playbackProgress, reelPack, SEEK_STEP_SECONDS } from "@/lib/content/transport";
import { isSixDigitCode } from "@/lib/content/auth-code";
import { rangeForQuote, sliceBody } from "@/lib/content/highlight";
import { fromCredit, fromParallax, fromPost, fromTrack } from "@/lib/content/map";

const unexpectedNavigation = () => { throw new Error("SSR fixture must not navigate"); };
const fixtureRouter: AppRouterInstance = {
  back: unexpectedNavigation,
  forward: unexpectedNavigation,
  refresh: unexpectedNavigation,
  push: unexpectedNavigation,
  replace: unexpectedNavigation,
  prefetch: unexpectedNavigation,
  bfcacheId: "reading-ssr-fixture",
};

function ReadingFixture({ children }: { children: ReactNode }) {
  return <AppRouterContext.Provider value={fixtureRouter}><Providers><ClientLayout><main data-reading-fixture="content">{children}</main></ClientLayout></Providers></AppRouterContext.Provider>;
}

test("a post fixture maps to a card without a collection", () => {
  const post = fromPost(postFixtures[0]);
  assert.equal(post.href, "/read/lights-low");
  assert.deepEqual(post.tags, ["Notes"]);
  const html = renderToStaticMarkup(<ReadingFixture><PostCardView post={post} /></ReadingFixture>)
    .split('<main data-reading-fixture="content">')[1].split('</main>')[0];
  assert.match(html, /A room with the lights low/);
  assert.match(html, /Fixture Author/);
});

test("the article grid keeps the lead and a later post", () => {
  const posts = postFixtures.map(fromPost);
  const html = renderToStaticMarkup(<ReadingFixture><ArticleHero posts={posts} /></ReadingFixture>)
    .split('<main data-reading-fixture="content">')[1].split('</main>')[0];
  assert.match(html, /A room with the lights low/);
  assert.match(html, /Rail one/);
  assert.match(html, /lg:col-span-4/);
  assert.match(html, /lg:col-start-5/);
  assert.match(html, /lg:row-span-2/);
  assert.equal(html.includes("text-[10px]"), false);
  assert.equal(html.includes("<img"), false);
});

test("a hero url fills the lead well", () => {
  const post = fromPost({ ...postFixtures[0], heroUrl: "/assets/credits/fixture-author.svg" });
  const html = renderToStaticMarkup(<ReadingFixture><ArticleHero posts={[post]} /></ReadingFixture>)
    .split('<main data-reading-fixture="content">')[1].split('</main>')[0];
  assert.match(html, /src="\/assets\/credits\/fixture-author\.svg"/);
});

test("credits, parallax, and starliner render from slots", () => {
  const credits = renderToStaticMarkup(
    <CreditsRail people={creditFixtures.map(fromCredit)} />
  );
  const parallax = fromParallax(parallaxFixtures[0]);
  const grid = renderToStaticMarkup(
    <ParallaxGrid title={parallax.title} frames={parallax.images} />
  );
  const stars = renderToStaticMarkup(<Starliner />);
  assert.match(credits, /Fixture Author/);
  assert.match(credits, /Editor/);
  assert.equal(credits.includes("profilePic"), false);
  assert.match(grid, /Still frames/);
  assert.equal((stars.match(/starline /g) ?? []).length, 17);
  assert.match(stars, /left:-110px/);
  assert.match(stars, /left:290px/);
  assert.match(stars, /starliner-backdrop\.svg/);
});

test("a quote in the body becomes a highlight range", () => {
  const body = postFixtures[0].body;
  const quote = "no database";
  const range = rangeForQuote(body, quote);
  assert.deepEqual(range, { start: body.indexOf(quote), end: body.indexOf(quote) + quote.length });
  const parts = sliceBody(body, [{ id: "h1", start: range!.start, end: range!.end }]);
  assert.equal(parts.some((part) => part.id === "h1" && part.text === quote), true);
});

test("a two-factor code is six digits", () => {
  assert.equal(isSixDigitCode("123456"), true);
  assert.equal(isSixDigitCode("12345"), false);
  assert.equal(isSixDigitCode("12345a"), false);
});

test("page links and the badge path stay small", () => {
  const html = renderToStaticMarkup(<PageLinks page={1} totalPages={3} />);
  assert.match(html, /Previous/);
  assert.match(html, /1 \/ 3/);
  assert.equal(MEMBER_BADGE_URL, "/assets/badge/badge_compressed.glb");
});

test("header scrub progress clamps to the compact range", () => {
  assert.equal(getHeaderScrollProgress(-50), 0);
  assert.equal(getHeaderScrollProgress(175), 0.5);
  assert.equal(getHeaderScrollProgress(700), 1);
});

test("a track fixture maps to a row without a collection", () => {
  const track = fromTrack(trackFixtures[0]);
  assert.equal(track.audioUrl, "/audio/night-desk.mp3");
  const html = renderToStaticMarkup(<TrackRow track={track} />);
  assert.match(html, /Night desk/);
  assert.match(html, /Fixture Ensemble/);
});

test("transport seek stays inside the track", () => {
  assert.equal(SEEK_STEP_SECONDS, 10);
  assert.equal(clampSeek(3, -10, 180), 0);
  assert.equal(clampSeek(175, 10, 180), 180);
  assert.equal(playbackProgress(45, 180), 0.25);
  assert.equal(playbackProgress(10, 0), 0);
  assert.deepEqual(counterReadout(65, 186), { elapsed: "01:05", remaining: "02:01" });
  assert.deepEqual(counterReadout(0, 0), { elapsed: "00:00", remaining: "00:00" });
  const start = reelPack(0);
  const end = reelPack(1);
  assert.ok(start.supply > start.takeup);
  assert.ok(end.takeup > end.supply);
  assert.equal(start.supply, end.takeup);
});

test("patron confetti launches upward from the bottom", () => {
  const pieces = spawnConfetti(240, 120, 12);
  assert.equal(pieces.length, 12);
  assert.ok(pieces.every((piece) => piece.y === 119 && piece.vy < 0));
  const next = stepConfetti(pieces, 120, 0, 0, 100);
  assert.ok(next.length > 0);
  assert.ok(next[0].y < 119);
});

test("the tape model is the cassette gltf", () => {
  assert.equal(fs.existsSync("public/assets/three/tape/player.gltf"), true);
  assert.equal(fs.existsSync("public/assets/three/tape/player.bin"), true);
  assert.equal(fs.existsSync("public/assets/three/tape/urban_alley_01_1k.hdr"), true);
  assert.equal(fs.existsSync("public/assets/fonts/Workbench.ttf"), true);
  assert.equal(fs.existsSync("public/assets/three/tape/Display.mp4"), false);
});

test("play and pause share one morphing path", () => {
  const html = renderToStaticMarkup(<PlayPauseButton playing={false} onToggle={() => undefined} />);
  assert.match(html, /aria-label="Play"/);
  assert.match(html, /M3\.24182 2\.32181/);
  assert.equal(html.includes(">Play<"), false);
});
