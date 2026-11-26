"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { useTransitionRouter } from "next-transition-router";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/components/core/Link/Link";
import { PageInset } from "@/components/core/PageInset/PageInset";
import { cn } from "@/lib/utils";
import { NoWebglBookLayer } from "./no-webgl-book-layer";
import { NoWebglSpineRow } from "./no-webgl-spine-row";
import { lockedProgressFor, scenePageCount, StripeScene, useStripeScene, type SceneBook, type Vendored } from "./stripe-scene";
import { useLookInside, type LookInsideSource } from "./use-look-inside";
import { useShelfCatch, type ShelfCatchSource } from "./use-shelf-catch";
import { useBookDetail, type BookDetailSource } from "./use-book-detail";
import { READING_RUN_ON, useReadingScroll, type ReadingSource } from "./use-reading-scroll";
import { useBookSounds } from "./use-book-sounds";
import { LookInsideBar } from "./look-inside-bar";
import { ShelfPager, ShelfPills, type ShelfHub } from "./shelf-controls";

/**
 * The shop's home, rebuilt from stripe.press's home code (06w9 module 43181; .tmp/stripe-notes/home-layout-inventory.md,
 * gap list shop-gap-list.md), their 3D scene verbatim (stripe-scene.tsx). Short: the first few books are featured in a
 * vertical stack, each holding on its art card, then one shelf segment where every book stands spine out in a row that
 * only horizontal input moves (their gesture router); vertical scroll passes on. As theirs: the scroll height is
 * computed from their segment extents, scroll maps to progress through their `scrollYToProgress` and `lockedProgressFor`,
 * the scene reads live refs written on every scroll, and React state changes only at thresholds.
 */
const FEATURED_MAX = 4, CARD_GAP = 16, CARD_INSET_BOTTOM = 8;
/** Their header bar's bottom (px), which their section header is laid out under; and the height of our refund line
 * under each rail title (TitleRail: mt-1 + leading-6). */
const THEIR_HEADER_BOTTOM = 49, REFUND_LINE = 28;

type Item = { id: string; title: string; price: string; href: string; stageArt: { url: string; alt?: string | null } | null;
  /** The book's details column (server-rendered: ProductInfo + ProductExtras), shown when it opens in the scene. */
  details?: ReactNode;
  /** The book's page images for "Open book", in reading order. */
  pages?: string[];
  /** The edition's page count, for a blank book's length. */
  pageCount?: number;
  /** Its refund rule (RefundTerms), a line under its title wherever the shop lists it. */
  refund?: ReactNode };
/** The shelf's state the scene can save and restore (their captureSpineView / restoreSpineView, 12s2:1737, 2178). */
type SpineView = { selection: { to: number; settled: boolean } & Record<string, unknown>; yaws: number[]; offset: number; primed: boolean; dragOffset: number };
type Labels = { featured: string; shelf: string; viewDetails: string; toShelf: string; openBook: string; closeBook: string;
  previousPage: string; nextPage: string; titles: string; sceneFailed: string; tryAgain: string;
  /** "Open {title}" and "Show {title} on the bookshelf": the no-WebGL books' names (theirs, 2548 and 27511). */
  openTitle: string; showOnShelf: string;
  /** The phone pager's buttons on the shelf. */
  previousProduct: string; nextProduct: string };
type Geometry = { lvh: number; mobile: boolean; top: number;
  /** How far our header pushes theirs down (px): see `measure`. */
  shift: number; height: number; offset: number; extents: number[];
  starts: number[]; lock: number[]; total: number };

export function ShopHome({ items, labels, initialOpen }: { items: Item[]; labels: Labels;
  /** The product whose address the page was loaded on: it opens in place once the scene is ready. */
  initialOpen?: string }) {
  const books = useMemo<SceneBook[]>(() => items.map(({ id, title, stageArt, pages, pageCount }) => ({ id, title, stageArt: stageArt?.url ?? null, pages, pageCount })), [items]);
  const { vendored, failed } = useStripeScene(books, Math.min(FEATURED_MAX, items.length));
  // Sounds only while the working scene is up: not while it loads, nor on the plain list it falls back to.
  useBookSounds(vendored != null && !failed);
  const first = items[0]?.stageArt;
  if (failed) return <ShopFallback items={items} labels={labels} initialOpen={initialOpen} />;
  // Native wheel scrolling here, as on stripe.press: their scroll mapping, holds and shelf catch read the browser's own
  // scroll, and the site's Lenis smoothing would keep driving the page through the shelf's catch.
  return <section data-lenis-prevent-wheel aria-label={labels.featured} className="relative min-h-svh">
    {vendored && items.length > 0 ? <Home vendored={vendored} items={items} labels={labels} initialOpen={initialOpen} /> : first && (
      // The first card where theirs lands (162 px down, 16 px in, 24 px off the bottom) until their code is running.
      <div className="pointer-events-none fixed inset-x-4 top-[162px] bottom-6 z-0 overflow-hidden rounded-[8px] bg-muted max-[900px]:top-[140px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={first.url} alt={first.alt ?? ""} draggable={false} className="absolute inset-0 size-full object-cover" />
      </div>)}
    {/* Every book reachable without the scene (their hidden keyboard listbox of every book). */}
    <ul className="sr-only">{items.map((entry) => <li key={entry.id}><Link href={entry.href}>{entry.title} {entry.price}</Link> {entry.refund}</li>)}</ul>
  </section>;
}

/**
 * When the scene's code doesn't load: the products as a plain list (title, price, refund rule, a link to each), with a
 * product's own details first on its address, and a reload to try the scene again.
 */
function ShopFallback({ items, labels, initialOpen }: { items: Item[]; labels: Labels; initialOpen?: string }) {
  const open = items.find((entry) => entry.id === initialOpen && entry.details);
  return <PageInset as="section" aria-label={labels.featured} className="min-h-svh pt-24 pb-24">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <p>{labels.sceneFailed}</p>
      <button type="button" onClick={() => window.location.reload()}
        className="inline-flex min-h-11 items-center text-foreground underline-offset-4 transition-opacity hover:opacity-70">{labels.tryAgain}</button>
    </div>
    {open && <div className="mt-10 max-w-2xl">{open.details}</div>}
    <ul className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((entry) => <li key={entry.id} className="min-w-0">
        <Link href={entry.href} className="group block min-w-0 outline-offset-4 focus-visible:outline-2">
          <h2 className="text-2xl leading-snug tracking-tight underline-offset-4 [overflow-wrap:anywhere] group-hover:underline">{entry.title}</h2>
          <p className="mt-2 text-[15px] leading-[21px] tabular-nums">{entry.price}</p>
        </Link>
        {entry.refund && <div className="mt-2 text-sm leading-6">{entry.refund}</div>}
      </li>)}
    </ul>
  </PageInset>;
}

