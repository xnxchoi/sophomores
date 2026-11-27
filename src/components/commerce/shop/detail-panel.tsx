"use client";

import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { RichText } from "@payloadcms/richtext-lexical/react";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { ArrowUpRightIcon, CaretDownIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { addGuestCartLine, listGuestCart, removeGuestCartLine, subscribeGuestCart } from "@/lib/commerce/browser-cart";
import type { CommerceEditionOffer } from "@/lib/commerce/editions";
import { editionRefundTerms } from "@/lib/commerce/refund-policy";
import { cn } from "@/lib/utils";
import { RefundTerms } from "../refund-terms";
import type { ProductPageContent } from "../product-page/_shared/content";
import { physicalDetails, type EditionProduct } from "../product-page/product-page";
import { DetailGallery } from "./detail-gallery";
import { useCartFly } from "./cart-fly";
import { useShopViewer, verifyShopViewer } from "./use-shop-viewer";
import { Button } from "@/components/core/Button";

/**
 * One book's details inside stripe.press's scene: their detail panel content (`ie`, 06w:6066-6943; notes
 * .tmp/stripe-notes/slice-G-detail-layout.md), in its order and measures, on our content fields.
 * - The 40 % column: rule, [ label ], title, + byline +, rule, [ Description ], the buy frame (formats table, 24 px
 *   gap), rule, [ About … ], bio and its links. The whole top block is at least a screen tall.
 * - Then praise and the colophon band. From 900 px they run the full width of the window under the book (their
 *   DetailFullBleed); below 900 px they stay in the column, colophon first, praise to three quotes, and the colophon
 *   lists fold behind a [ Details ] toggle.
 * The full-bleed bands and the screen-tall top block apply inside the scene's detail slots only (in-[[data-detail-panel-
 * index]]), so the same panel sits plainly in the fallback list.
 * Ours, where theirs has no counterpart: the refund rule beside the add row (owner, 25 Nov), and our bracket labels' words. Labels are sans, not their mono (owner, 21 Nov: mono only where named); colours
 * are the site's (colour hold), with their proportions: rules at 45 %, muted text at 78 %. Detail mode plays no item
 * stagger in theirs (`noScrollFade`), so none here; the panel's slide is the stack's.
 */
export function DetailPanel({ product, offer, content }: { product: EditionProduct; offer: CommerceEditionOffer; content: ProductPageContent }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  const locale = useLocale();
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
  const colophon = [
    { label: t("details"), items: physicalDetails(content, locale, t) },
    { label: t("typefaces"), items: content.typefaces.map((face) => face.foundry ? face.name + ", " + face.foundry : face.name) },
    { label: t("materials"), items: content.materials.map(({ item }) => item) },
    { label: t("techniques"), items: content.techniques.map(({ item }) => item) }
  ].filter((section) => section.items.length > 0);
  const gallery = content.gallery.map(({ image, caption }) => ({ url: image.url, alt: caption ?? image.alt ?? "" }));
  const hasProduction = colophon.length > 0 || gallery.length > 0;
  const about = content.about && (content.about.body || content.about.links.length > 0) ? content.about : null;

  return <>
    <div className="in-[[data-detail-panel-index]]:min-h-[100vh]">
      <Rule />
      <Label>{content.kicker ?? t("book")}</Label>
      <h2 className="mt-2.5 mb-2 pl-3.5 font-display text-[length:calc(40px+16*(100vw-375px)/1353)] leading-[1.1] font-normal tracking-[-0.03em] text-balance [overflow-wrap:anywhere]">{product.title}</h2>
      {content.byline
        ? <p className="mb-[60px] pl-3.5 text-[21px] leading-[1.3] font-light tracking-[-0.02em] italic">+ {content.byline} +</p>
        : <div aria-hidden="true" className="mb-[60px]" />}
      <Rule />
      <Label>{t("description")}</Label>
      <BodyText>{content.longDescription ? <Prose data={content.longDescription} /> : <p className="whitespace-pre-line">{product.description}</p>}</BodyText>

      {/* Their AddToCartFrame: the formats table, then the pill row (none of ours yet; its 40 px stays). */}
      <section aria-label={t("formats")} className="flex flex-col gap-6">
        <div className="mt-[18px] border-y border-dotted border-foreground/45">
          <AddRow productID={product.productID} title={product.title} price={money.format(offer.priceKRW)} />
          {content.formats.map((format) => <PriceRow key={format.label} label={format.label} value={format.note ?? ""} url={format.url ?? undefined} />)}
        </div>
        <div className="pl-3.5 text-[13px] leading-5 text-foreground/78 text-pretty">
          {/* The refund rule beside the buy row, before any Pay (owner, 25 Nov; Review-B r2). */}
          <RefundTerms terms={editionRefundTerms(offer.editionEntitlements)} />
          <p className="mt-1">{offer.editionEntitlements.membershipSignet ? t("includesBundle") : t("includesBookOnly")}
            {offer.maximumQuantity === 1 && <> {t("onePerAccount")}.</>}</p>
        </div>
        <div aria-hidden="true" className="mb-10" />
      </section>

      {about && <>
        <Rule className="mt-6" />
        <Label>{about.heading ?? t("aboutTheAuthor")}</Label>
        {about.body && <BodyText><Prose data={about.body} /></BodyText>}
        {about.links.length > 0 && <div className="mt-[18px] border-y border-dotted border-foreground/45">
          {about.links.map((link) => <PriceRow key={link.url} label={link.label} url={link.url} value="" />)}
        </div>}
      </>}
    </div>

    {/* Below 900 px the colophon band comes before praise (theirs places it by a matchMedia; here by order). */}
    <div className="flex flex-col">
      {content.praise.length > 0 && <section aria-label={t("praise")} className="relative pt-40 pb-40 max-[900px]:pt-0 max-[900px]:pb-[60px] min-[900px]:in-[[data-detail-panel-index]]:ml-[calc(-60vw-24px)] min-[900px]:in-[[data-detail-panel-index]]:w-screen min-[900px]:in-[[data-detail-panel-index]]:px-4">
        <div data-book-exit-anchor aria-hidden="true" />
        <Rule className="mt-[124px] mb-1.5 max-[900px]:mt-[46px]" />
        <Label>{t("praise")}</Label>
        <ul className="min-[900px]:columns-2 min-[900px]:gap-x-10">
          {content.praise.map((entry) => <li key={entry.name + entry.quote.slice(0, 24)} className="break-inside-avoid max-[900px]:nth-[n+4]:hidden">
            <figure>
              <p aria-hidden="true" className="-mb-5 pt-[30px] font-display text-[80px] leading-[0.9] max-[900px]:pt-9">“</p>
              <figcaption className="mt-[17px] mb-[18px] text-[13px] tracking-[0.04em] uppercase underline underline-offset-2">
                {entry.url ? <a href={entry.url} target="_blank" rel="noreferrer" className="text-inherit outline-offset-2 focus-visible:outline-2 focus-visible:outline-current">{entry.name}</a> : entry.name}
              </figcaption>
              <blockquote className="mb-[21px] pr-5 text-lg leading-[1.45] font-light">{entry.quote}</blockquote>
              {entry.role && <p className="mb-9 text-[13px] tracking-[0.03em] uppercase opacity-60">{entry.role}</p>}
              <DashedRule className="mt-2" />
            </figure>
          </li>)}
        </ul>
      </section>}

      {hasProduction && <Production colophon={colophon} gallery={gallery} anchor={content.praise.length === 0} labels={{ colophon: t("colophon"), expand: t("expand"), collapse: t("collapse") }} />}
    </div>
  </>;
}

/** Their production band: rule, [ Colophon ] and the colophon lists on the left, the gallery on the right with its thumbs. */
function Production({ colophon, gallery, anchor, labels }: { colophon: { label: string; items: string[] }[]; gallery: { url: string; alt: string }[];
  anchor: boolean; labels: { colophon: string; expand: string; collapse: string } }) {
  const [collapsed, setCollapsed] = useState(true), [index, setIndex] = useState(0);
  const step = (direction: 1 | -1) => setIndex((current) => Math.max(0, Math.min(gallery.length - 1, current + direction)));
  return <section aria-label={labels.colophon} className={cn("relative pt-[60px] pb-[120px] max-[900px]:-order-1 min-[900px]:in-[[data-detail-panel-index]]:ml-[calc(-60vw-24px)] min-[900px]:in-[[data-detail-panel-index]]:w-screen min-[900px]:in-[[data-detail-panel-index]]:px-4",
    collapsed ? "max-[900px]:pb-[19px]" : "max-[900px]:pb-[30px]")}>
    {anchor && <div data-book-exit-anchor aria-hidden="true" />}
    <div className="grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] min-[900px]:grid-rows-[auto_1fr_auto] min-[900px]:gap-x-16">
      <div className="max-[900px]:order-1 min-[900px]:col-span-full min-[900px]:row-start-1"><Rule /></div>
      <div className="flex min-w-0 flex-col max-[900px]:contents min-[900px]:col-start-1 min-[900px]:row-start-2 min-[900px]:justify-between">
        <div className="max-[900px]:order-2 max-[900px]:mb-[34px]"><Label>{labels.colophon}</Label></div>
        {colophon.length > 0 && <div data-collapsed={collapsed || undefined}
          className="group/colophon grid grid-cols-[minmax(0,1fr)_max-content] gap-y-[30px] max-[900px]:order-5 max-[900px]:grid-cols-1 max-[900px]:data-collapsed:[&>*+*]:hidden">
          {colophon.map((section, at) => <div key={section.label}
            className="relative col-span-full grid grid-cols-subgrid items-start gap-x-6 pt-1.5 max-[900px]:grid-cols-1 max-[900px]:gap-y-1.5">
            <DashedRule className="absolute inset-x-0 top-0" />
            {at === 0
              ? <>
                  <span className="max-[900px]:hidden"><Label>{section.label}</Label></span>
                  <Button variant="bare" type="button" aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)}
                    className="group/focus hidden w-full items-center pb-1.5 text-left text-[11px] leading-[1.5] uppercase max-[900px]:flex pointer-coarse:min-h-11">
                    <FocusShape className="flex w-full items-center justify-between">
                      [ {section.label} ]
                      <span className="inline-flex items-center gap-1">{collapsed ? labels.expand : labels.collapse}
                        <CaretDownIcon aria-hidden="true" className={cn("size-2.5 transition-transform duration-250 ease-[ease]", !collapsed && "rotate-180")} /></span>
                    </FocusShape>
                  </Button>
                </>
              : <Label>{section.label}</Label>}
            <ul className={cn("pl-3.5 text-base leading-[1.65]", at === 0 && "max-[900px]:group-data-collapsed/colophon:hidden")}>
              {section.items.map((item) => <li key={item}>– {item}</li>)}
            </ul>
          </div>)}
        </div>}
      </div>
      {gallery.length > 0 && <>
        <div className="ml-auto w-full min-w-0 pb-1.5 max-[900px]:order-3 min-[900px]:col-start-2 min-[900px]:row-start-2">
          <DetailGallery images={gallery} index={index} onStep={step} />
        </div>
        <div className="ml-auto w-full min-w-0 max-[900px]:order-4 max-[900px]:mb-6 min-[900px]:col-start-2 min-[900px]:row-start-3">
          <div className="flex w-full flex-wrap gap-1.5">
            {gallery.map((image, at) => <Button variant="bare" key={image.url} type="button" data-active={at === index || undefined} onClick={() => setIndex(at)}
              className="flex min-w-0 shrink-0 grow-0 basis-[calc(20%-4.8px)] flex-col items-start gap-0.5 text-left opacity-55 transition-opacity duration-200 ease-[ease] hover:opacity-100 focus-visible:opacity-100 data-active:opacity-100 outline-offset-2 focus-visible:outline-2 focus-visible:outline-current">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" loading="lazy" className="block aspect-[1075/1433] h-auto w-full rounded-[4px] bg-foreground/10 object-cover" />
              <span className="text-[11px] leading-[1.5] tabular-nums">{String(at + 1).padStart(2, "0")}</span>
            </Button>)}
          </div>
        </div>
      </>}
    </div>
  </section>;
}

