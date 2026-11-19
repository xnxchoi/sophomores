import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import FooterFlame, {
  FlameFooterBackdrop,
  DEFAULT_FOOTER_CONFIG
} from "@/components/gl/flame-backdrop/footer";
import { FlameBackdrop } from "@/components/gl/flame-backdrop";

test("footer entry selects the approved footer without changing the original ring export", () => {
  assert.equal(FooterFlame, FlameFooterBackdrop);
  assert.notEqual(FooterFlame, FlameBackdrop);
  assert.equal(DEFAULT_FOOTER_CONFIG.fire.plumeHeight, 0.25);
  const html = renderToStaticMarkup(<FooterFlame style={{ height: 480 }} />);
  assert.match(html, /height:480px/);
  assert.match(html, /data-flame-field/);
  assert.doesNotMatch(html, /<video|<img|<script/);
});