function Home({ vendored, items, labels, initialOpen }: { vendored: Vendored; items: Item[]; labels: Labels; initialOpen?: string }) {
  const { hub, scroll, catalogue, router, seats, motion: tokens } = vendored;
  // Without WebGL their page shows the 2D layers (no-webgl-book-layer.tsx, no-webgl-spine-row.tsx), and the 2D row
  // reports its seat in module 44870 (`rD.f`), which the seat and the title fade read first (06w9:11117, 11874).
  const noWebgl = useMemo(() => vendored.noWebgl(), [vendored]);
  // Their page tells the scene which theme is on (06w9:13594, `homeStackDarkThemeActiveLiveRef = !light && !colour`), and
  // the scene blends to its dark lights (HOME_STACK_LIGHTS_DARK_TUNING) while it is set. Ours never set it, so our dark
  // page ran their light page's lights. It follows the site's theme attribute.
  useEffect(() => {
    const flag = hub.homeStackDarkThemeActiveLiveRef as { current: boolean } | undefined;
    if (!flag) return;
    const root = document.documentElement;
    // Their colour theme (a third, per-book-colour mode) has no counterpart here: off.
    const colour = hub.homeStackColorThemeActiveLiveRef as { current: boolean } | undefined;
    if (colour) colour.current = false;
    const read = () => { flag.current = root.dataset.theme === "dark"; };
    read();
    const watch = new MutationObserver(read);
    watch.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { watch.disconnect(); flag.current = false; };
  }, [hub]);
  const flatBooks = useMemo(() => items.map(({ id, title }) => ({ id, title })), [items]);
  // The book rects the scene (or the 2D row) writes each frame (module 50883 `i`), and the row's slot order: what the
  // shelf's pills and pager place themselves by.
  const bookRects = useMemo(() => (vendored.module(50883) as { i: { current: Map<number, { leftPx: number; topPx: number; widthPx: number; heightPx: number }> } }).i, [vendored]);
  const slotOf = useMemo(() => (index: number) => (hub.spineSlotForIndex as unknown as number[] | undefined)?.[index] ?? index, [hub]);
  // Their "page is scrolling" flag (module 50883 `R`), which the no-WebGL layers read: true on each scroll, false 120 ms
  // after the last (06w9:14730-14733).
  useEffect(() => {
    if (!noWebgl) return;
    const flag = (vendored.module(50883) as { R: { current: boolean } }).R;
    let timer = 0;
    const scrolling = () => { flag.current = true; window.clearTimeout(timer); timer = window.setTimeout(() => { flag.current = false; }, 120); };
    window.addEventListener("scroll", scrolling, { passive: true });
    return () => { window.removeEventListener("scroll", scrolling); window.clearTimeout(timer); };
  }, [noWebgl, vendored]);
  const flatRow = () => noWebgl ? (vendored.module(44870) as { f: { current: { visible: boolean; dyPx: number; seatScrollY: number | null } } }).f.current : null;
  const navigate = useTransitionRouter();
  const count = items.length, J = catalogue.J, K = catalogue.K;

  // Canvas geometry and segment extents (06w9:11476-11503, 11634-11667): the card starts where the title rail ends,
  // each featured book gets a canvas height plus its 150 px hold (the last one 0.67 canvas more), the shelf 1.67 canvas
  // heights on desktop (2.3–3.8 on a phone), and every later book 1 px.
  const measure = (): Geometry => {
    // Their section header sits under their 49 px header bar: the label 4 px below it, the title rail 21 px below
    // (14 on a phone), the card at `p(width)` (162 px; 140 on a phone). The site header here is taller and changes with
    // the width (58–70 px, measured), so the label, the rail and the card keep those distances from its bottom instead,
    // and the card also clears the refund line under each title (ours, 28 px: mt-1 + leading-6), which theirs hasn't.
    const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? THEIR_HEADER_BOTTOM;
    const shift = Math.max(0, Math.ceil(headerBottom - THEIR_HEADER_BOTTOM)), refund = items.some((entry) => entry.refund) ? REFUND_LINE : 0;
    const width = scroll.X(), lvh = scroll.C(), mobile = width < 900, top = scroll.p(width) + shift + refund, height = scroll.$(lvh, top);
    const offset = (top + height / 2 - Math.max(1, lvh) / 2) / Math.max(1, lvh);
    const shelfScreens = mobile ? Math.max(2.3, Math.min(3.8, 2.3 + ((lvh - 650) / 350) * 1.2)) : 1.67;
    const lock = Array.from({ length: catalogue.t }, (_, index) => 150 + (index === J ? Math.round(0.67 * height) : 0));
    const extents = catalogue.F(count, height, lock, shelfScreens), starts = scroll.e(extents);
    return { lvh, mobile, top, shift, height, offset, extents, starts, lock, total: extents.reduce((sum, value) => sum + value, 0) };
  };
  const [geometry, setGeometry] = useState<Geometry>(measure);
  const geo = useRef(geometry);
  useEffect(() => { geo.current = geometry; }, [geometry]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const off = scroll.d(() => setGeometry(measure()));
    // The site header settles after this page mounts and changes size with the window: re-measure when it does.
    const header = document.querySelector("header"), observer = header ? new ResizeObserver(() => setGeometry(measure())) : null;
    if (header) observer?.observe(header);
    return () => { off(); observer?.disconnect(); };
  }, [scroll]);

  // The scene's own refs (06w9:11578-11587, 13660-13662), written whenever the geometry changes.
  useEffect(() => {
    const { lvh, top, height, offset, mobile, extents } = geometry, shelf = extents[K] ?? 1;
    hub.detailCanvasCenterOffsetLiveRef.current = offset;
    hub.heroCardCenterPxLiveRef.current = top + (Math.min(height, scroll.$(scroll.B(), top)) - hub.SCENE_CARD_BOTTOM_INSET_CSS_PX) / 2;
    hub.homeStackIsMobileLiveRef.current = mobile;
    hub.spineScrollSectionScreensLiveRef.current = shelf / Math.max(1, height);
    hub.postCoverflowBgGapProgressLiveRef.current = (-0.1 * lvh) / shelf;
    hub.firstPostArriveLeadProgressLiveRef.current = (0.5 * lvh) / shelf;
  }, [geometry, hub, scroll, K]);

  // Scroll → progress on every scroll event (their readScroll): raw, locked and spine-row progress go to the scene's
  // refs; React only hears the locked index (±0.65 hysteresis; the rail at once, the rest after a 200 ms debounce), whether the shelf is up, and,
  // 100 ms after the scroll settles, the committed progress.
  // Loaded on a product's address: the scene's first frame already has that book open at its own index, as
  // theirs opens the deep link before its scene mounts (06w9:15177-15183); otherwise it would ease into the detail pose.
  const [landing, setLanding] = useState(() => {
    const index = initialOpen ? items.findIndex((entry) => entry.id === initialOpen && entry.details) : -1;
    if (index >= 0) {
      hub.scrollProgressDirectLiveRef.current = index; hub.spineViewProgressLiveRef.current = hub.spineViewProgressFor(index);
      hub.backgroundSnapScrollLiveRef.current = 6; hub.bookRowSeedLiveRef.current = 3;
    }
    return index >= 0 ? index : null;
  });
  const progressRef = useRef(landing ?? 0);
  // What the art cards follow: the locked progress, on the home and while reading.
  const cardsRef = useRef(landing ?? 0);
  // True while a book is open: the page holds still, so the scroll reader, the idle advance and the shelf catch stand
  // down and the scene keeps the progress the detail pinned (theirs: readScroll and the idle timer skip detail).
  const held = useRef(landing != null);
  const [committed, setCommitted] = useState(landing ?? 0), [active, setActive] = useState(landing ?? 0), [onShelf, setOnShelf] = useState(false);
  // The title rail follows the locked index at once (theirs uF); only the scene and its controls wait out the debounce (uK).
  const [railIndex, setRailIndex] = useState(landing ?? 0);
  const listeners = useRef(new Set<() => void>());
  useEffect(() => {
    let settle = 0, debounce = 0, index = 0;
    const read = () => {
      if (held.current) return;
      const { extents, height, lock, offset } = geo.current;
      const raw = scroll.m(window.scrollY, extents);
      const locked = lockedProgressFor(raw, { bookScrollExtentsPx: extents, canvasHeightPx: height, browseLockScrollPx: lock, canvasCenterOffset: offset }, catalogue);
      progressRef.current = locked; cardsRef.current = locked;
      hub.scrollProgressDirectLiveRef.current = raw;
      hub.spineViewProgressLiveRef.current = hub.spineViewProgressFor(raw);
      listeners.current.forEach((listener) => listener());
      const centred = locked - offset;
      if (Math.abs(centred - index) > 0.65) index = Math.round(centred);
      const book = catalogue.a(index), next = book == null ? J : Math.max(0, Math.min(count - 1, book));
      setRailIndex(next);
      window.clearTimeout(debounce); debounce = window.setTimeout(() => setActive(next), 200);
      setOnShelf(raw >= K - 0.5);
      window.clearTimeout(settle); settle = window.setTimeout(() => setCommitted(locked), 100);
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    return () => { window.removeEventListener("scroll", read); window.clearTimeout(settle); window.clearTimeout(debounce); };
  }, [catalogue, hub, scroll, J, K, count]);

  // Where the page scrolls to bring a featured book onto its card, or the shelf into place (easeInOutSine, as theirs).
  // One drive at a time; the shelf catch can stop it.
  const drive = useRef({ token: 0, active: false });
  /** The idle advance's glide in flight (its own, so a wheel doesn't cut it short; theirs `n`/`o`). */
  const gliding = useRef<{ at: number } | null>(null);
  /** A drag on a no-WebGL hero stops the idle advance for good (their onBookDragStart, 06w9:14928-14934). */
  const idleOff = useRef(false);
  const stopDriving = () => { drive.current.token += 1; drive.current.active = false; };
  const scrollTo = (target: number, ms: number) => {
    const from = window.scrollY, start = performance.now(), token = ++drive.current.token;
    drive.current.active = true;
    const step = (now: number) => {
      if (drive.current.token !== token) return;
      const t = Math.min(1, (now - start) / ms);
      window.scrollTo(0, from + (target - from) * (0.5 - 0.5 * Math.cos(Math.PI * t)));
      if (t < 1) requestAnimationFrame(step); else drive.current.active = false;
    };
    requestAnimationFrame(step);
  };
  // Any input of the visitor's takes the scroll back at once (their scroll owner, 62178: wheel, touch, pointer and the
  // scroll keys release it), so a drive (the idle advance, a title click) never fights a hand on the page. Capture, so
  // it runs before the gesture router, whose own step may start a new drive.
  useEffect(() => {
    const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"];
    const release = (event: Event) => {
      if (event instanceof KeyboardEvent && !keys.includes(event.key)) return;
      drive.current.token += 1; drive.current.active = false;
    };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    events.forEach((event) => window.addEventListener(event, release, { passive: true, capture: true }));
    return () => events.forEach((event) => window.removeEventListener(event, release, { capture: true }));
  }, []);
  const bookY = (index: number) => {
    const { starts, extents, offset } = geo.current, segment = catalogue.D(index);
    const at = index === 0 || index === J ? 0 : Math.max(0.01, Math.min(0.99, offset));
    return (starts[segment] ?? 0) + at * (extents[segment] ?? 0) + 1;
  };
  // The shelf's seat (their `nH`, 06w9:11116-11160): where the spine row sits seated, lifted clear of the titles.
  const seatY = () => {
    const flat = flatRow()?.seatScrollY;
    if (flat != null) return flat;
    const { starts, extents } = geo.current, width = window.innerWidth || 0, height = window.innerHeight || 1, mobile = width < 900;
    const at = (progress: number) => {
      const segment = Math.floor(progress), start = starts[segment], extent = extents[segment];
      return start != null && extent ? Math.round(start + (progress - segment) * extent) : null;
    };
    if (mobile) { const y = at(seats.d(true)); if (y != null) return y; }
    const seat = hub.spineRowSeatGeomLiveRef.current as { valid?: boolean; exitTarget?: number } | null;
    const line = hub.homeTitlesClearLinePxLiveRef.current as number | null;
    if (seat?.valid && (seat.exitTarget ?? 0) > 0 && line != null) {
      const y = at(seats.h(Math.max(0, hub.spineRowLiftForTopPx(line)) / (seat.exitTarget ?? 1), false));
      if (y != null) return y;
    }
    const start = starts[K], extent = extents[K];
    if (start == null || !extent) return null;
    const into = Math.max(0, Math.min(1, seats.j(mobile) - K)), d = height;
    const vh = d >= 1300 ? -87 : d >= 1100 ? -79.3 + ((d - 1100) / 200) * (-87 - -79.3) : d >= 850 ? -37.4 - ((d - 850) / 250) * 41.9
      : d >= 650 ? -13.6 + ((d - 650) / 200) * (-37.4 - -13.6) : -13.6;
    return Math.round(start + into * extent + ((vh + ((hub.shelfScrollTargetOffsetVhLiveRef.current as number) ?? 0)) * d) / 100);
  };
  const shelfY = () => seatY() ?? (geo.current.starts[K] ?? 0) + 0.3 * (geo.current.extents[K] ?? 0);
  const motion = useRef({ scrollTo, bookY, shelfY });
  useEffect(() => { motion.current = { scrollTo, bookY, shelfY }; });

  // Their shelf catch and the titles' clear line (use-shelf-catch.tsx).
  const titles = useRef<HTMLElement>(null);
  const [seatBottom, setSeatBottom] = useState<number | null>(null);
  const catchSource = useRef<ShelfCatchSource>({ seatY: () => null, driving: () => false, stopDriving: () => undefined, titles: () => null, held: () => false,
    seatBottom: () => undefined });
  useEffect(() => { catchSource.current = { seatY, driving: () => drive.current.active || gliding.current != null, stopDriving, titles: () => titles.current,
    held: () => held.current, seatBottom: setSeatBottom }; });
  useShelfCatch(hub, catalogue, catchSource);

  // Opening a book into its details inside the scene (use-book-detail.tsx), at every width.
  const detailSource = useRef<BookDetailSource>({ rawProgress: () => 0, hrefOf: () => null, home: "/shop", placeOf: () => 0, shelfAt: () => null,
    pin: () => undefined, unpin: () => undefined, pagesOpen: () => false });
  useEffect(() => { detailSource.current = { rawProgress: () => hub.scrollProgressDirectLiveRef.current as number,
    hrefOf: (index) => items[index]?.href ?? null, home: "/shop", placeOf: bookY, shelfAt: seatY, pagesOpen: () => lookOpen.current,
    // The scene poses an open book by the progress in its details: at the open book's own index, the top of them. As
    // theirs (06w9:15271-15273), the scene's row smoother snaps to it (snap 6 frames, row seed 3) instead of easing
    // through the stack between the shelf and the book's own place.
    pin: (index, arrived, instant) => {
      // Where closing returns to (their origin snapshot `te`): the home scroll the book opened from; none for an address.
      const raw = hub.scrollProgressDirectLiveRef.current as number;
      if (arrived) origin.current = null;
      else if (!held.current) origin.current = { y: window.scrollY, index, fromShelf: raw >= J + 0.5 && raw < K + 1,
        // …and the shelf as it stood (their `tl()` snapshot takes `captureSpineView`, 06w9:10624).
        spine: (hub.captureSpineView as unknown as () => SpineView)() };
      held.current = true; stopDriving();
      progressRef.current = cardsRef.current = index; hub.scrollProgressDirectLiveRef.current = index;
      hub.spineViewProgressLiveRef.current = hub.spineViewProgressFor(index); setCommitted(index);
      hub.backgroundSnapScrollLiveRef.current = 6; hub.bookRowSeedLiveRef.current = 3;
      readingRef.current?.begin(index, instant);
    },
    landingExits: (index) => readingRef.current?.landingExits(index),
    // Back to the home scroll once the reading stack is gone (their `hJ`, 15872-15918): a featured book not opened from
    // the shelf returns onto its own card; the book it opened from returns where it was; any other to the shelf.
    unpin: (index) => {
      const from = origin.current;
      const card = index < catalogue.t && !from?.fromShelf;
      returning.current = { y: card ? bookY(index) : from && from.index === index ? from.y : null, index, spine: card ? undefined : from?.spine ?? null };
    } }; });
  const detail = useBookDetail(hub, catalogue, router, tokens, detailSource);
  const openIndex = useRef<number | null>(null);
  useEffect(() => { openIndex.current = detail.open; }, [detail.open]);
  const origin = useRef<{ y: number; index: number; fromShelf: boolean; spine: SpineView } | null>(null);
  /** `spine`: the shelf to restore (null: the shelf as it is now); undefined when the book returns onto its card. */
  const returning = useRef<{ y: number | null; index: number; spine?: SpineView | null } | null>(null);

  // The reading scroll (use-reading-scroll.tsx): while a book is open the page scrolls every book's details, and that
  // scroll moves the scene (the reading book's exit, the next one's arrival) and the cards; the address follows.
  const readingSource = useRef<ReadingSource>({ hrefOf: () => null, onIndex: () => undefined, onProgress: () => undefined, onCommit: () => undefined });
  useEffect(() => { readingSource.current = { hrefOf: (index) => items[index]?.href ?? null, onIndex: (index) => detail.setReading(index),
    onProgress: (locked) => { progressRef.current = cardsRef.current = locked; listeners.current.forEach((listener) => listener()); },
    onCommit: (locked) => setCommitted(locked) }; });
  const page = useRef<HTMLDivElement>(null);
  const reading = useReadingScroll(hub, scroll, detail.open, geometry, count, readingSource, page);
  // As theirs: the page places itself (a product's address parks on its details); the browser's restore would fight it.
  useEffect(() => {
    const before = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = before; };
  }, []);
  const readingRef = useRef(reading);
  useEffect(() => { readingRef.current = reading; });
  // "Open book" (use-look-inside.tsx): in the details the open book's pages open in place; on the home the book comes
  // forward first. The home scrolls onto the book (their `ut`, or the shelf's seat) before it comes forward.
  const lookSource = useRef<LookInsideSource>({ place: () => undefined, book: () => null });
  useEffect(() => { lookSource.current = {
    place: (index) => window.scrollTo({ top: Math.max(0, index < catalogue.t ? bookY(index) : (seatY() ?? shelfY())), behavior: "smooth" }),
    book: (index) => (items[index] ? { pageCount: scenePageCount(items[index].pages, items[index].pageCount), startPage: 1 } : null) }; });
  const look = useLookInside(hub, detail.open, lookSource);
  const lookOpen = useRef(false);
  useEffect(() => { lookOpen.current = look.open; });
  // The scene hears the book being read 200 ms late (their `uK`), the first one at once.
  const [sceneIndex, setSceneIndex] = useState<number | null>(landing);
  useEffect(() => {
    if (detail.open == null) { setSceneIndex(null); return; }
    const timer = window.setTimeout(() => setSceneIndex(detail.open), sceneIndex == null ? 0 : 200);
    return () => window.clearTimeout(timer);
  }, [detail.open]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Closed: the home layout is back in this commit, so the page returns to its home scroll before anything paints.
  useLayoutEffect(() => {
    const back = returning.current;
    if (detail.open != null || !back) return;
    returning.current = null;
    window.scrollTo(0, back.y ?? seatY() ?? shelfY());
    // Back on the shelf, the shelf is as it was, with the closed book the selected one (their `restoreSpineView(aj(…))`,
    // 06w9:15283, 15291, 15892); without a snapshot the scene settles onto it itself (detailReturnSettleLiveRef).
    if (back.spine !== undefined) {
      const view = back.spine ?? (hub.captureSpineView as unknown as () => SpineView)();
      (hub.restoreSpineView as unknown as (view: SpineView) => void)(view.selection.to === back.index ? view
        : { ...view, selection: { ...view.selection, to: back.index, settled: true }, yaws: [], offset: 0, primed: false, dragOffset: 0 });
      hub.detailReturnSettleLiveRef.current = back.spine ? null : back.index;
    }
    held.current = false;
    hub.backgroundSnapScrollLiveRef.current = 6; hub.bookRowSeedLiveRef.current = 6;
    window.dispatchEvent(new Event("scroll"));
  }, [detail.open]);   // eslint-disable-line react-hooks/exhaustive-deps
  const openRef = useRef((index: number) => { const item = items[index]; if (item) navigate.push(item.href); });
  const arrived = useRef(initialOpen);
  useEffect(() => {
    const index = items.findIndex((entry) => entry.id === arrived.current);
    arrived.current = undefined;
    if (!(index >= 0 && items[index]?.details && detail.openBook(index, true))) { setLanding(null); held.current = false; }
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { openRef.current = (index: number) => {
    if (items[index]?.details && detail.openBook(index)) return;
    const item = items[index]; if (item) navigate.push(item.href);
  }; });

  // Idle auto-advance (06w9:14528-14582, 14912-14925): from 1.5 s after mount, once the hero intro has settled (checked
  // every 120 ms), one book down every 3 s, counted from the start of the last glide (1 s; 1.83 s into the shelf). A
  // wheel or touch stops the next glides but not the one in flight: theirs runs it to the end on its own token
  // (`lo`), which only opening a book bumps. Measured on stripe.press: first glide 5.9 s after load, 2.0 s pauses.
  // An open look-inside stands it down too: theirs moves the address to /book/<id>/page/<n> and the timer only runs
  // on "/" (14540-14552); ours keeps /shop, so it reads the open pages instead (measured: theirs holds y while open).
  useEffect(() => {
    let timer = 0, stopped = false;
    const stop = () => { stopped = true; window.clearTimeout(timer); };
    // While it glides, a scroll more than 50 px off its own line (a hand on the page) stops the glides after it.
    const glide = (target: number, ms: number) => {
      const from = window.scrollY, start = performance.now();
      gliding.current = { at: from };
      const step = (now: number) => {
        if (held.current || lookOpen.current) { gliding.current = null; return; }
        const t = Math.min(1, (now - start) / ms), y = from + (target - from) * (0.5 - 0.5 * Math.cos(Math.PI * t));
        gliding.current = { at: y };
        window.scrollTo(0, y);
        if (t < 1) requestAnimationFrame(step); else gliding.current = null;
      };
      requestAnimationFrame(step);
    };
    const drift = () => { const g = gliding.current; if (g && Math.abs(window.scrollY - g.at) > 50) stop(); };
    window.addEventListener("scroll", drift, { passive: true });
    const arm = (delay: number) => {
      timer = window.setTimeout(() => {
        if (stopped || idleOff.current) return;
        if (held.current || lookOpen.current) { arm(3000); return; }
        const index = catalogue.a(Math.round(hub.scrollProgressDirectLiveRef.current as number));
        if (index == null || index >= catalogue.t) return;
        const move = motion.current;
        if (index >= J) glide(move.shelfY(), 1833); else glide(move.bookY(index + 1), 1000);
        arm(3000);
      }, delay);
    };
    const wait = () => {
      timer = window.setTimeout(() => {
        if (stopped) return;
        if (!hub.heroIntroSettledLiveRef.current) { wait(); return; }
        arm(3000);
      }, 120);
    };
    timer = window.setTimeout(wait, 1500 - 120);
    // Theirs stops on wheel and touchmove only (a press or key elsewhere scrolls the page, which the drift check sees).
    const events = ["wheel", "touchmove"] as const;
    events.forEach((event) => window.addEventListener(event, stop, { passive: true }));
    return () => { stop(); gliding.current = null; window.removeEventListener("scroll", drift); events.forEach((event) => window.removeEventListener(event, stop)); };
  }, [catalogue, hub, J]);

  // Their gesture scopes (06w9:16955-16998): on the stack a vertical step moves one book and → opens it; on the shelf
  // horizontal wheel, drag, swipe and arrows move the row, and vertical leaves it.
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => {
    const uninstall = router.e();
    const open = (index: number) => openRef.current(index);
    const featuredScope = router.v("featured", {
      acceptsGesture: false,
      horizontal: (step: number) => { if (step === 1 && !lookOpen.current) open(activeRef.current); },
      vertical: (step: number) => {
        if (lookOpen.current) return true;
        const move = motion.current, current = activeRef.current, next = current + step;
        if (next >= catalogue.t) move.scrollTo(move.shelfY(), 1833);
        else if (next >= 0) move.scrollTo(move.bookY(next), 1000);
        else return false;
        return true;
      },
    });
    const shelfScope = router.v("shelf", {
      horizontal: (step: number, options?: { repeat?: boolean }) => hub.stepSpineSelection(step, count, { repeat: options?.repeat }),
      drag: { begin: hub.beginSpineDrag, move: hub.moveSpineDrag, end: hub.endSpineDrag },
      vertical: (step: number) => {
        const move = motion.current;
        if (step === -1) move.scrollTo(move.bookY(J), 1000); else move.scrollTo(geo.current.total, 1000);
      },
    });
    return () => { featuredScope(); shelfScope(); if (typeof uninstall === "function") uninstall(); };
  }, [router, hub, catalogue, count, items, navigate, J]);

  // Their BookStack reads the books from its prop; ours are also their catalogue now (change 7): the same list.
  // A product's address opens with its details already up, so the scene skips its intro (theirs: skipIntro for a book
  // address, 06w9:13210, 17840); otherwise the open book would reset and fly in beside its column a second later.
  const skipIntro = useRef(Boolean(initialOpen)).current;
  // Once the detail state itself is open, the landing has done its job (closing must not fall back to it).
  useEffect(() => { if (detail.open != null) setLanding(null); }, [detail.open]);
  const lookProps = look.sceneProps, lookHome = look.home && look.homeIndex != null ? look.homeIndex : null;
  const sceneProps = useMemo(() => ({ skipIntro, ...lookProps,
    books: (window as unknown as { __SPBOOKS: unknown }).__SPBOOKS, scrollProgress: committed, scrollProgressLiveRef: progressRef,
    activeBookIndex: lookHome ?? (detail.open != null ? (sceneIndex ?? detail.open) : active), stackMode: "browse", onBookOpen: (index: number) => openRef.current(index),
    // Their `isDetailOpen: tx || iv` and `detailBookIndex: iv ? nI : uK`: the home's open book is posed as a detail book.
    isDetailOpen: (detail.open ?? landing ?? lookHome) != null,
    detailBookIndex: lookHome ?? (detail.open != null || landing != null ? (sceneIndex ?? detail.open ?? landing) : -1),
  }), [skipIntro, lookProps, lookHome, committed, active, detail.open, landing, sceneIndex]);

  // The spine row seats against, and lifts out ahead of, the section after the shelf (their #home-section-films, read
  // through homeWebsitesSectionElLiveRef); without one the scene treats the row as already gone. Theirs places that
  // section by the seat, not by the stack's end (their content top `l_ − lY`, 06w9:11674-11694, 18117): with the seat
  // locked, at the seat's scroll plus 0.3 of a screen, the seated row's bottom and their 135 px gap; before it locks,
  // a screen below the seat's 0.15 lift; on a phone, a screen below a fifth of the shelf. So the row has barely seated
  // when the section comes up and lifts it (measured on stripe.press: their section sits at 4524 px, the formula
  // gives 4524; ours stood 1,500 px further down, leaving the shelf still for a whole screen and more).
  const next = useRef<HTMLElement>(null);
  const sectionTop = useMemo(() => () => next.current?.getBoundingClientRect().top ?? null, []);
  useEffect(() => { hub.homeWebsitesSectionElLiveRef.current = next.current; return () => { hub.homeWebsitesSectionElLiveRef.current = null; }; }, [hub]);
  const nextTop = useMemo(() => {
    const { extents, starts, lvh, mobile, total } = geometry;
    const at = (progress: number) => { const segment = Math.floor(progress); return (starts[segment] ?? total) + (progress - segment) * (extents[segment] ?? 0); };
    if (seatBottom != null) return Math.round(at(seats.d(mobile)) + 0.3 * lvh + seatBottom + hub.SPINE_ROW_WEBSITES_GAP_PX);
    if (!mobile) return Math.round(at(seats.h(0.15, false)) + lvh);
    return Math.round((starts[K] ?? total) + 0.2 * (extents[K] ?? 0) + lvh);
  }, [geometry, seatBottom, seats, hub, K]);

  // How far the rising row covers the titles (their header sampler's `rowOverTitles`, 06w9:11870-11895): the rail's
  // share under the row's top at the lift the next section gives it, in 40ths; −1 while the seat isn't locked. The
  // rail fades by half of it (their footerFade), at every width. Without WebGL it's the 2D row's rise over its seat
  // instead (`rD.f`, module 44870, written by no-webgl-spine-row.tsx).
  const [rowOver, setRowOver] = useState(-1);
  useEffect(() => {
    let frame = 0;
    const sample = () => {
      frame = 0;
      const geom = hub.spineRowSeatGeomLiveRef.current as { valid?: boolean; lock?: boolean } | null;
      const rail = titles.current, section = next.current;
      let over = -1;
      const flat = flatRow();
      if (flat && flat.seatScrollY != null && rail) {
        const box = rail.getBoundingClientRect();
        over = box.height < 1 ? 0 : Math.round(40 * Math.max(0, Math.min(1, -flat.dyPx / box.height))) / 40;
      } else if (geom?.valid && geom.lock && rail && section) {
        const lift = hub.spineRowLiftForWebsitesTop(section.getBoundingClientRect().top), box = rail.getBoundingClientRect();
        over = lift <= 0 || box.height < 1 ? 0 : Math.round(40 * Math.max(0, Math.min(1, (box.bottom - hub.spineRowTopPxAtLift(lift)) / box.height))) / 40;
      }
      setRowOver(over);
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(sample); };
    sample();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", request); window.removeEventListener("resize", request); };
  }, [hub]);

  // On the shelf the rail names the selected spine (their rail follows the spine selection there). While the selection
  // is settled the active title also stands over the face-out book, 2.5vw left of its centre (their `getActiveBookRect`,
  // 06w9:17748, read once per settle in 21ix's coverflow loop: centerPx + j(width)); at the row's ends, where the row
  // stops sliding, that is off-centre. Otherwise it is centred as on the stack.
  const [selected, setSelected] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);
  useEffect(() => {
    if (!onShelf) { setSelected(null); setAnchor(null); return; }
    let frame = 0, key = "";
    const follow = () => {
      const selection = hub.spineSelectionLiveRef.current as { to?: number; settled?: boolean } | null;
      const settled = hub.spineSelectedSettledLiveRef.current as { valid: boolean; to: number; nonce: number; centerPx: number };
      const to = selection?.to;
      if (typeof to === "number") setSelected(to);
      if (!selection?.settled || !settled.valid || settled.to !== to) { key = ""; setAnchor(null); }
      else if (key !== to + "|" + settled.nonce) {
        key = to + "|" + settled.nonce;
        setAnchor(Math.round(settled.centerPx - 0.025 * window.innerWidth));
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [onShelf, hub]);

  const item = items[active] ?? items[0];
  const readingOpen = detail.open != null;
  const phoneDetail = geometry.mobile && readingOpen && !detail.leaving;
  // While reading, the page is the stack of every book's details (their sections, then half a screen); otherwise the
  // home's own scroll.
  const readingHeight = reading.layout.total + Math.round(geometry.lvh / 2);
  return <div ref={page} className="relative overflow-x-clip" style={{ "--shop-shift": geometry.shift + "px" } as CSSProperties}>
    <div aria-hidden="true" className="h-(--page-height)" style={{ "--page-height": (readingOpen ? readingHeight : Math.max(0, nextTop)) + "px" } as CSSProperties} />
    {/* The section after the shelf (their Multimedia's place). A placeholder for now (owner, 26 Nov: "a whole new section
        … For now, make it a placeholder: min 100vh, 100vw section"). At least a screen tall, so the page scrolls on
        until its top passes the window's: their row lift (spineRowLiftForWebsitesTop) only takes the row fully off once
        the section's top is ~100 px from the window's (at 40lvh the page ended at 213 px, row half under the header, G5).
        Its top is the anchor the seat and the lift read: nothing may go above it inside it. */}
    <section ref={next} aria-hidden="true" className="relative min-h-lvh w-screen" />
    <Cards items={items} featured={catalogue.t} geometry={geometry} progressRef={cardsRef} listeners={listeners} reading={held} J={J}
      hub={hub} openRef={openIndex} />
    {noWebgl ? (
      // Without WebGL their page draws the books as pre-rendered images (06w9:17921-17935): the hero layer instead of
      // BookStack, the 2D spine row instead of the 3D shelf. In their own stacking layer, as the scene is.
      <div className="relative isolate z-10">
        <NoWebglBookLayer vendored={vendored} books={flatBooks} detailOpen={detail.open != null}
          detailBookIndex={detail.open != null ? (sceneIndex ?? detail.open) : null} stackDetailOpen={detail.open != null || look.open}
          hidden={look.open} isMobile={geometry.mobile} raised={false} onBookOpen={(index) => openRef.current(index)}
          onFirstBookReady={() => undefined} onBookDragStart={() => { idleOff.current = true; }} onBookDragEnd={() => undefined}
          openLabel={(title) => labels.openTitle.replace("{title}", title)} />
        <NoWebglSpineRow vendored={vendored} books={flatBooks} hidden={detail.open != null || look.open}
          onBookOpen={(index) => openRef.current(index)} labels={{ open: labels.openTitle, show: labels.showOnShelf }} />
      </div>
    ) : <StripeScene vendored={vendored} props={sceneProps} className="pointer-events-none fixed inset-0 isolate z-10" />}
    {/* On a phone the return link takes the label's place while a book is open (their Nav__FeaturedSlot: the label slides
        −10 px and fades, the link comes in from +10 px 100 ms later, 300 ms each). */}
    <div className="fixed top-[calc(53px+var(--shop-shift,0px))] left-4 z-20 grid text-[11px] uppercase leading-4 tracking-[0.06em] text-muted-foreground">
      <p className={cn("col-start-1 row-start-1 transition-[opacity,translate] duration-300 ease-[ease]", phoneDetail ? "-translate-x-2.5 opacity-0" : "delay-100")}>
        [ {onShelf ? labels.shelf : labels.featured} ]
      </p>
      <button type="button" tabIndex={phoneDetail ? 0 : -1} aria-hidden={!phoneDetail} onClick={() => detail.closeBook()}
        className={cn("col-start-1 row-start-1 -my-3.5 inline-flex min-h-11 min-w-11 items-center self-start text-left uppercase transition-[opacity,translate,color] duration-300 ease-[ease] hover:text-foreground",
          phoneDetail ? "pointer-events-auto delay-100" : "pointer-events-none translate-x-2.5 opacity-0")}>
        <ArrowLeftIcon aria-hidden="true" className="mr-1.5 size-3.5" />{labels.toShelf}
      </button>
    </div>
    <TitleRail railRef={titles} label={labels.titles} titles={items.map((entry) => entry.title)} refunds={items.map((entry) => entry.refund)} active={detail.open ?? selected ?? railIndex}
      fade={detail.open != null ? 0 : rowOver >= 0 ? 0.5 * rowOver : Math.max(0, Math.min(1, (committed - K - 0.2) / 0.3))} shelf={committed >= J}
      detail={detail.open != null && !detail.leaving} anchor={detail.open != null ? null : anchor}
      hidden={phoneDetail}
      onPick={(index) => detail.open != null ? openRef.current(index) : index < catalogue.t ? scrollTo(bookY(index), 1000) : scrollTo(shelfY(), 1833)} />
    {item && <ViewDetails href={item.href} label={labels.viewDetails} hidden={(onShelf || detail.open != null) && !look.home} onOpen={() => openRef.current(active)}
      book={noWebgl ? undefined : { label: look.open && look.home ? labels.closeBook : labels.openBook, open: look.open && look.home,
        onToggle: () => (look.open ? look.close() : look.openOnHome(active)) }} />}
    {/* The peek pill (their "+ Open book +", left 30 %): while the open book in the details is hovered, or the pill is.
      * Without WebGL there is no open book, so theirs leaves out the pill and the corner's "Open book" (06w9:17936, 18224). */}
    {!noWebgl && <OpenBookPill label={labels.openBook} shown={detail.open != null && !detail.leaving && !look.open && (look.peek || look.pillHover)}
      onHover={look.setPillHover} onOpen={() => { look.setPillHover(false); look.openInDetail(); }} />}
    {/* On the shelf, over the face-out book: the pills on desktop, the pager on a phone (their HomeBookCornerButtons and
        CoverflowPager, 06w9:17969-18042), while nothing is open. */}
    {!geometry.mobile && <ShelfPills shown={onShelf && detail.open == null && !look.open} hub={hub as unknown as ShelfHub} rects={bookRects}
      labels={{ details: labels.viewDetails, openBook: labels.openBook }} onDetails={(index) => openRef.current(index)}
      onOpenBook={noWebgl ? undefined : (index) => look.openOnHome(index)} />}
    {geometry.mobile && <ShelfPager shown={onShelf && detail.open == null && !look.open} hub={hub as unknown as ShelfHub} rects={bookRects} count={count}
      slotOf={slotOf} sectionTop={sectionTop} labels={{ group: labels.shelf, previous: labels.previousProduct, next: labels.nextProduct }} />}
    <LookInsideBar shown={look.open} wide={look.home} page={look.page}
      leaves={Math.ceil(scenePageCount(items[lookHome ?? detail.open ?? 0]?.pages, items[lookHome ?? detail.open ?? 0]?.pageCount) / 2)} labels={labels}
      onBack={() => look.turnBy(-1, Math.ceil(scenePageCount(items[lookHome ?? detail.open ?? 0]?.pages, items[lookHome ?? detail.open ?? 0]?.pageCount) / 2))}
      onForward={() => look.turnBy(1, Math.ceil(scenePageCount(items[lookHome ?? detail.open ?? 0]?.pages, items[lookHome ?? detail.open ?? 0]?.pageCount) / 2))}
      onClose={look.close} />
    <DetailStack shown={readingOpen && !detail.leaving} height={readingOpen ? readingHeight : 0} toShelf={labels.toShelf} onClose={() => detail.closeBook()}>
      {readingOpen && items.map((entry, index) => <DetailSlot key={entry.id} index={index} top={reading.layout.tops[index] ?? 0}
        active={READING_RUN_ON || index === detail.open}
        onMeasured={reading.measured} anchors={reading.anchors}>{entry.details}</DetailSlot>)}
    </DetailStack>
  </div>;
}

/**
 * The art cards (BackgroundScene, 1jyk:291-622): one canvas-sized card per featured book in a column, 16 px apart (8 on
 * a phone), sliding with the locked progress, so a book's hold is its card's pause; the photo counter-moves 70 % and
 * zooms to ~1.06 one book away; the last card lifts out as the shelf arrives. Written per scroll, outside React.
 */
function Cards({ items, featured, geometry, progressRef, listeners, reading, J, hub, openRef }: { items: Item[]; featured: number; geometry: Geometry;
  progressRef: { current: number }; listeners: { current: Set<() => void> };
  /** True while reading: the cards follow the reading progress (the last card does not lift away). */
  reading: { current: boolean }; J: number;
  /** The scene's refs (a phone's card exits) and the open book. */
  hub: Vendored["hub"]; openRef: { current: number | null } }) {
  const plates = useRef<(HTMLDivElement | null)[]>([]), photos = useRef<(HTMLImageElement | null)[]>([]);
  const [shown, setShown] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setShown(true), 50); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    const { height, mobile } = geometry, set = listeners.current, box = height - (mobile ? 25 : CARD_INSET_BOTTOM);
    // A phone (0wim:331-470): 8 px apart while browsing, 16 in the details; there each card leaves upward with its book's
    // card exit, linearly (1.3 cards plus the gap at 1), books already read fully gone; during the carry it rides the
    // landing's exit with the open book.
    const exitOf = (index: number) => {
      const open = openRef.current, transition = hub.bookOpenTransitionLiveRef.current as { active?: boolean; returning?: boolean;
        activeProgress?: number; landingExits?: { bg?: number } } | null;
      if (open != null && reading.current) {
        const at = (hub.detailBgExitAtByIndexLiveRef.current as (((y: number) => number) | undefined)[])[index];
        const value = at ? at(window.scrollY) : (hub.detailBgExitByIndexLiveRef.current as (number | undefined)[])[index];
        return value ?? (index < open ? 1 : 0);
      }
      return transition?.active && !transition.returning && transition.landingExits
        ? (transition.landingExits.bg ?? 0) * Math.max(0, Math.min(1, transition.activeProgress ?? 0)) : 0;
    };
    const write = () => {
      const locked = progressRef.current, gap = mobile ? (reading.current ? 16 : 8) : CARD_GAP;
      for (let index = 0; index < featured; index += 1) {
        const plate = plates.current[index], photo = photos.current[index];
        if (!plate) continue;
        const lift = index === J && !reading.current ? 1.25 * height * Math.max(0, Math.min(1, (locked - J) / (0.35 / 0.6))) : 0;
        const exit = mobile ? exitOf(index) * (1.3 * height + gap) : 0;
        let y = (index - locked) * (height + gap) - lift - exit;
        // A phone's details: the card gives way to its rising slot (their clamp `L`): within 0.35 of a card above the box,
        // its top may not climb above the slot's top + 24 px, eased out as the slot passes the box's top.
        const tops = hub.detailSectionTopsLiveRef.current as number[] | null, slot = tops?.[index];
        if (mobile && reading.current && openRef.current != null && slot != null) {
          const edge = slot - window.scrollY + 24 - geometry.top, room = 0.35 * box;
          if (edge > -room && y < edge) {
            const n = Math.max(0, Math.min(1, -edge / room)), smooth = n * n * (3 - 2 * n);
            y += (edge - y) * (1 - smooth);
          }
        }
        plate.style.transform = "translate3d(0," + y + "px,0)";
        const c = Math.max(0, Math.min(1, (locked - index + 1) / 2)), e = (0.48 * (1 + Math.cos(2 * Math.PI * c))) / 2;
        if (photo) photo.style.transform = "translate3d(0," + -0.7 * y + "px,0) scale(" + 1 / (0.5 / 2 ** (0.38 * e) + 0.5) + ")";
      }
    };
    write();
    set.add(write);
    // On a phone the carry and the open's 450 ms blend move the cards without a scroll: they follow every frame there.
    let frame = 0;
    const follow = () => { write(); frame = requestAnimationFrame(follow); };
    if (mobile) frame = requestAnimationFrame(follow);
    return () => { set.delete(write); cancelAnimationFrame(frame); };
  }, [geometry, featured, progressRef, listeners, reading, J, hub, openRef]);
  // The card's box: 8 px off the bottom on desktop, 25 on a phone (theirs, 1jyk:64-77, without the URL-bar terms).
  return <div aria-hidden="true" style={{ top: geometry.top, height: geometry.height - (geometry.mobile ? 25 : CARD_INSET_BOTTOM) }}
    className="pointer-events-none fixed inset-x-4 z-0 overflow-hidden rounded-[8px] max-[900px]:z-[2]">
    {/* data-bg-index: the no-WebGL hero layer finds the plates by it and follows their translate (theirs, 0jause). */}
    {items.slice(0, featured).map((entry, index) => <div key={entry.id} data-bg-index={index} ref={(plate) => { plates.current[index] = plate; }}
      className={cn("absolute inset-0 overflow-hidden rounded-[8px] bg-muted transition-opacity duration-[450ms] will-change-transform",
        shown ? "opacity-100" : "opacity-0", index === 0 ? "delay-[1100ms]" : "delay-[1600ms]")}>
      {entry.stageArt && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={(photo) => { photos.current[index] = photo; }} src={entry.stageArt.url} alt={entry.stageArt.alt ?? ""} draggable={false}
          className="absolute inset-0 size-full object-cover will-change-transform" />)}
    </div>)}
  </div>;
}

