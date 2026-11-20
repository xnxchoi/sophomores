import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ContentsNav } from "@/app/(site)/_long-form/contents-nav";

const entries = [
  { id: "shipping", label: "Shipping", depth: 2 as const },
  { id: "returns", label: "Returns", depth: 2 as const },
  { id: "returns-window", label: "Window", depth: 3 as const },
  { id: "returns-preview", label: "PREVIEW only", depth: 3 as const },
  { id: "contact", label: "Contact", depth: 2 as const },
];

test("nested contents entries are numbered under their parent and top-level numbers don't shift", () => {
  const html = renderToStaticMarkup(<ContentsNav entries={entries} label="Contents" />);
  // The rail repeats the phone list, so read one list.
  const rail = html.slice(html.lastIndexOf("<ol"));
  const numbers = [...rail.matchAll(/<span aria-hidden="true"[^>]*>([^<]*)<\/span>/g)].map((match) => match[1]);
  assert.deepEqual(numbers, ["01", "02", "02.1", "02.2", "03"]);
  for (const entry of entries) assert.ok(rail.includes(`href="#${entry.id}"`), entry.id);
});

test("a nested entry with no top-level entry before it is listed as top-level, never 00.1", () => {
  const leading = [{ id: "intro", label: "Intro", depth: 3 as const }, ...entries];
  const html = renderToStaticMarkup(<ContentsNav entries={leading} label="Contents" />);
  const rail = html.slice(html.lastIndexOf("<ol"));
  const numbers = [...rail.matchAll(/<span aria-hidden="true"[^>]*>([^<]*)<\/span>/g)].map((match) => match[1]);
  assert.deepEqual(numbers, ["01", "02", "03", "03.1", "03.2", "04"]);
});

test("every nested entry before the first top-level entry is listed as top-level, not under the first", () => {
  const run = [{ id: "a", label: "A", depth: 3 as const }, { id: "b", label: "B", depth: 3 as const }, ...entries];
  const html = renderToStaticMarkup(<ContentsNav entries={run} label="Contents" />);
  const rail = html.slice(html.lastIndexOf("<ol"));
  const numbers = [...rail.matchAll(/<span aria-hidden="true"[^>]*>([^<]*)<\/span>/g)].map((match) => match[1]);
  assert.deepEqual(numbers, ["01", "02", "03", "04", "04.1", "04.2", "05"]);
  // Only real children are indented.
  assert.equal((rail.match(/pl-\[3\.25rem\]/g) ?? []).length, 2);
});
