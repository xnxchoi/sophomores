import { EnglishMessages } from "../../fixtures/english-messages";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PlayPauseButton } from "@/components/radio/play-pause";

test("play and pause share one morphing path", () => {
  const html = renderToStaticMarkup(<EnglishMessages><PlayPauseButton playing={false} onToggle={() => undefined} /></EnglishMessages>);
  assert.match(html, /aria-label="Play"/);
  assert.match(html, /M3\.24182 2\.32181/);
  assert.equal(html.includes(">Play<"), false);
});
