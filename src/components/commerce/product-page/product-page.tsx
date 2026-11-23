import { RichText } from "@payloadcms/richtext-lexical/react";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { ArrowLeftIcon, ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { CommerceEditionCatalogue, CommerceEditionOffer } from "@/lib/commerce/editions";
import { Link } from "@/components/core/Link/Link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { cn } from "@/lib/utils";
import { PurchaseNotOpen } from "../book-offer";
import { BookStage } from "../book3d/book-stage";
import type { BookTextures } from "../book3d/book";
import { FormatRow } from "./format-row";
import type { ProductMedia, ProductPageContent } from "./_shared/content";

type EditionProduct = Extract<CommerceEditionCatalogue, { status: "displayable" }>["product"];
type Translate = ReturnType<typeof useTranslations<"Customer.components_commerce_book_offer">>;
export type ShelfEntry = { productID: string; title: string; current: boolean };

/**
 * One product's page, ported section by section from stripe.press's (map 23 Nov; owner: "As stripe.press does!"):
 * - left 61%, pinned under the header: the shelf strip of titles, then the stage (the product's art, full bleed, with the
 *   3D book on it; with no art, the book stands on the page, unboxed);
 * - right 39%, scrolling: label, title, byline, description, the ruled format rows, about;
 * - then full-width sections that scroll over the pinned stage: praise in two columns, and the details table beside the
 *   gallery strip.
 * Content comes from the product's `page` fields (ProductPageContent); a section without content isn't drawn.
 * On a phone the strip and art sit at the top, pinned, and everything else scrolls up over them.
 */
export function ProductPage({ product, offer, content, shelf }: { product: EditionProduct; offer: CommerceEditionOffer; content: ProductPageContent; shelf: readonly ShelfEntry[] }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  const locale = useLocale();
  const art = content.stageArt ?? firstImage(product);
  const details = physicalDetails(content, locale, t);
  const hasTable = details.length > 0 || content.typefaces.length > 0 || content.materials.length > 0 || content.techniques.length > 0;
  const hasFullWidth = content.praise.length > 0 || hasTable || content.gallery.length > 0;
  return <PageInset as="main" className="pt-[4.5rem] pb-24 text-foreground lg:grid lg:grid-cols-[minmax(0,1.58fr)_minmax(0,1fr)] lg:items-start lg:gap-x-10">
    <div className="sticky top-[4.5rem] z-0 flex min-w-0 flex-col max-lg:has-[[data-open=true]]:z-50 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:h-[calc(100svh-5.5rem)]">
      <ShelfStrip shelf={shelf} label={t("shelf")} />
      <BookStage id={product.productID} textures={bookTextures(content)} pageTextures={pageTextures(content)}
        className="relative aspect-[4/5] w-full sm:aspect-[5/4] lg:aspect-auto lg:min-h-0 lg:flex-1">
        <StageArt art={art} />
      </BookStage>
    </div>

    <div className="relative z-1 min-w-0 bg-background pt-6 lg:col-start-2 lg:row-start-1 lg:min-h-[calc(100svh-5.5rem)] lg:bg-transparent lg:pt-0">
      <div className="flex h-14 items-center">
        <Link href="/shop" className="group/focus inline-flex min-h-11 items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
          <FocusShape className="inline-flex items-center gap-[inherit]"><ArrowLeftIcon aria-hidden="true" className="size-3.5" />{t("allProducts")}</FocusShape>
        </Link>
      </div>
      <header className="border-t border-foreground pt-3">
        <Label>{content.kicker ?? t("book")}</Label>
        <h1 className="mt-4 font-display text-[2.5rem] font-normal leading-[1.06] tracking-[-0.02em] text-balance [overflow-wrap:anywhere]">{product.title}</h1>
        {content.byline && <p className="mt-2 font-display text-lg italic text-muted-foreground">{t("byline", { name: content.byline })}</p>}
      </header>

      <ColumnSection label={t("description")}>
        {content.longDescription
          ? <Prose data={content.longDescription} />
          : <p className="whitespace-pre-line text-[15px] leading-[1.5] text-pretty [overflow-wrap:anywhere]">{product.description}</p>}
      </ColumnSection>

      <section aria-label={t("formats")} className="mt-10">
        <PurchaseNotOpen priceKRW={offer.priceKRW} />
        {content.formats.length > 0 && <ul>
          {content.formats.map((format) => <FormatRow key={format.label} {...format} />)}
        </ul>}
        <p className="mt-3 text-xs leading-5 text-muted-foreground text-pretty">
          {offer.editionEntitlements.membershipSignet ? t("includesBundle") : t("includesBookOnly")}
          {offer.maximumQuantity === 1 && <> {t("onePerAccount")}.</>}
        </p>
      </section>

      {content.about && (content.about.body || content.about.links.length > 0) && <ColumnSection label={content.about.heading ?? t("aboutTheAuthor")}>
        {content.about.body && <Prose data={content.about.body} />}
        {content.about.links.length > 0 && <ul className="mt-5 border-t border-dotted border-foreground/40">
          {content.about.links.map((link) => <li key={link.url} className="border-b border-dotted border-foreground/40">
            <a href={link.url} target="_blank" rel="noreferrer" className="group/focus flex min-h-10 items-center justify-between gap-4 text-[13px] transition-colors hover:text-muted-foreground pointer-coarse:min-h-11">
              <FocusShape className="flex min-w-0 flex-1 items-center justify-between gap-[inherit]">{link.label}<ArrowUpRightIcon aria-hidden="true" className="size-3.5 text-muted-foreground" /></FocusShape>
            </a>
          </li>)}
        </ul>}
      </ColumnSection>}
    </div>

    {hasFullWidth && <div data-covers-stage className="relative z-1 bg-background pt-10 lg:col-span-full lg:row-start-2 lg:pt-1">
      {content.praise.length > 0 && <section aria-label={t("praise")} className="border-t border-foreground pt-3">
        <Label>{t("praise")}</Label>
        <ul className="mt-3 grid gap-x-10 md:grid-cols-2">
          {/* One block per quote: the mark opens the quote, the name and role follow it (coordinator on r3: no dead space). */}
          {content.praise.map((entry) => <li key={entry.name + entry.quote.slice(0, 24)} className="border-b border-dotted border-foreground/40 py-5">
            <figure>
              <blockquote className="max-w-[38rem] text-[15px] leading-[1.5] text-pretty">
                <span aria-hidden="true" className="mr-1 font-display text-[1.75em] leading-[0] text-muted-foreground">“</span>{entry.quote}
              </blockquote>
              <figcaption className="mt-2 flex flex-wrap gap-x-2 text-[11px] uppercase tracking-[0.06em]">
                {entry.url ? <a href={entry.url} target="_blank" rel="noreferrer" className="rounded-xs underline decoration-current/40 underline-offset-4 outline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-current">{entry.name}</a> : <span>{entry.name}</span>}
                {entry.role && <span className="text-muted-foreground">{entry.role}</span>}
              </figcaption>
            </figure>
          </li>)}
        </ul>
      </section>}

      {(hasTable || content.gallery.length > 0) && <section aria-label={t("details")}
        className={cn("grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1.58fr)_minmax(0,1fr)]", content.praise.length > 0 && "mt-12 lg:mt-20")}>
        {hasTable && <dl className="min-w-0 border-t border-foreground">
          <DetailRow label={t("details")} items={details} />
          <DetailRow label={t("typefaces")} items={content.typefaces.map((face) => face.foundry ? face.name + ", " + face.foundry : face.name)} />
          <DetailRow label={t("materials")} items={content.materials.map(({ item }) => item)} />
          <DetailRow label={t("techniques")} items={content.techniques.map(({ item }) => item)} />
        </dl>}
        {content.gallery.length > 0 && <div className="min-w-0 border-t border-foreground pt-4">
          <Label>{t("gallery")}</Label>
          <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {content.gallery.map(({ image, caption }) => <li key={image.url}>
              <a href={image.url} target="_blank" rel="noreferrer" className="block aspect-[3/4] overflow-hidden rounded-sm bg-muted outline-offset-2 focus-visible:outline-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={caption ?? image.alt ?? ""} loading="lazy" className="size-full object-cover outline outline-1 -outline-offset-1 outline-black/10 transition-opacity hover:opacity-85 dark:outline-white/10" />
              </a>
            </li>)}
          </ul>
        </div>}
      </section>}
    </div>}
  </PageInset>;
}

/** stripe.press's title ribbon: every edition's title across the top of the stage, this one full strength. */
function ShelfStrip({ shelf, label }: { shelf: readonly ShelfEntry[]; label: string }) {
  if (shelf.length < 2) return <div aria-hidden="true" className="hidden h-14 shrink-0 lg:block" />;
  return <nav aria-label={label} className="flex h-14 shrink-0 items-center overflow-x-auto [scrollbar-width:none]">
    <ul className="flex items-baseline gap-x-8 whitespace-nowrap">
      {shelf.map((entry) => <li key={entry.productID}>
        {entry.current
          ? <span aria-current="page" className="font-display text-[2rem] leading-none tracking-[-0.02em] lg:text-[2.5rem]">{entry.title}</span>
          : <Link href={"/shop/products/" + encodeURIComponent(entry.productID)}
              className="font-display text-[2rem] leading-none tracking-[-0.02em] text-foreground/25 outline-offset-4 transition-colors duration-200 hover:text-foreground/60 focus-visible:outline-2 lg:text-[2.5rem]">{entry.title}</Link>}
      </li>)}
    </ul>
  </nav>;
}

/**
 * The stage's ground: the product's own art, full bleed and not draggable. With none, nothing: the book stands on the
 * page itself, not in a box (owner, 24 Nov: "the 3D book is NOT inside a boxed container").
 */
function StageArt({ art }: { art: ProductMedia | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (art) return <img src={art.url} alt={art.alt ?? ""} loading="eager" draggable={false} className="absolute inset-0 size-full object-cover" />;
  return null;
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-[11px] uppercase leading-4 tracking-[0.06em] text-muted-foreground">{children}</p>;
}

function ColumnSection({ label, children }: { label: string; children: ReactNode }) {
  return <section className="mt-10 border-t border-foreground/20 pt-3">
    <Label>{label}</Label>
    <div className="mt-4">{children}</div>
  </section>;
}

/** Rich text from Payload (paragraphs, italics, links), set like the column's body. */
function Prose({ data }: { data: SerializedEditorState }) {
  return <div className="text-[15px] leading-[1.5] text-pretty [overflow-wrap:anywhere] [&_a]:rounded-xs [&_a]:underline [&_a]:underline-offset-4 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-current [&_p+p]:mt-4">
    <RichText data={data} disableContainer />
  </div>;
}

function DetailRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-x-6 border-b border-foreground/20 py-4">
    <dt className="text-[11px] uppercase leading-5 tracking-[0.06em] text-muted-foreground">{label}</dt>
    <dd><ul className="text-[13px] leading-5">{items.map((item) => <li key={item}>– {item}</li>)}</ul></dd>
  </div>;
}

function physicalDetails(content: ProductPageContent, locale: string, t: Translate) {
  const d = content.details; if (!d) return [];
  const n = (value: number, digits = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
  return [
    d.trimWidthMM && d.trimHeightMM ? t("trimValue", { width: n(d.trimWidthMM, 1), height: n(d.trimHeightMM, 1) }) : null,
    d.spineMM ? t("spineValue", { value: n(d.spineMM, 1) }) : null,
    d.weightG ? t("weightValue", { value: n(d.weightG) }) : null,
    d.pages ? t("pagesValue", { value: n(d.pages) }) : null,
    d.words ? t("wordsValue", { value: n(d.words) }) : null
  ].filter((item): item is string => item !== null);
}

function firstImage(product: EditionProduct): ProductMedia | null {
  for (const { image } of product.images) if (typeof image === "object" && image?.url) return { url: image.url, alt: image.alt ?? null };
  return null;
}

/** The product's own book textures, slot by slot; BookStage fills the empty slots with the TEMPORARY Stripe Press ones. */
function bookTextures(content: ProductPageContent): BookTextures {
  const book = content.book;
  return {
    coverDiffuse: book?.coverDiffuse?.url, coverBumpBase: book?.coverBumpBase?.url, coverBumpCustom: book?.coverBumpCustom?.url,
    coverFoil: book?.coverFoil?.url, coverGloss: book?.coverGloss?.url, coverGlitter: book?.coverGlitter?.url
  };
}

function pageTextures(content: ProductPageContent): string[] {
  // Only a complete run of pages from the first leaf: the leaves take images in reading order.
  const urls: string[] = [];
  for (const page of content.book?.pages ?? []) { if (!page.front?.url || !page.back?.url) break; urls.push(page.front.url, page.back.url); }
  return urls;
}
