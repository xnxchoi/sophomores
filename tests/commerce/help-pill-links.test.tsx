import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberAuthProviders } from "../member-auth/fixtures/providers";
import { HelpPillLinks } from "@/app/(site)/_commerce/help-pill-links";

const render = (contactEmail: string | null) => renderToStaticMarkup(
  <MemberAuthProviders><HelpPillLinks contactEmail={contactEmail} onClose={() => {}} /></MemberAuthProviders>,
);

test("the Help pill lists the support pages and Close, with Contact only once the email is published", () => {
  const without = render(null);
  for (const path of ["/help", "/help/shipping", "/me/orders"]) assert.equal(without.includes(`href="${path}"`), true, path);
  for (const path of ["/terms", "/privacy", "/refund"]) assert.equal(without.includes(`href="${path}"`), false, path);
  assert.equal(without.includes("mailto:"), false);
  assert.match(without, /<button type="button"[^>]*>(?:<span[^>]*>)?Close(?:<\/span>)?<\/button>/);
  assert.equal(render("help@example.test").includes('href="mailto:help@example.test"'), true);
  const custom = renderToStaticMarkup(
    <MemberAuthProviders><HelpPillLinks onClose={() => {}} closeLabel="Class dismissed" /></MemberAuthProviders>,
  );
  assert.match(custom, /<button type="button"[^>]*>(?:<span[^>]*>)?Class dismissed(?:<\/span>)?<\/button>/);
  assert.equal(without.includes("Site guide"), false);
  const guide = renderToStaticMarkup(
    <MemberAuthProviders><HelpPillLinks contactEmail="help@example.test" onClose={() => {}} onOpenGuide={() => {}} /></MemberAuthProviders>,
  );
  assert.match(guide, /<button type="button"[^>]*>(?:<span[^>]*>)?Site guide(?:<\/span>)?<\/button>/);
  assert.equal(guide.indexOf('href="/me/orders"') < guide.indexOf("Site guide") && guide.indexOf("Site guide") < guide.indexOf("mailto:"), true);
});
