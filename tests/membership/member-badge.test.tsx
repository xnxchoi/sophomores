import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberBadge } from "@/components/membership/member-badge";

test("MemberBadge marks out its area for the shared canvas and brings no canvas of its own", () => {
  const html = renderToStaticMarkup(<MemberBadge className="h-96" />);
  assert.match(html, /h-96/);
  assert.equal(html.includes("<canvas"), false);
});