/**
 * Easings here are their CSS keywords written as ease-[keyword]: Tailwind's named ease-* utilities and its default
 * transition curve are cubic-bezier(0.4,0,0.2,1) variants, not the CSS keywords (the rail measured front-loaded, G9).
 * The title rail (FeaturedTitleList, 21ix): fixed at 70 px (63 on a phone), every title (three times over) in one line, the active one
 * upright and centred at 47.5 % of the width (500 ms ease-in-out), the rest italic at 0.8; each title's refund rule on a
 * line under it (owner, 25 Nov); the titles fade in 1.2 s after load and fade out as the shelf takes the screen.
 */
function TitleRail({ railRef, label, titles, refunds, active, fade, shelf, detail, anchor, hidden, onPick }: { railRef: Ref<HTMLElement>; label: string; titles: string[];
  /** Each title's refund rule, a line under it. */
  refunds: ReactNode[]; active: number; fade: number;
  /** Past the featured books: the rail fades with the rising row over 350 ms (theirs: opacity 350 ms ease on the shelf). */
  shelf: boolean;
  detail: boolean;
  /** Where the active title's centre stands while the shelf's selection is settled (px), or null for the usual 47.5vw. */
  anchor: number | null;
  /** A phone's open book: the rail fades out over 300 ms (theirs `footerFade`, no delay). */
  hidden: boolean; onPick: (index: number) => void }) {
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [shift, setShift] = useState(0), [shown, setShown] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setShown(true), 1200); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    const place = () => {
      const item = items.current[titles.length + active];
      // Centred at 47.5vw, or 27.5vw over the shifted scene while a book is open (their centerOffsetVw −20), or over the
      // shelf's face-out book.
      const centre = anchor != null && !detail ? anchor : (detail ? 0.275 : 0.475) * window.innerWidth;
      if (item) setShift(centre - 20 - (item.offsetLeft + item.offsetWidth / 2));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active, titles, detail, anchor]);
  return <nav ref={railRef} aria-label={label} aria-hidden={hidden || undefined} inert={hidden} style={{ opacity: shown && !hidden ? 1 - 2 * fade : 0 }}
    className={cn("pointer-events-none fixed inset-x-0 top-[calc(70px+var(--shop-shift,0px))] z-20 overflow-hidden px-5 pt-5 pb-3 transition-[opacity,clip-path] duration-[1600ms] max-[900px]:top-[calc(63px+var(--shop-shift,0px))]",
      hidden ? "duration-300" : detail ? "[clip-path:inset(0_40%_0_0)] [transition-duration:1600ms,600ms] [transition-timing-function:ease,cubic-bezier(0.16,1,0.3,1)]" : "[clip-path:inset(0_0_0_0)] ease-[ease]",
      shown && shelf && !detail && !hidden && "duration-[350ms]")}>
    <ul style={{ transform: "translateX(" + shift + "px)" }}
      className="flex w-max gap-x-[72px] transition-transform duration-500 ease-[ease-in-out] max-[900px]:gap-x-[30px]">
      {/* Three copies, the middle one active, so the active title always has neighbours on both sides (theirs: 21ix). */}
      {[...titles, ...titles, ...titles].map((title, slot) => { const index = slot % titles.length, middle = slot >= titles.length && slot < 2 * titles.length;
        return <li key={slot} aria-hidden={middle ? undefined : true}>
        <button ref={(item) => { items.current[slot] = item; }} type="button" tabIndex={middle ? undefined : -1} onClick={() => onPick(index)}
          className="pointer-events-auto relative font-display text-[length:calc(40px+16*(100vw-375px)/1353)] leading-[1.12] font-medium tracking-[-0.1rem] whitespace-nowrap text-foreground outline-offset-4 focus-visible:outline-2 max-[900px]:text-[length:calc(44px+17.6*(100vw-375px)/1353)]">
          <span className={cn("block origin-[0_78%] italic transition-[opacity,transform] duration-[448ms] ease-[ease]",
            middle && index === active ? "opacity-0 [transform:skewX(9deg)]" : "opacity-80")}>{title}</span>
          <span className={cn("absolute inset-0 not-italic transition-[opacity,transform] duration-[448ms] ease-[ease]",
            middle && index === active ? "opacity-100" : "opacity-0 [transform:skewX(-5deg)]")}>{title}</span>
          {refunds[index] && <span className="mt-1 block font-sans text-sm leading-6 font-normal tracking-normal not-italic">{refunds[index]}</span>}
        </button>
      </li>; })}
    </ul>
  </nav>;
}

