import { cn } from "@/lib/utils";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText, type JSXConvertersFunction } from "@payloadcms/richtext-lexical/react";
import type { ApprovedPolicy } from "@/lib/commerce/disclosures";
import type { ReactNode } from "react";

/** One entry in a page's contents: an anchor that exists in the rendered text. */
export type ContentsEntry = { id: string; label: string; depth: 2 | 3 };

/**
 * C14 long-form typography for help and policies. Prose arrives as approved strings or owner-edited
 * rich text and is rendered as-is: this sets rhythm, hierarchy, lists, links, quotes and tables only.
 */
export function LongFormProse({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      "min-w-0 text-base leading-[1.8] break-words sm:text-lg [&>*+*]:mt-6",
      "[&_h2]:scroll-mt-28 [&_h2]:pt-10 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:leading-snug [&_h2]:tracking-tight [&_h2]:text-balance sm:[&_h2]:text-3xl",
      "[&_h3]:scroll-mt-28 [&_h3]:pt-6 [&_h3]:text-xl [&_h3]:leading-snug [&_h3]:font-medium",
      "[&_h4]:scroll-mt-28 [&_h4]:pt-4 [&_h4]:font-medium [&_h5]:scroll-mt-28 [&_h6]:scroll-mt-28",
      "[&_a]:underline [&_a]:decoration-current/40 [&_a]:underline-offset-4 hover:[&_a]:decoration-current",
      "[&_strong]:font-semibold",
      "[&_ul]:list-disc [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:pl-6 [&_li]:pl-1 [&_li+li]:mt-3 [&_li]:marker:text-muted-foreground [&_li_ol]:mt-3 [&_li_ul]:mt-3",
      "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-6 [&_blockquote]:text-muted-foreground",
      "[&_hr]:my-12 [&_hr]:border-border",
      className
    )}>
      {children}
    </div>
  );
}

/** Approved policy sections. Anchors keep their published form (`policy-section-0`), which survives heading edits in either language. */
export function LongFormSections({ sections, prefix = "policy", heading: Heading = "h2" }: {
  sections: ApprovedPolicy["sections"];
  prefix?: string;
  heading?: "h2" | "h3";
}) {
  return (
    <div className="space-y-12 sm:space-y-16">
      {sections.map((section, index) => (
        <section key={index} id={`${prefix}-section-${index}`} aria-labelledby={`${prefix}-heading-${index}`} className="scroll-mt-28">
          <Heading
            id={`${prefix}-heading-${index}`}
            className={cn("tracking-tight text-balance", Heading === "h2" ? "font-heading text-2xl leading-snug sm:text-3xl" : "text-xl leading-snug font-medium")}
          >
            {section.heading}
          </Heading>
          <LongFormProse className="mt-5">
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex} className="whitespace-pre-line">{paragraph}</p>
            ))}
          </LongFormProse>
        </section>
      ))}
    </div>
  );
}

export function sectionsContents(sections: ApprovedPolicy["sections"], prefix = "policy"): ContentsEntry[] {
  return sections.map((section, index) => ({ id: `${prefix}-section-${index}`, label: section.heading, depth: 2 }));
}

/** A node after normalisation: `type` is a string and `children` is always an array of normalised nodes. */
type ReadingNode = { type: string; children: ReadingNode[]; text?: string; tag?: unknown; [key: string]: unknown };

/** Owner rich text that has passed `editorDocument`. Every function below accepts only this type. */
export type ReadingDocument = SerializedEditorState & { readonly normalised: true };

/** Deeper than any real policy; past it, nesting is treated as malformed. */
const MAX_DEPTH = 64;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function normaliseNode(raw: unknown, depth: number): ReadingNode | null {
  if (depth > MAX_DEPTH || !isRecord(raw) || typeof raw.type !== "string") return null;
  // Uploads render from their related document; without one there is nothing to show.
  if (raw.type === "upload" && !(isRecord(raw.value) && typeof raw.value.mimeType === "string")) return null;
  const node: ReadingNode = {
    ...raw,
    type: raw.type,
    children: Array.isArray(raw.children) ? raw.children.flatMap((child) => normaliseNode(child, depth + 1) ?? []) : [],
  };
  if ("text" in raw) node.text = typeof raw.text === "string" ? raw.text : "";
  if (raw.type === "link" || raw.type === "autolink") {
    const fields = isRecord(raw.fields) ? raw.fields : {};
    node.fields = { ...fields, url: typeof fields.url === "string" ? fields.url : "", newTab: fields.newTab === true, linkType: fields.linkType === "internal" ? "internal" : "custom" };
  }
  return node;
}

