import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { z } from "zod";

/**
 * The product page's content fields (spec: .tmp/packets-20261121/product-content-fields-spec-20261123.md; owner approved
 * "1. yes"). Auth adds them Payload-natively as the products' `page` group; until then a product simply has none, and
 * every section hides. Read defensively: a malformed field drops out on its own instead of failing the page.
 *
 * A pure module here (not .tsx): the route's server reader and the section components both use it, and it renders nothing.
 */
const media = z.object({ url: z.string().min(1), alt: z.string().nullish(), width: z.number().nullish(), height: z.number().nullish() });
const httpsURL = z.string().url().refine((value) => value.startsWith("https://"));
const richText = z.custom<SerializedEditorState>((value) => typeof value === "object" && value !== null && "root" in value);
const optional = <T extends z.ZodType>(schema: T) => schema.nullish().catch(null);
const list = <T extends z.ZodType>(schema: T, max: number) =>
  z.array(z.unknown()).catch([]).transform((items) => items.flatMap((item) => { const parsed = schema.safeParse(item); return parsed.success ? [parsed.data as z.infer<T>] : []; }).slice(0, max));

const contentSchema = z.object({
  shelfTitle: optional(z.string().max(60)),
  shelfOrder: optional(z.number().int()),
  kicker: optional(z.string().max(40)),
  byline: optional(z.string().max(120)),
  stageArt: optional(media),
  longDescription: optional(richText),
  about: optional(z.object({
    heading: optional(z.string().max(40)),
    body: optional(richText),
    links: list(z.object({ label: z.string().min(1), url: httpsURL }), 6)
  })),
  formats: list(z.object({ label: z.string().min(1), url: optional(httpsURL), note: optional(z.string()), effect: optional(z.enum(["none", "hologram", "radio"])) }), 4),
  praise: list(z.object({ quote: z.string().min(1).max(600), name: z.string().min(1), role: optional(z.string()), url: optional(httpsURL) }), 8),
  details: optional(z.object({
    trimWidthMM: optional(z.number().positive()), trimHeightMM: optional(z.number().positive()), spineMM: optional(z.number().positive()),
    weightG: optional(z.number().int().positive()), pages: optional(z.number().int().positive()), words: optional(z.number().int().positive())
  })),
  typefaces: list(z.object({ name: z.string().min(1), foundry: optional(z.string()) }), 12),
  materials: list(z.object({ item: z.string().min(1) }), 16),
  techniques: list(z.object({ item: z.string().min(1) }), 16),
  gallery: list(z.object({ image: media, caption: optional(z.string()) }), 12),
  book: optional(z.object({
    coverDiffuse: optional(media), coverBumpBase: optional(media), coverBumpCustom: optional(media),
    coverFoil: optional(media), coverGloss: optional(media), coverGlitter: optional(media),
    pages: list(z.object({ front: optional(media), back: optional(media) }), 24)
  }))
});

export type ProductPageContent = z.infer<typeof contentSchema>;
export type ProductMedia = z.infer<typeof media>;

/** The `page` group of a product document (depth 1, so uploads are objects), or an empty content set. */
export function readProductPageContent(document: unknown): ProductPageContent {
  const page = typeof document === "object" && document !== null && "page" in document ? (document as { page: unknown }).page : undefined;
  const parsed = contentSchema.safeParse(page ?? {});
  return parsed.success ? parsed.data : contentSchema.parse({});
}
