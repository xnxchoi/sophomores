import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PolicyPage } from "@/app/(site)/_commerce/policy-page";
import { isPreviewPolicyDocument, previewPolicyDocument } from "../../scripts/preview/policy-document-fixture";
// PolicyPage renders the site's custom Link, so it needs the providers the account fixtures already give it.
import { MemberAuthProviders } from "../member-auth/fixtures/providers";

const approved = { effectiveDate: "2020-01-01", sections: [{ heading: "Approved section", paragraphs: ["Approved text."] }] };
const render = (document: unknown) => renderToStaticMarkup(
  <MemberAuthProviders><PolicyPage policy="terms" content={approved} document={document as never} /></MemberAuthProviders>
);

test("an owner document renders in place of the approved sections", () => {
  const html = render(previewPolicyDocument);
  assert.match(html, /PREVIEW sample policy document/);
  assert.doesNotMatch(html, /Approved section/, "the owner document wins over approved sections");
  assert.match(html, /id="policy-title"/);
});

test("document headings get unique, namespaced anchors the contents rail links to", () => {
  const html = render(previewPolicyDocument);
  const ids = [...html.matchAll(/<h[23][^>]*\sid="(policy-doc-[^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids, ["policy-doc-preview-using-the-site", "policy-doc-preview-accounts", "policy-doc-preview-accounts-2", "policy-doc-preview-contact"]);
  for (const id of ids) assert.ok(html.includes(`href="#${id}"`), `contents links to ${id}`);
  assert.equal(new Set(ids).size, ids.length);
});

test("lists, quotes and links in the document render as real elements", () => {
  const html = render(previewPolicyDocument);
  assert.match(html, /<ul[\s>][\s\S]*PREVIEW first list item[\s\S]*<\/ul>/);
  assert.match(html, /<blockquote[\s>][\s\S]*PREVIEW quoted note/);
  assert.match(html, /<a[^>]*href="\/help"[^>]*>Help<\/a>/);
});

test("the seed can tell its fixture from anything an owner wrote", () => {
  assert.equal(isPreviewPolicyDocument(previewPolicyDocument), true);
  assert.equal(isPreviewPolicyDocument(null), false);
  assert.equal(isPreviewPolicyDocument({ root: { children: [{ children: [{ text: "Owner terms" }] }] } }), false);
});