/**
 * The single boundary for owner-edited rich text. Unknown input becomes a validated tree or null: every
 * node names its type, children is always an array of validated nodes, text is always a string, link
 * fields have the shape the renderer reads, and anything else (null, numbers, strings, untyped or
 * over-deep nodes, uploads without a document) is dropped. Dropped entries carry no readable text.
 */
export function editorDocument(value: unknown): ReadingDocument | null {
  if (!isRecord(value) || !isRecord(value.root) || !Array.isArray(value.root.children)) return null;
  const children = value.root.children.flatMap((child) => normaliseNode(child, 1) ?? []);
  return { ...value, root: { ...value.root, type: "root", children }, normalised: true } as unknown as ReadingDocument;
}

const textOf = (node: ReadingNode): string => node.text ?? node.children.map(textOf).join("");

/**
 * Contents and heading anchors for owner-edited rich text, derived together so every entry has a
 * target. Slugs live in their own `policy-doc-` namespace, apart from the published `policy-section-N`,
 * `policy-heading-N`, `policy-document` and `policy-title` anchors. They keep Hangul and other letters,
 * are lower-cased after NFC normalisation, and every emitted id is reserved, so repeats gain the next
 * free `-2`, `-3`. The heading text is only read, never rewritten.
 */
export function documentOutline(data: ReadingDocument) {
  const ids = new WeakMap<object, string>();
  const entries: ContentsEntry[] = [];
  const used = new Set<string>();
  for (const node of data.root.children as unknown as ReadingNode[]) {
    if (node.type !== "heading" || (node.tag !== "h2" && node.tag !== "h3")) continue;
    const label = textOf(node).trim();
    if (!label) continue;
    const base = "policy-doc-" + (label.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "heading");
    let id = base;
    for (let count = 2; used.has(id); count++) id = `${base}-${count}`;
    used.add(id);
    ids.set(node, id);
    entries.push({ id, label, depth: node.tag === "h2" ? 2 : 3 });
  }
  return { entries, ids };
}

const HEADINGS = ["h2", "h3", "h4", "h5", "h6"] as const;

/**
 * Owner-edited policy text. Headings gain their outline anchors and never compete with the page title
 * (an authored h1 reads as h2); `nested` steps every heading down one level when the text sits inside
 * another section. Tables lose the editor's inline styling and scroll on their own.
 */
export function LongFormDocument({ data, ids, tableLabel, nested = false }: {
  data: ReadingDocument;
  ids: WeakMap<object, string>;
  tableLabel: string;
  nested?: boolean;
}) {
  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    heading: ({ node, nodesToJSX }) => {
      const level = Math.max(0, HEADINGS.findIndex((tag) => tag === node.tag)) + (nested ? 1 : 0);
      const Tag = HEADINGS[Math.min(level, HEADINGS.length - 1)]!;
      return <Tag id={ids.get(node)}>{nodesToJSX({ nodes: node.children })}</Tag>;
    },
    table: ({ node, nodesToJSX }) => (
      <div role="region" aria-label={tableLabel} tabIndex={0} className="max-w-full overflow-x-auto rounded-sm outline-offset-4 focus-visible:outline-2">
        <table className="w-full border-collapse text-left text-sm leading-relaxed sm:text-base">
          <tbody>{nodesToJSX({ nodes: node.children })}</tbody>
        </table>
      </div>
    ),
    tablerow: ({ node, nodesToJSX }) => <tr className="border-b border-border">{nodesToJSX({ nodes: node.children })}</tr>,
    tablecell: ({ node, nodesToJSX }) => {
      const span = { colSpan: node.colSpan && node.colSpan > 1 ? node.colSpan : undefined, rowSpan: node.rowSpan && node.rowSpan > 1 ? node.rowSpan : undefined };
      // Lexical header states: 1 = header row (labels a column), 2 = header column (labels a row), 3 = both.
      return node.headerState > 0
        ? <th {...span} scope={node.headerState === 2 ? "row" : "col"} className="py-3 pr-6 align-top text-sm font-medium text-muted-foreground">{nodesToJSX({ nodes: node.children })}</th>
        : <td {...span} className="py-3 pr-6 align-top">{nodesToJSX({ nodes: node.children })}</td>;
    },
  });
  return (
    <LongFormProse>
      <RichText data={data} converters={converters} disableContainer />
    </LongFormProse>
  );
}