/** Their DetailRule: 1 px at 45 % of the text colour, 4 px above and 6 px below. */
function Rule({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("mt-1 mb-1.5 h-px bg-foreground/45", className)} />;
}

/** Their dashed rule: 1 px, 2 px dashes, 2 px gaps, at the rule colour. */
function DashedRule({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("h-px bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--color-foreground)_45%,transparent)_0_2px,transparent_2px_4px)]", className)} />;
}

/** Their DetailLabel, "[ Description ]": 11 px/150 % uppercase (sans here), 6 px under. */
function Label({ children }: { children: ReactNode }) {
  return <p className="pb-1.5 text-[11px] leading-[1.5] uppercase">[ {children} ]</p>;
}

/** Their DetailDescription / DetailBioText: 16 px/150 %, each paragraph's first line indented 1.5em, 14 px in. */
function BodyText({ children }: { children: ReactNode }) {
  return <div className="my-3.5 pl-3.5 text-base leading-[1.5] text-pretty [overflow-wrap:anywhere] [&_p]:indent-[1.5em] [&_p+p]:mt-3.5">{children}</div>;
}

function Prose({ data }: { data: SerializedEditorState }) {
  return <div className="[&_a]:underline [&_a]:underline-offset-2"><RichText data={data} disableContainer /></div>;
}

