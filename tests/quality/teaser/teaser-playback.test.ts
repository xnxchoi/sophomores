import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../../fixtures/english-render";
import { compile } from "tailwindcss";
import { Story } from "@/components/teaser/story";

test("hover never gates or recreates the story reading clock", () => {
  const source = readFileSync(
    new URL("../../../src/components/teaser/story.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /hoveredCard|isActiveStoryHovered|updateStoryHover|!hovered/
  );
  assert.doesNotMatch(source, /createStoryPlaybackController/);
});

test("fine-pointer track hover fades every story progress bar uniformly after the same enter and leave delay", async () => {
  const css = readFileSync(
    new URL("../../../src/styles/teaser.css", import.meta.url),
    "utf8"
  );
  const html = renderToStaticMarkup(
    createElement(Story, { onActive: () => {} })
  );
  const progressClasses = [...html.matchAll(/<div\b([^>]*\bdata-story-progress=""[^>]*)>/g)]
    .map(([, attrs]) => attrs.match(/\bclass="([^"]*)"/)?.[1]?.split(/\s+/) ?? []);
  assert.ok(progressClasses.length > 0);
  assert.ok(
    progressClasses.every((classes) =>
      classes.some((name) => name.includes("group-hover/track:opacity-0"))
    )
  );
  const require = createRequire(import.meta.url);
  const theme = readFileSync(require.resolve("tailwindcss/theme.css"), "utf8");
  const compiler = await compile(`${theme}\n@tailwind utilities;`);
  const progressCSS = compiler.build([...new Set(progressClasses.flat())]);
  assert.match(progressCSS, /opacity:\s*(?:1|100%);/);
  assert.match(progressCSS, /transition-property:\s*opacity;/);
  assert.match(progressCSS, /transition-duration:\s*180ms;/);
  assert.match(progressCSS, /transition-delay:\s*150ms;/);
  assert.match(progressCSS, /transition-timing-function:\s*ease-out;/);
  assert.doesNotMatch(css, /story-track|story-progress|story-card|story-photo|story-artwork/);
});
