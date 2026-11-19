import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FlameFooterBackdrop } from "@/components/gl/flame-backdrop/FlameFooterBackdrop";

test("footer wrapper is a decorative image-backed field with mask overrides and no media", () => {
  const html = renderToStaticMarkup(
    <FlameFooterBackdrop
      maskSource="/masks/custom.svg"
      paused
      style={{ height: 420 }}
    />
  );
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /height:420px/);
  assert.doesNotMatch(html, /<video|<img/);
});
