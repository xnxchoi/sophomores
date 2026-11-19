import assert from "node:assert/strict";
import test from "node:test";
import { documentOutline, editorDocument } from "@/app/(site)/_long-form/long-form";

const text = (value: string) => ({ type: "text", text: value, version: 1 });
const heading = (tag: string, value: string) => ({ type: "heading", tag, children: [text(value)], version: 1 });
const paragraph = (value: string) => ({ type: "paragraph", children: [text(value)], version: 1 });
const state = (children: unknown[]) => ({ root: { type: "root", children, direction: null, format: "", indent: 0, version: 1 } });

test("owner text without a usable root falls back", () => {
  for (const value of [null, undefined, "Policy", { text: "Policy" }, { root: null }, { root: { children: "x" } }]) {
    assert.equal(editorDocument(value), null);
  }
});

const deep = (levels: number) => {
  let node: unknown = text("deep");
  for (let index = 0; index < levels; index++) node = { type: "paragraph", children: [node] };
  return node;
};
type Node = { type: string; children: Node[]; text?: string };
const everyChildArray = (node: Node): boolean => Array.isArray(node.children) && node.children.every(everyChildArray);
const textOf = (node: Node): string => node.text ?? node.children.map(textOf).join("");

// One boundary normaliser: whatever arrives, every node downstream names its type and has an array of children.
for (const [name, children, texts] of [
  ["null sibling", [null, paragraph("Kept")], ["Kept"]],
  ["children not an array", [{ type: "heading", tag: "h2", children: "oops" }, { type: "paragraph", children: { 0: "x" } }], ["", ""]],
  ["number and string nodes", [7, "str", { type: "paragraph", children: [3, "s", text("t")] }], ["t"]],
  ["missing or non-string type", [{ children: [text("orphan")] }, { type: 5 }], []],
  ["non-string text", [{ type: "paragraph", children: [{ type: "text", text: 42 }] }], [""]],
  ["deep nesting within the cap", [deep(10)], ["deep"]],
  ["nesting past the cap", [deep(200)], [""]],
  ["link without fields, upload without a document", [{ type: "link", fields: null, children: [text("l")] }, { type: "upload", value: null }, { type: "upload", value: { url: "/x" } }], ["l"]],
] as const) {
  test(`malformed input is normalised before the outline and the renderer: ${name}`, () => {
    const document = editorDocument(state([...children]));
    assert.ok(document);
    const nodes = document.root.children as unknown as Node[];
    assert.equal(nodes.every(everyChildArray), true);
    assert.deepEqual(nodes.map(textOf), [...texts]);
    assert.doesNotThrow(() => documentOutline(document));
  });
}

test("generated anchors are unique, namespaced, and never reuse published ids", () => {
  const document = editorDocument(state([heading("h2", "Fees"), heading("h2", "Fees"), heading("h3", "Fees 2"), heading("h2", "Document"), heading("h2", "Title"), heading("h2", "환불"), heading("h2", "!!!")]));
  assert.ok(document);
  const ids = documentOutline(document).entries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ["policy-doc-fees", "policy-doc-fees-2", "policy-doc-fees-2-2", "policy-doc-document", "policy-doc-title", "policy-doc-환불", "policy-doc-heading"]);
  for (const reserved of ["policy-title", "policy-document"]) assert.equal(ids.includes(reserved), false);
});
