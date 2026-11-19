import assert from "node:assert/strict";
import test from "node:test";
import { linkable } from "@/lib/content/team-profile-link";

test("profile links keep genuine site paths and absolute https addresses", () => {
  assert.equal(linkable("/help"), "/help");
  assert.equal(linkable("/a b?x=1#y"), "/a%20b?x=1#y");
  assert.equal(linkable("https://example.com/a"), "https://example.com/a");
});

test("profile links leave out anything that could leave the site unexpectedly", () => {
  for (const href of [
    "/\\evil",
    "/\\\\evil.com",
    "//evil.com",
    "/./\\/evil",
    "/.//evil",
    "/..//evil",
    "/a/..//evil",
    "http://example.com/",
    "javascript:alert(1)",
    "mailto:someone@example.com",
    "not a link",
    "",
  ]) {
    assert.equal(linkable(href), null, href);
  }
  assert.equal(linkable(undefined), null);
});

test("every emitted site path starts with exactly one slash", () => {
  for (const href of ["/help", "/./help", "/a/../help", "/%2F%2Fevil"]) {
    const out = linkable(href);
    if (out !== null && !out.startsWith("https://")) assert.match(out, /^\/(?!\/)/, href);
  }
});
