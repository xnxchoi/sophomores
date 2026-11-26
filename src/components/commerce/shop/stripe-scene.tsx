"use client";

import { useEffect, useRef, useState } from "react";

/**
 * stripe.press's book scene, copied verbatim (owner, 25 Nov: "only copy over the 3D parts verbatim … Dont build webgl
 * stuff from ground up"). Their shipped chunks live in public/vendor/stripe-press with nine recorded changes
 * (scripts/stripe-press-vendor/VENDOR-CHANGES.md) and run in their own Turbopack runtime and React copy, beside the
 * site's. `useStripeScene` loads them once with our catalogue and hands the page (shop-home.tsx, ours) what their home
 * page itself uses: BookStack to render, the live-ref hub (module 50016), the scroll helpers (73900), the catalogue
 * helpers (67168), the gesture router (11743) and the spine-row seat helpers (2449).
 */
const BASE = "/vendor/stripe-press/", DIR = BASE + "static/immutable/chunks/", RUNTIME = "turbopack-2_04ewhudzrza.js";
const CHUNKS = ["04ud9hjinltfg.js", "0o8wbxikbqj64.js", "02r0qv9ged3vb.js", "14l5yxhvu5ecr.js", "0_xwvg_h93t1m.js", "0al_0m9d4_k3k.js",
  "1hkd3mo7rce98.js", "18l0ksfy0ov6e.js", "12s2cqzsl56ip.js", "3aodgiaju4hkl.js", "29c537hi0sbmc.js", "0bl3vphd9w8zl.js", "3fe65qr7ey8j5.js",
  "248-_vgnwste3.js", "0zqma92wkm7ei.js", "1imu45qukg0dp.js", "0is2w5i_ynjyj.js", "06y4cpdp__u2p.js", "1gsquroxu5z89.js", "0-gkbk5su9wr9.js"];
const TEX = "/assets/three/book/";

type Props = Record<string, unknown>;
type Ref<T> = { current: T };
/** Their live-ref hub (module 50016): the refs and spine-row handlers their home page writes and calls. */
export type SceneHub = Record<string, Ref<unknown>> & {
  spineViewProgressFor: (progress: number) => number;
  stepSpineSelection: (step: number, count: number, options?: { repeat?: boolean }) => void;
  beginSpineDrag: unknown; moveSpineDrag: unknown; endSpineDrag: unknown;
  spineRowLiftForTopPx: (topPx: number) => number; hintSpineRow: () => void;
  /** The spine row's lift for the next section's top (px from the viewport top), and the row's top at a lift. */
  spineRowLiftForWebsitesTop: (topPx: number) => number; spineRowTopPxAtLift: (lift: number) => number;
  SCENE_CARD_BOTTOM_INSET_CSS_PX: number;
  /** The gap their next section keeps under the seated spine row. */
  SPINE_ROW_WEBSITES_GAP_PX: number;
};
/** Their spine-row seat helpers (module 2449): the shelf progress at which the row seats, for a phone (`d`), for a lift
 * fraction of the row's exit travel (`h`), and the seated progress without a lift (`j`). */
export type SceneSeats = { d: (mobile: boolean) => number; h: (liftFraction: number, mobile: boolean) => number; j: (mobile: boolean) => number };
/** Their scroll helpers (module 73900): lvh/width probes, canvas geometry, scrollYToProgress (m), prefix sums (e). */
export type SceneScroll = {
  d: (listener: () => void) => () => void; C: () => number; X: () => number; B: () => number;
  p: (viewportWidth: number) => number; $: (viewportHeight: number, canvasTop: number) => number;
  m: (scrollY: number, extents: number[]) => number; e: (extents: number[]) => number[];
};
/** Their catalogue helpers (module 67168), built from our catalogue (change 7). */
export type SceneCatalogue = {
  t: number; J: number; K: number; a: (segment: number) => number | null; D: (index: number) => number; E: (progress: number) => boolean;
  F: (count: number, canvasHeight: number, lockPx: number[], shelfScreens: number) => number[];
};
/** Their gesture router (module 11743): `e()` installs it, `v(scope, handlers)` registers a scope. */
export type SceneRouter = { e: () => (() => void) | void; v: (scope: string, handlers: Props) => () => void;
  /** The router's surface state (`td`): which scope wins (book-detail while a book is open). */
  _: { current: { bookDetail: boolean; transitioning: boolean } } };
/** Their motion tokens (module 72646): `P` and `i` time the close (the column fades, then the book returns). */
export type SceneMotion = { P: number; i: number };
export type Vendored = { mount: (element: HTMLElement) => { render: (props: Props) => void; unmount: () => void };
  hub: SceneHub; scroll: SceneScroll; catalogue: SceneCatalogue; router: SceneRouter; seats: SceneSeats; motion: SceneMotion };