/**
 * The corner (HomeViewDetailsCorner): desktop only, fixed bottom right, in 2 s after load (500 ms): "Open book [+]" (or
 * "Close book [-]" while it is open) and "View details [+]".
 */
function ViewDetails({ href, label, hidden, onOpen, book }: { href: string; label: string; hidden: boolean; onOpen: () => void;
  book?: { label: string; open: boolean; onToggle: () => void } }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setShown(true), 2000); return () => window.clearTimeout(timer); }, []);
  return <div className={cn("fixed right-4 -bottom-0.5 z-20 flex h-[30px] items-center gap-3 pointer-coarse:h-11 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-[900px]:hidden",
    shown && !hidden ? "translate-y-0" : "translate-y-[calc(100%+24px)]")}>
    {book && <>
      <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={book.onToggle}
        className="text-xs uppercase tracking-[-0.02em] transition-opacity hover:opacity-70 pointer-coarse:min-h-11 pointer-coarse:min-w-11">{book.label} {book.open ? "[-]" : "[+]"}</button>
      <span aria-hidden="true" className="text-xs">·</span>
    </>}
    <Link href={href} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey) return; event.preventDefault(); onOpen(); }}
      className="inline-flex items-center text-xs uppercase tracking-[-0.02em] transition-opacity hover:opacity-70 pointer-coarse:min-h-11 pointer-coarse:min-w-11">{label} [+]</Link>
  </div>;
}

