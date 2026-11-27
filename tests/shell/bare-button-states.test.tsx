import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@/components/core/Button";
import { SiteContexts } from "../fixtures/site-contexts";

const render = (button: ReactElement) => renderToStaticMarkup(<SiteContexts>{button}</SiteContexts>);

// Auth-editions, 27 Nov (S7): a caller's own aria-busy survives the bare button; only loading marks it unavailable.
test("a bare button keeps the caller's aria-busy and aria-disabled", () => {
  const busy = render(<Button variant="bare" aria-busy={true}>Quote</Button>);
  assert.match(busy, /aria-busy="true"/);
  assert.doesNotMatch(busy, /aria-disabled/);
  assert.match(busy, /type="button"/);

  assert.match(render(<Button variant="bare" aria-busy={false}>Quote</Button>), /aria-busy="false"/);
  assert.match(render(<Button variant="bare" aria-disabled="true">Quote</Button>), /aria-disabled="true"/);
  assert.doesNotMatch(render(<Button variant="bare">Quote</Button>), /aria-busy|aria-disabled/);
});

test("loading marks a bare button busy and unavailable", () => {
  const loading = render(<Button variant="bare" loading>Quote</Button>);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /aria-disabled="true"/);
  assert.match(render(<Button variant="bare" type="submit">Send</Button>), /type="submit"/);
});
