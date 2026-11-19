import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FlameBackdrop } from "@/components/gl/flame-backdrop/FlameBackdrop";

test("SSR is decorative, transparent to input, self-contained and accepts a fallback", () => {
  const html = renderToStaticMarkup(
    <FlameBackdrop
      className="background"
      style={{ height: 500 }}
      fallback={<span>Still fallback</span>}
    />
  );
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /pointer-events:none/);
  assert.match(html, /height:500px/);
  assert.match(html, /Still fallback/);
  assert.match(html, /<canvas[^>]*hidden/);
  assert.doesNotMatch(html, /<video|<script|<iframe/);
});