/** Their peek pill ("+ Open book +", 06w9:17934-17957): over the open book in the details, at 30 % of the width. */
function OpenBookPill({ label, shown, onHover, onOpen }: { label: string; shown: boolean; onHover: (hovered: boolean) => void; onOpen: () => void }) {
  return <button type="button" tabIndex={shown ? 0 : -1} aria-hidden={!shown} onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}
    onClick={(event) => { event.stopPropagation(); onOpen(); }}
    className={cn("fixed bottom-[14%] left-[30%] z-30 -translate-x-1/2 rounded-full bg-background px-3 py-1.5 text-xs pointer-coarse:min-h-11 uppercase tracking-[-0.02em] text-foreground transition-opacity duration-300 max-[900px]:hidden",
      shown ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}>+ {label} +</button>;
}

/**
 * The details stack (DetailPanelBackdrop + BookDetailPanel, 0ckg:145-205; ReturnToShelfWrap 1imu:851-867): the right
 * 40 % of the page, as tall as the reading scroll, sliding in from the right over 600 ms (out over 300 ms), its text
 * from 5vw over 810 ms; every book's details stand in it at their section tops; the return link ("← All products", as
 * the product page's) stays at its top under the site header; Escape and Back close it too.
 */
function DetailStack({ shown, height, toShelf, onClose, children }: { shown: boolean; height: number; toShelf: string; onClose: () => void;
  children: ReactNode }) {
  return <aside aria-hidden={!shown} inert={!shown} style={{ height }}
    className={cn("absolute top-0 right-0 z-30 w-[40%] rounded-l-[8px] bg-background text-foreground",
      // A phone (0ckg:125-183): full width, under the card and the book (their slot 10099 < card 10200 < canvas 10300), no slide.
      "max-[900px]:z-[1] max-[900px]:w-full max-[900px]:rounded-none max-[900px]:translate-x-0 max-[900px]:transition-opacity max-[900px]:duration-300",
      shown ? "translate-x-0 transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]" : "translate-x-full transition-transform duration-300 ease-[cubic-bezier(0.32,0,0.67,0)] max-[900px]:opacity-0")}>
    <div className={cn("relative h-full transition-transform duration-[810ms] ease-[ease-out] max-[900px]:translate-x-0", shown ? "translate-x-0" : "translate-x-[5vw]")}>
      {/* Under the site header (which overlays the top 72 px), where their 46 px under their own nav would be covered. On a
          phone the link sits in the label's slot instead. */}
      <div className="sticky top-[88px] z-10 px-6 max-[900px]:hidden">
        <button type="button" onClick={onClose}
          className="inline-flex min-h-8 items-center bg-background text-[11px] uppercase pointer-coarse:min-h-11 pointer-coarse:min-w-11 tracking-[0.04em] text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeftIcon aria-hidden="true" className="mr-1.5 size-3.5" />{toShelf}
        </button>
      </div>
      {children}
    </div>
  </aside>;
}

