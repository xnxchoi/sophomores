import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Owner, 24 Nov: "I need to see the not-found as well to ensure we ported everything." The Hideaway's 404
// (hideawayseoul.com, read from its served RSC payload): RPage type 404 > div.title-wrapper.fixed.h-full.w-full >
// MissingLayout, then Missing, then a fixed z-1 centred LinkUnderlined (bg-transparent hover:text-deep-cinnabar, raised
// 20 px). Title "404...".
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("both 404 routes carry The Hideaway's title", () => {
  for (const file of ["src/app/(site)/not-found.tsx", "src/app/global-not-found.tsx"]) {
    assert.match(read(file), /title: "404\.\.\.",/, file);
  }
});

test("the 404 screen keeps The Hideaway's composition", () => {
  const screen = read("src/components/layouts/Missing/not-found-screen.tsx");
  assert.match(screen, /className="title-wrapper fixed h-full w-full">\s*<MissingLayout \/>/);
  assert.match(screen, /<Missing \/>/);
  assert.match(screen, /className="fixed z-1 flex h-full w-full items-center justify-center/);
  assert.match(screen, /relative bottom-5/);
  assert.match(screen, /<LinkUnderlined className="[^"]*bg-transparent hover:text-deep-cinnabar" href="\/">/);
});
