import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

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