type Context = { i: (id: number) => unknown };

let loaded: Promise<Vendored> | null = null;

function script(src: string) {
  return new Promise<void>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = src; tag.async = false; tag.onload = () => resolve(); tag.onerror = () => reject(new Error("vendored chunk failed: " + src));
    document.head.appendChild(tag);
  });
}

/** How long their code may take to load and register before the page gives up on the scene and shows its list. */
const READY_MS = 20000;

/** Their runtime, their chunks, then our one module (990001). Our catalogue goes in first: their modules read it once.
 * Fails (and the page shows its plain list) when a chunk doesn't load, our module's imports throw, or nothing is ready
 * within READY_MS (a chunk that loads but never registers). */
function load(books: unknown[], featured: number) {
  loaded ??= Promise.race([(async () => {
    const global = window as unknown as Record<string, unknown>;
    global.SPTURBOPACK_CHUNK_BASE_PATH = BASE;
    global.__SPBOOKS = books; global.__SPFEATURED = featured;
    await script(DIR + RUNTIME);
    await Promise.all(CHUNKS.map((file) => script(DIR + file)));
    return new Promise<Vendored>((resolve, reject) => {
      const queue = global.SPTURBOPACK as { push: (item: unknown) => void };
      const entry = "static/immutable/chunks/sophomores-entry.js";
      queue.push([entry, 990001, (context: Context) => { try {
        const jsx = context.i(91398) as { jsx: (type: unknown, props: Props) => unknown };
        const dom = context.i(57647) as { createRoot: (element: HTMLElement) => { render: (node: unknown) => void; unmount: () => void } };
        const stack = context.i(76489) as { I: unknown };
        resolve({
          mount: (element) => {
            const root = dom.createRoot(element);
            return { render: (props) => root.render(jsx.jsx(stack.I, props)), unmount: () => root.unmount() };
          },
          hub: context.i(50016) as SceneHub, scroll: context.i(73900) as SceneScroll,
          catalogue: context.i(67168) as SceneCatalogue, router: context.i(11743) as SceneRouter, seats: context.i(2449) as SceneSeats,
          motion: context.i(72646) as SceneMotion,
        });
      } catch (error) { reject(error); } }]);
      queue.push([entry, { otherChunks: [], runtimeModuleIds: [990001] }]);
    });
  })(), new Promise<never>((_, reject) => { window.setTimeout(() => reject(new Error("vendored scene not ready in " + READY_MS + " ms")), READY_MS); })]);
  return loaded;
}

export type SceneBook = { id: string; title: string; stageArt: string | null;
  /** The book's page images in reading order (Payload: the product's book pages, front then back of each leaf). */
  pages?: string[];
  /** The edition's page count (Payload: details.pages), for a book whose page images aren't in yet. */
  pageCount?: number };
/** A blank book's length when the edition gives none: about theirs (their open blocks measure ~140 leaves deep). */
const BLANK_PAGES = 288;
/** Pages for their look inside: ours when the product has them, otherwise a blank book of plain paper as long as the
 * edition (their `blank.png` is the endpaper texture, tiled, so blank interior pages need a plain image of their own).
 * The open book's page blocks are as deep as its leaves: 48 blank pages made them a sixth of theirs, too thin to see. */
export function scenePages(pages: string[] | undefined, pageCount?: number) {
  return pages && pages.length >= 2 ? pages : Array.from({ length: pageCount && pageCount >= 2 ? pageCount : BLANK_PAGES }, () => TEX + "shared/page_plain.png");
}

/** One of our products in their built book shape: our placeholder cover and neutral maps (no cover art exists yet). */
function stripeBook({ id, title, stageArt, pages, pageCount }: SceneBook) {
  const blank = TEX + "shared/blank.png", pageImages = scenePages(pages, pageCount);
  return {
    id, title, author: "", type: "book", shaderType: "sophomores", backgroundColor: "#d9d8d4", chordSku: "",
    pageCount: pageImages.length, pageImages, folios: { romanCount: 0, lastFolio: pageImages.length },
    startPage: 1, stackThicknessPct: 0.8, pageColor: "#f3f2ee", images: { background: stageArt ?? blank },
    material: {
      id, title, author: "", slug: id,
      palette: { backgroundColor: "#d9d8d4", color: "#1d1d1b", coverColor: "#e6e5e1", gradientSwatch: TEX + "shared/diffuse_none.png" },
      material: {
        shininess: 8, reflectiveness: 0.2, thickness: 3, diffuseMapCustom: TEX + "cover-placeholder.png", diffuseBaseColor: [0.9, 0.9, 0.88],
        bumpMapBase: TEX + "shared/bump_paper.png", bumpScaleBase: 0.03, bumpMapCustom: TEX + "shared/bump_none.png", bumpScaleCustom: 0,
        foilMap: TEX + "shared/foil_none.png", foilSpecular: 0, foilDetail: 1, foilOpacity: 0, foilOffset: 0, foilSilver: 0,
      },
    },
  };
}

