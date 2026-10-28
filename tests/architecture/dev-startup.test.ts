import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../../proxy";

const manifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };

test("dev starts without preview credentials and binds only to loopback", () => {
  assert.match(manifest.scripts.dev, /(?:^|\s)PREVIEW_AUTH_MODE=public(?:\s|$)/);
  assert.match(manifest.scripts.dev, /\bnext dev\b/);
  assert.match(manifest.scripts.dev, /--hostname(?:=|\s+)127\.0\.0\.1(?:\s|$)/);
});

test("the dev authentication mode opens localhost but not the protected preview hostname", (t) => {
  const mode = manifest.scripts.dev.match(/(?:^|\s)PREVIEW_AUTH_MODE=(\S+)/)?.[1];
  assert.equal(mode, "public", "The normal dev command must configure its own local mode");
  const previousMode = process.env.PREVIEW_AUTH_MODE;
  const previousConfig = process.env.PREVIEW_AUTH_CONFIG;
  t.after(() => {
    if (previousMode === undefined) delete process.env.PREVIEW_AUTH_MODE;
    else process.env.PREVIEW_AUTH_MODE = previousMode;
    if (previousConfig === undefined) delete process.env.PREVIEW_AUTH_CONFIG;
    else process.env.PREVIEW_AUTH_CONFIG = previousConfig;
  });
  process.env.PREVIEW_AUTH_MODE = mode;
  delete process.env.PREVIEW_AUTH_CONFIG;
  const local = proxy(new NextRequest("http://127.0.0.1:3000/"));
  assert.equal(local.headers.get("x-middleware-next"), "1");
  const preview = proxy(new NextRequest("https://preview.sophomores.co/"));
  assert.equal(preview.status, 503);
  assert.equal(preview.headers.get("x-middleware-next"), null);
});

test("production commands do not inherit the local authentication exception", () => {
  for (const command of ["build", "start"]) {
    assert.doesNotMatch(manifest.scripts[command], /PREVIEW_AUTH_MODE\s*=\s*public/);
    assert.doesNotMatch(manifest.scripts[command], /NODE_ENV\s*=\s*development/);
  }
});
