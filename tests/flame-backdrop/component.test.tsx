import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FlameBackdrop } from "../../components/flame-backdrop/FlameBackdrop";

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

test("accepts externally controlled blend weights and rejects invalid duration", () => {
  assert.doesNotThrow(() =>
    renderToStaticMarkup(
      <FlameBackdrop palette={[1, 2, 3]} transitionSeconds={0} paused />
    )
  );
  for (const duration of [-1, Infinity, NaN]) {
    assert.throws(
      () =>
        renderToStaticMarkup(<FlameBackdrop transitionSeconds={duration} />),
      /transitionSeconds/
    );
  }
});

test("viewport controls validate in SSR while retaining a hidden canvas before observation", () => {
  for (const viewportActivation of ["none", "once", "repeat"] as const) {
    const html = renderToStaticMarkup(
      <FlameBackdrop
        viewportActivation={viewportActivation}
        viewportThreshold={0.3}
      />
    );
    assert.match(html, /<canvas[^>]*hidden/);
  }
  for (const viewportThreshold of [-1, 1.01, NaN, Infinity, null, "0.3"]) {
    assert.throws(
      () =>
        renderToStaticMarkup(
          <FlameBackdrop viewportThreshold={viewportThreshold as never} />
        ),
      /viewportThreshold/
    );
  }
  assert.throws(
    () =>
      renderToStaticMarkup(
        <FlameBackdrop viewportActivation={"invalid" as never} />
      ),
    /viewportActivation/
  );
});

test("material selection validates during SSR and never leaks onto the DOM", () => {
  for (const footerMaterial of ["light", "substance"] as const) {
    const html = renderToStaticMarkup(
      <FlameBackdrop footerMaterial={footerMaterial} />
    );
    assert.doesNotMatch(html, /footerMaterial|substance/);
    assert.match(html, /<canvas[^>]*hidden/);
  }
  for (const invalid of [null, "", "glass", 1, {}]) {
    assert.throws(
      () =>
        renderToStaticMarkup(
          <FlameBackdrop footerMaterial={invalid as never} />
        ),
      /footerMaterial/
    );
  }
});
