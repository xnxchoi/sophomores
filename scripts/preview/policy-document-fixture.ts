/**
 * One clearly synthetic owner-document policy for the disposable preview, so /terms exercises the rich-text
 * path: generated heading anchors, nested headings, lists, a table, a link and a quote. It holds only what
 * the policy editor can author (default features plus tables). Never a real policy.
 */
const text = (value: string, format = 0) => ({ type: "text", text: value, format, detail: 0, mode: "normal", style: "", version: 1 });
const block = { direction: "ltr", format: "", indent: 0, version: 1 } as const;
const paragraph = (...children: object[]) => ({ ...block, type: "paragraph", textFormat: 0, children });
const heading = (tag: "h2" | "h3", value: string) => ({ ...block, type: "heading", tag, children: [text(value)] });
const cell = (value: string, headerState = 0) => ({ type: "tablecell", version: 1, headerState, colSpan: 1, rowSpan: 1, backgroundColor: null, children: [paragraph(text(value))] });
const row = (...cells: object[]) => ({ type: "tablerow", version: 1, children: cells });

export const PREVIEW_POLICY_MARKER = "PREVIEW sample policy document";

export const previewPolicyDocument = {
  root: {
    ...block,
    type: "root",
    children: [
      paragraph(text(`${PREVIEW_POLICY_MARKER}. Synthetic layout fixture, not a real policy.`, 1)),
      heading("h2", "PREVIEW Using the site"),
      paragraph(text("Placeholder text that wraps across several lines, so the reading measure, the contents rail and the anchors can be judged at every width.")),
      { type: "table", version: 1, children: [
        row(cell("PREVIEW item", 1), cell("PREVIEW period", 1), cell("PREVIEW note", 1)),
        row(cell("PREVIEW returns"), cell("7 days"), cell("A long placeholder note, so the table is wider than a phone and has to scroll inside its region.")),
        row(cell("PREVIEW refunds"), cell("3 business days"), cell("Placeholder."))
      ] },
      heading("h3", "PREVIEW Accounts"),
      { ...block, type: "list", listType: "bullet", start: 1, tag: "ul", children: [
        { ...block, type: "listitem", value: 1, children: [text("PREVIEW first list item")] },
        { ...block, type: "listitem", value: 2, children: [text("PREVIEW second list item, long enough to wrap onto a second line on a phone.")] }
      ] },
      heading("h3", "PREVIEW Accounts"),
      paragraph(text("A repeated heading, so the generated anchors must stay unique.")),
      heading("h2", "PREVIEW Contact"),
      { ...block, type: "quote", children: [text("PREVIEW quoted note.")] },
      paragraph(
        text("See "),
        { ...block, type: "link", fields: { linkType: "custom", url: "/help", newTab: false }, children: [text("Help")] },
        text(" for the placeholder contact route.")
      )
    ]
  }
};

/** True only for the stored fixture itself, so the seed can tell it from anything an owner wrote. */
export function isPreviewPolicyDocument(value: unknown): boolean {
  const first = (value as { root?: { children?: Array<{ children?: Array<{ text?: unknown }> }> } } | null)?.root?.children?.[0];
  const opening = first?.children?.[0]?.text;
  return typeof opening === "string" && opening.startsWith(PREVIEW_POLICY_MARKER);
}