/** Their PriceRow: at least 41 px, dotted rule between rows, label left and value right (15 px/140 %, 16 px in), tinted on hover. */
/**
 * Their add-to-cart row (06w9 hZ): a press adds the book and the row stays, now saying it's in the cart, with the round
 * × of their cart lines to take it out. One per account, so no quantity. Through Auth's browser cart (its exports only);
 * a member's cart takes it at sign-in. In the preview it works while the sale isn't open (owner, 27 Nov: "pretend that
 * the non-live parts are live").
 * Scoped to the shop's viewer (Review-B HOLD on 0336e57b, Auth-editions' boundary): while it is unknown the row shows no
 * selection and changes nothing; each add or remove first re-verifies the same viewer, passes that member to Auth's
 * helpers, and is awaited. The book flies and the row turns only on a confirmed add for the viewer still looking; a
 * refusal says so in place, without the fly. One action at a time.
 */
function AddRow({ productID, title, price }: { productID: string; title: string; price: string }) {
  const t = useTranslations("Customer.components_commerce_book_offer");
  const cart = useTranslations("Customer.components_commerce_cart");
  const viewer = useShopViewer();
  const known = viewer !== undefined;
  const inCart = useSyncExternalStore(subscribeGuestCart,
    () => known && listGuestCart(undefined, viewer ?? undefined).some((line) => line.productID === productID), () => false);
  const fly = useCartFly();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<{ viewer: string | null; kind: "add" | "remove" } | null>(null);
  // A failure is shown only to the viewer it happened to.
  const failure = failed && failed.viewer === viewer ? failed.kind : null;

  async function change(kind: "add" | "remove") {
    if (pending || !known) return;
    const before = viewer;
    setPending(true);
    setFailed(null);
    try {
      const check = await verifyShopViewer();
      if (!check || check.viewer !== before) return;
      const memberID = check.viewer ?? undefined;
      // Checked inside the cart's lock too: an action queued there for a viewer who has since left writes nothing.
      const ok = kind === "add"
        ? await addGuestCartLine(productID, undefined, { memberID, stillCurrent: check.isCurrent })
        : await removeGuestCartLine(productID, undefined, memberID, { stillCurrent: check.isCurrent });
      // Any recheck since (a switch, or even the same member again): nothing is flown or reported for it.
      if (!check.isCurrent()) return;
      if (!ok) { setFailed({ viewer: check.viewer, kind }); return; }
      if (kind === "add") fly?.(productID);
    } finally { setPending(false); }
  }

  const note = failure && <p role="status" className="px-4 pb-2 text-[12px] leading-[1.5] text-muted-foreground">
    {failure === "add" ? cart("writeRejected") : cart("removeFailed")}</p>;
  if (inCart) return <div>
    <div className="flex min-h-[41px] items-center justify-between border-t border-dotted border-foreground/45 text-[15px] leading-[1.4] first:border-t-0 pointer-coarse:min-h-11">
      <span className="min-w-0 px-4">{t("inCart")}</span>
      <span className="flex shrink-0 items-center gap-3 px-4 tabular-nums">{price}
        <Button variant="bare" type="button" aria-label={t("removeFromCart", { title })} disabled={pending} onClick={() => void change("remove")}
          className="group/focus -m-3 inline-flex size-11 items-center justify-center disabled:opacity-40">
          <FocusShape className="flex size-5 items-center justify-center rounded-full border-[0.8px] border-current pb-0.5 text-[19.5px] leading-none opacity-75 transition-opacity duration-200 group-hover/focus:opacity-100">×</FocusShape>
        </Button></span>
    </div>
    {note}
  </div>;
  return <div>
    <Button variant="bare" type="button" disabled={pending || !known} onClick={() => void change("add")}
      className="group/focus flex min-h-[41px] w-full items-center border-t border-dotted border-foreground/45 text-left text-[15px] leading-[1.4] transition-colors duration-200 ease-[ease] first:border-t-0 hover:bg-foreground/8 disabled:opacity-60 pointer-coarse:min-h-11">
      <FocusShape className="flex w-full items-center justify-between"><span className="min-w-0 px-4">{t("addToCart")}</span><span className="shrink-0 px-4 tabular-nums">{price}</span></FocusShape>
    </Button>
    {note}
  </div>;
}

function PriceRow({ label, value, url, disabled }: { label: string; value: string; url?: string; disabled?: boolean }) {
  const body = <>
    <span className="min-w-0 px-4 [overflow-wrap:anywhere]">{label}</span>
    <span className="flex min-w-[3.2em] shrink-0 items-center justify-end gap-2 px-4 text-right tabular-nums">{value}{url && <ArrowUpRightIcon aria-hidden="true" className="size-[9px]" />}</span>
  </>;
  return url
    ? <a href={url} target="_blank" rel="noreferrer"
        className="flex min-h-[41px] items-center justify-between border-t border-dotted border-foreground/45 text-[15px] leading-[1.4] transition-colors duration-200 ease-[ease] first:border-t-0 hover:bg-foreground/8 pointer-coarse:min-h-11 group/focus"><FocusShape className="flex w-full items-center justify-between">{body}</FocusShape></a>
    : <div aria-disabled={disabled || undefined}
        className={cn("flex min-h-[41px] items-center justify-between border-t border-dotted border-foreground/45 text-[15px] leading-[1.4] first:border-t-0 pointer-coarse:min-h-11", disabled && "opacity-60")}>{body}</div>;
}
