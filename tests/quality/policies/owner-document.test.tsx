import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PolicyPage } from "@/app/(site)/_commerce/policy-page";
import { previewPolicyDocument } from "../../../scripts/preview/policy-document-fixture";
// PolicyPage renders the site's custom Link, so it needs the providers the account fixtures already give it.
import { MemberAuthProviders } from "../../member-auth/fixtures/providers";

const approved = { effectiveDate: "2020-01-01", sections: [{ heading: "Approved section", paragraphs: ["Approved text."] }] };
const render = (document: unknown) => renderToStaticMarkup(
  <MemberAuthProviders><PolicyPage policy="terms" content={approved} document={document as never} /></MemberAuthProviders>
);

test("a document table scrolls inside a labelled, focusable region with real header cells", () => {
  const html = render(previewPolicyDocument);
  assert.match(html, /<div role="region" aria-label="Scrollable table" tabindex="0"[^>]*overflow-x-auto[^>]*><table/);
  assert.equal((html.match(/<th scope="col"/g) ?? []).length, 3);
  assert.match(html, /<td[^>]*>[\s\S]*7 days/);
});

test("row headers, corner headers and spans keep their table semantics", () => {
  const cell = (value: string, headerState: number, colSpan = 1) => ({ type: "tablecell", version: 1, headerState, colSpan, rowSpan: 1, backgroundColor: null,
    children: [{ type: "paragraph", version: 1, direction: "ltr", format: "", indent: 0, textFormat: 0, children: [{ type: "text", text: value, format: 0, detail: 0, mode: "normal", style: "", version: 1 }] }] });
  const document = { root: { type: "root", version: 1, direction: "ltr", format: "", indent: 0, children: [
    { type: "paragraph", version: 1, direction: "ltr", format: "", indent: 0, textFormat: 0, children: [{ type: "text", text: "Owner terms", format: 0, detail: 0, mode: "normal", style: "", version: 1 }] },
    { type: "table", version: 1, children: [
      { type: "tablerow", version: 1, children: [cell("Corner", 3), cell("Period", 1, 2)] },
      { type: "tablerow", version: 1, children: [cell("Returns", 2), cell("7 days", 0), cell("Note", 0)] }
    ] }
  ] } };
  const html = render(document);
  assert.match(html, /<th scope="col"[^>]*>[\s\S]*?Corner/, "a corner header (state 3) labels its column");
  assert.match(html, /<th colSpan="2" scope="col"|<th colspan="2" scope="col"/i, "a spanning header keeps its span");
  assert.match(html, /<th scope="row"[^>]*>[\s\S]*?Returns/, "a header column labels its row");
  // Limit: Lexical has no explicit header-to-cell associations, so `headers`/`id` pairing for multi-level
  // headers is not produced; scope="col"/"row" is the extent of the semantics.
});