/** Loads their code once with our books (first `featured` of them featured, as their `isFeatured`): `vendored` once
 * ready, `failed` when a chunk did not load (the page then shows its plain list; a reload tries again). */
export function useStripeScene(books: SceneBook[], featured: number) {
  const [vendored, setVendored] = useState<Vendored | null>(null), [failed, setFailed] = useState(false);
  const first = useRef({ books, featured });
  useEffect(() => {
    let live = true;
    load(first.current.books.map(stripeBook), first.current.featured).then((value) => { if (live) setVendored(value); },
      () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);
  return { vendored, failed };
}

/** Their BookStack, rendered into our element: their canvas container is fixed over the window (100vw × 100lvh), and
 * `isolate` on our element keeps their z-indexes (10050–20200) inside this layer, under the site header. */
export function StripeScene({ vendored, props, className }: { vendored: Vendored; props: Props; className?: string }) {
  const host = useRef<HTMLDivElement>(null), scene = useRef<ReturnType<Vendored["mount"]> | null>(null);
  useEffect(() => {
    if (!host.current) return;
    scene.current = vendored.mount(host.current);
    return () => { scene.current?.unmount(); scene.current = null; };
  }, [vendored]);
  useEffect(() => { scene.current?.render(props); }, [props]);
  return <div ref={host} aria-hidden="true" className={className} />;
}

type LockContext = { bookScrollExtentsPx: number[]; canvasHeightPx: number; browseLockScrollPx: number[]; canvasCenterOffset: number };

/**
 * Their `lockedProgressFor` (06w9 `aZ`, with `aX` and `aJ`; 06w9880t9_kp9.js:10338-10406), browse branch, verbatim
 * apart from names: each featured book holds on its card for about `browseLockScrollPx` of scroll, then a raised-cosine
 * catch-up carries progress to the next book's anchor. Shelf and later segments pass through unchanged.
 */
export function lockedProgressFor(progress: number, context: LockContext, catalogue: SceneCatalogue) {
  const anchor = (segment: number, offset: number) => (0 === segment || segment === catalogue.J ? 0 : Math.max(0.01, Math.min(0.99, offset)));
  const creep = (segment: number, extent: number) => {
    const rate = 0.15 / Math.max(1, context.canvasHeightPx), at = anchor(segment, context.canvasCenterOffset);
    return at > 0 ? Math.min(rate, 0.25 / (at * extent)) : rate;
  };
  const segment = Math.floor(Math.max(0, progress)), fraction = progress - segment, book = catalogue.a(segment);
  if (null == book || book >= catalogue.t) return progress;
  const height = Math.max(1, context.canvasHeightPx), extent = Math.max(1, context.bookScrollExtentsPx[segment] ?? height);
  const a = creep(book, extent), l = anchor(book, context.canvasCenterOffset);
  if (fraction <= l) return segment - a * (l - fraction) * extent;
  const nextSegment = segment + 1, next = catalogue.a(nextSegment);
  const nextExtent = Math.max(1, context.bookScrollExtentsPx[nextSegment] ?? height), featuredNext = null != next && next < catalogue.t;
  const h = featuredNext ? creep(next, nextExtent) : 0;
  const target = featuredNext ? nextSegment - h * anchor(next, context.canvasCenterOffset) * nextExtent : nextSegment;
  const m = (1 - l) * extent, g = Math.max(0.001, target - segment);
  let v = (a * m) / g, w = ((featuredNext ? h : 1 / nextExtent) * m) / g;
  if (v + w > 1.6) { const scale = 1.6 / (v + w); v *= scale; w *= scale; }
  const x = context.browseLockScrollPx[book] ?? 150;
  const b = 0.5 * Math.max(0, Math.min(0.95, (Math.min(0.985, Math.max(0.01, Math.min(0.99, context.canvasCenterOffset)) + x / extent) - l) / (1 - l)));
  const y = (2 - v - w) / (1 - b), k = (fraction - l) / (1 - l);
  const S = k <= b ? 0 : (k - b) / 2 - ((1 - b) / (4 * Math.PI)) * Math.sin((2 * Math.PI * (k - b)) / (1 - b));
  return segment + g * (v * k + ((w - v) * k * k) / 2 + y * S);
}