/**
 * One book's details in the stack (BookDetailSlot, 06w9:7348-7366): placed at its section top, 118 px down and 260 px
 * of tail; its content measured (height + 300, theirs) for the reading scroll's sections, and its exit anchor
 * registered: the top of its full-width section (praise, details), when it has one.
 */
function DetailSlot({ index, top, active, onMeasured, anchors, children }: { index: number; top: number;
  /** False for the other products' panels while the run-on is off: measured, but out of reach (inert). */
  active: boolean; onMeasured: (index: number, px: number) => void;
  anchors: { current: Map<number, HTMLElement> }; children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = content.current;
    if (!element) return;
    const anchor = element.querySelector<HTMLElement>("[data-book-exit-anchor]");
    if (anchor) anchors.current.set(index, anchor);
    const report = () => onMeasured(index, Math.round(element.getBoundingClientRect().height + 300));
    report();
    const observer = new ResizeObserver(report);
    observer.observe(element);
    return () => { observer.disconnect(); anchors.current.delete(index); };
  }, [index, onMeasured, anchors]);
  return <div inert={!active} aria-hidden={!active || undefined} className="absolute inset-x-0 top-0 px-6 pt-[118px] pb-[260px] max-[900px]:px-4" style={{ transform: "translateY(" + top + "px)" }}>
    {/* A phone: the details start under a window for the book (MobileBookViewGap, calc(94vh − 185px)), inside the
        measured block, which is at least a screen tall (theirs). */}
    <div ref={content} data-detail-panel-index={index} className="max-[900px]:min-h-[100vh]">
      <div aria-hidden="true" className="hidden h-[calc(94vh-185px)] max-[900px]:block" />
      {children}
    </div>
  </div>;
}
