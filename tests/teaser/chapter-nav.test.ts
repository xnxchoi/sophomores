import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Warp mounts the chapter nav after its handoff, inside AnimatePresence", () => {
  const warp = read("src/components/Warp/index.tsx");
  assert.match(
    warp,
    /import \{ ChapterNav \} from "@\/components\/teaser\/chapter-nav";/
  );
  assert.match(
    warp,
    /<AnimatePresence>\s*\{afterWarp && current !== "contacts" && \(\s*<ChapterNav\s+key="chapter-nav"\s+current=\{current\}\s+onHome=\{onChapterHome\}\s*\/>/
  );
  assert.match(warp, /setAfterWarp\(value >= HANDOFF\)/);
  assert.doesNotMatch(warp, /heroComplete && <ChapterNav/);
});

test("the nav's HOME scrolls to the Hero's top, never to 0, so Warp doesn't replay", () => {
  const warp = read("src/components/Warp/index.tsx");
  const handler =
    warp.match(/const onChapterHome = [\s\S]*?\n {4}\}\);/)?.[0] ?? "";
  assert.notEqual(handler, "", "onChapterHome is defined");
  assert.match(handler, /hero\.ref\.current/);
  assert.match(handler, /getBoundingClientRect\(\)\.top \+ window\.scrollY/);
  assert.doesNotMatch(handler, /scrollTo\(0\)/);
  const nav = read("src/components/teaser/chapter-nav.tsx");
  assert.doesNotMatch(nav, /useHomeNavigation/);
});

test("Warp keeps its existing skip-to-story link", () => {
  const warp = read("src/components/Warp/index.tsx");
  assert.match(warp, /href="#origin"[\s\S]*?\{t\("skipToStory"\)\}/);
});

test("chapter nav copy is catalogued and English-keyed", () => {
  const chapterNav = read("src/components/teaser/chapter-nav.tsx");
  for (const key of [
    "chapterNav",
    "chapterMenu",
    "chapterClose",
    "skipToNextChapter",
    "skipToChapter"
  ])
    assert.match(chapterNav, new RegExp(`t\\("${key}"[),]`));
  const en = JSON.parse(read("messages/en.json")).System;
  const ko = JSON.parse(read("messages/ko.json")).System;
  assert.deepEqual(Object.keys(ko), Object.keys(en));
  assert.equal(en.chapterMenu, "Menu");
});
