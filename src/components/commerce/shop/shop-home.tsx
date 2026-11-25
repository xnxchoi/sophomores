"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { useTransitionRouter } from "next-transition-router";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/components/core/Link/Link";
import { cn } from "@/lib/utils";
import { lockedProgressFor, StripeScene, useStripeScene, type SceneBook, type Vendored } from "./stripe-scene";
import { useShelfCatch, type ShelfCatchSource } from "./use-shelf-catch";
import { useBookDetail, type BookDetailSource } from "./use-book-detail";

/**
 * The shop's home, rebuilt from stripe.press's home code (06w9 module 43181; .tmp/stripe-notes/home-layout-inventory.md,
 * gap list shop-gap-list.md), their 3D scene verbatim (stripe-scene.tsx). Short: the first few books are featured in a
 * vertical stack, each holding on its art card, then one shelf segment where every book stands spine out in a row that
 * only horizontal input moves (their gesture router); vertical scroll passes on. As theirs: the scroll height is
 * computed from their segment extents, scroll maps to progress through their `scrollYToProgress` and `lockedProgressFor`,
 * the scene reads live refs written on every scroll, and React state changes only at thresholds.
 */
const FEATURED_MAX = 4, CARD_GAP = 16, CARD_INSET_BOTTOM = 8;

type Item = { id: string; title: string; price: string; href: string; stageArt: { url: string; alt?: string | null } | null;
  /** The book's details column (server-rendered: ProductInfo + ProductExtras), shown when it opens in the scene. */
  details?: ReactNode };
type Labels = { featured: string; shelf: string; viewDetails: string; toShelf: string };
type Geometry = { lvh: number; mobile: boolean; top: number; height: number; offset: number; extents: number[];
  starts: number[]; lock: number[]; total: number };

export function ShopHome({ items, labels, initialOpen }: { items: Item[]; labels: Labels;
  /** The product whose address the page was loaded on: it opens in place once the scene is ready. */
  initialOpen?: string }) {
  const books = useMemo<SceneBook[]>(() => items.map(({ id, title, stageArt }) => ({ id, title, stageArt: stageArt?.url ?? null })), [items]);
  const vendored = useStripeScene(books, Math.min(FEATURED_MAX, items.length));
  const first = items[0]?.stageArt;
  // Native wheel scrolling here, as on stripe.press: their scroll mapping, holds and shelf catch read the browser's own
  // scroll, and the site's Lenis smoothing would keep driving the page through the shelf's catch.
  return <section data-lenis-prevent-wheel aria-label={labels.featured} className="relative min-h-svh">
    {vendored && items.length > 0 ? <Home vendored={vendored} items={items} labels={labels} initialOpen={initialOpen} /> : first && (
      // The first card where theirs lands (162 px down, 16 px in, 24 px off the bottom) until their code is running.
      <div className="pointer-events-none fixed inset-x-4 top-[162px] bottom-6 z-0 overflow-hidden rounded-[8px] bg-muted max-[899px]:inset-x-2 max-[899px]:top-[140px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={first.url} alt={first.alt ?? ""} draggable={false} className="absolute inset-0 size-full object-cover" />
      </div>)}
    {/* Every book reachable without the scene (their hidden keyboard listbox of every book). */}
    <ul className="sr-only">{items.map((entry) => <li key={entry.id}><Link href={entry.href}>{entry.title} {entry.price}</Link></li>)}</ul>
  </section>;
}

function Home({ vendored, items, labels, initialOpen }: { vendored: Vendored; items: Item[]; labels: Labels; initialOpen?: string }) {
  const { hub, scroll, catalogue, router, seats, motion: tokens } = vendored;
  const navigate = useTransitionRouter();
  const count = items.length, J = catalogue.J, K = catalogue.K;

  // Canvas geometry and segment extents (06w9:11476-11503, 11634-11667): the card starts where the title rail ends,
  // each featured book gets a canvas height plus its 150 px hold (the last one 0.67 canvas more), the shelf 1.67 canvas
  // heights on desktop (2.3–3.8 on a phone), and every later book 1 px.
  const measure = (): Geometry => {
    const width = scroll.X(), lvh = scroll.C(), mobile = width < 900, top = scroll.p(width), height = scroll.$(lvh, top);
    const offset = (top + height / 2 - Math.max(1, lvh) / 2) / Math.max(1, lvh);
    const shelfScreens = mobile ? Math.max(2.3, Math.min(3.8, 2.3 + ((lvh - 650) / 350) * 1.2)) : 1.67;
    const lock = Array.from({ length: catalogue.t }, (_, index) => 150 + (index === J ? Math.round(0.67 * height) : 0));
    const extents = catalogue.F(count, height, lock, shelfScreens), starts = scroll.e(extents);
    return { lvh, mobile, top, height, offset, extents, starts, lock, total: extents.reduce((sum, value) => sum + value, 0) };
  };
  const [geometry, setGeometry] = useState<Geometry>(measure);
  const geo = useRef(geometry);
  useEffect(() => { geo.current = geometry; }, [geometry]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => scroll.d(() => setGeometry(measure())), [scroll]);

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
  // refs; React only hears the locked index (±0.65 hysteresis, then a 200 ms debounce), whether the shelf is up, and,
  // 100 ms after the scroll settles, the committed progress.
  // Loaded on a product's address (desktop): the scene's first frame already has that book open at its own index, as
  // theirs opens the deep link before its scene mounts (06w9:15177-15183); otherwise it would ease into the detail pose.
  const [landing, setLanding] = useState(() => {
    const index = initialOpen && window.innerWidth >= 900 ? items.findIndex((entry) => entry.id === initialOpen && entry.details) : -1;
    if (index >= 0) {
      hub.scrollProgressDirectLiveRef.current = index; hub.spineViewProgressLiveRef.current = hub.spineViewProgressFor(index);
      hub.backgroundSnapScrollLiveRef.current = 6; hub.bookRowSeedLiveRef.current = 3;
    }
    return index >= 0 ? index : null;
  });
  const progressRef = useRef(landing ?? 0);
  // True while a book is open: the page holds still, so the scroll reader, the idle advance and the shelf catch stand
  // down and the scene keeps the progress the detail pinned (theirs: readScroll and the idle timer skip detail).
  const held = useRef(landing != null);
  const [committed, setCommitted] = useState(landing ?? 0), [active, setActive] = useState(landing ?? 0), [onShelf, setOnShelf] = useState(false);
  const listeners = useRef(new Set<() => void>());
  useEffect(() => {
    let settle = 0, debounce = 0, index = 0;
    const read = () => {
      if (held.current) return;
      const { extents, height, lock, offset } = geo.current;
      const raw = scroll.m(window.scrollY, extents);
      const locked = lockedProgressFor(raw, { bookScrollExtentsPx: extents, canvasHeightPx: height, browseLockScrollPx: lock, canvasCenterOffset: offset }, catalogue);
      progressRef.current = locked;
      hub.scrollProgressDirectLiveRef.current = raw;
      hub.spineViewProgressLiveRef.current = hub.spineViewProgressFor(raw);
      listeners.current.forEach((listener) => listener());
      const centred = locked - offset;
      if (Math.abs(centred - index) > 0.65) index = Math.round(centred);
      const book = catalogue.a(index), next = book == null ? J : Math.max(0, Math.min(count - 1, book));
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

  // Their shelf catch and the titles' clear line (use-shelf-catch.ts).
  const titles = useRef<HTMLElement>(null);
  const catchSource = useRef<ShelfCatchSource>({ seatY: () => null, driving: () => false, stopDriving: () => undefined, titles: () => null, held: () => false });
  useEffect(() => { catchSource.current = { seatY, driving: () => drive.current.active, stopDriving, titles: () => titles.current, held: () => held.current }; });
  useShelfCatch(hub, catalogue, catchSource);

  // Opening a book into its details inside the scene (use-book-detail.ts); the phone keeps the product page for now.
  const detailSource = useRef<BookDetailSource>({ rawProgress: () => 0, hrefOf: () => null, home: "/shop", placeOf: () => 0, shelfAt: () => null,
    pin: () => undefined, unpin: () => undefined });
  useEffect(() => { detailSource.current = { rawProgress: () => hub.scrollProgressDirectLiveRef.current as number,
    hrefOf: (index) => items[index]?.href ?? null, home: "/shop", placeOf: bookY, shelfAt: seatY,
    // The scene poses an open book by the progress in its details: at the open book's own index, the top of them. As
    // theirs (06w9:15271-15273), the scene's row smoother snaps to it (snap 6 frames, row seed 3) instead of easing
    // through the stack between the shelf and the book's own place.
    pin: (index) => {
      held.current = true; stopDriving();
      progressRef.current = index; hub.scrollProgressDirectLiveRef.current = index;
      hub.spineViewProgressLiveRef.current = hub.spineViewProgressFor(index); setCommitted(index);
      hub.backgroundSnapScrollLiveRef.current = 6; hub.bookRowSeedLiveRef.current = 3;
    },
    // Back to the page's own scroll (it held still while open), snapped the same way (their restore, 15284-15286).
    unpin: () => {
      held.current = false;
      hub.backgroundSnapScrollLiveRef.current = 6; hub.bookRowSeedLiveRef.current = 6;
      window.dispatchEvent(new Event("scroll"));
    } }; });
  const detail = useBookDetail(hub, catalogue, router, tokens, detailSource);
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

  // Idle auto-advance (06w9:14528-14582): 1.5 s after mount, then after every 3 s of stillness, one book down (1 s;
  // 1.83 s into the shelf), until the visitor does anything at all.
  useEffect(() => {
    let timer = 0, stopped = false;
    const stop = () => { stopped = true; window.clearTimeout(timer); };
    const arm = (delay: number) => {
      timer = window.setTimeout(() => {
        if (stopped) return;
        if (held.current) { arm(3000); return; }
        const index = catalogue.a(Math.round(hub.scrollProgressDirectLiveRef.current as number));
        if (index == null || index >= catalogue.t) return;
        const move = motion.current;
        if (index >= J) move.scrollTo(move.shelfY(), 1833); else move.scrollTo(move.bookY(index + 1), 1000);
        arm(1833 + 3000);
      }, delay);
    };
    arm(1500 + 3000);
    const events = ["wheel", "touchmove", "pointerdown", "keydown"] as const;
    events.forEach((event) => window.addEventListener(event, stop, { passive: true }));
    return () => { stop(); events.forEach((event) => window.removeEventListener(event, stop)); };
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
      horizontal: (step: number) => { if (step === 1) open(activeRef.current); },
      vertical: (step: number) => {
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
  const sceneProps = useMemo(() => ({ skipIntro,
    books: (window as unknown as { __SPBOOKS: unknown }).__SPBOOKS, scrollProgress: committed, scrollProgressLiveRef: progressRef,
    activeBookIndex: active, stackMode: "browse", onBookOpen: (index: number) => openRef.current(index),
    isDetailOpen: (detail.open ?? landing) != null, detailBookIndex: detail.open ?? landing ?? -1,
  }), [skipIntro, committed, active, detail.open, landing]);

  // The spine row seats against, and lifts out ahead of, the section after the shelf (their #home-section-films, read
  // through homeWebsitesSectionElLiveRef); without one the scene treats the row as already gone. As theirs, the content
  // layer begins ~0.81 of a screen before the stack's scroll ends (729 px at 900 tall), with their transparent books box
  // (171.1vh − 40px) before the next section.
  const next = useRef<HTMLDivElement>(null);
  useEffect(() => { hub.homeWebsitesSectionElLiveRef.current = next.current; return () => { hub.homeWebsitesSectionElLiveRef.current = null; }; }, [hub]);

  // On the shelf the rail names the selected spine (their rail follows the spine selection there).
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    if (!onShelf) { setSelected(null); return; }
    let frame = 0;
    const follow = () => {
      const to = (hub.spineSelectionLiveRef.current as { to?: number } | null)?.to;
      if (typeof to === "number") setSelected(to);
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [onShelf, hub]);

  const item = items[active] ?? items[0];
  return <div>
    <div style={{ height: Math.max(0, geometry.total - Math.round(0.81 * geometry.lvh)) }} />
    <div aria-hidden="true" className="pointer-events-none h-[calc(171.1lvh-40px)]" />
    <div ref={next} aria-hidden="true" className="h-[40lvh]" />
    <Cards items={items} featured={catalogue.t} geometry={geometry} progressRef={progressRef} listeners={listeners} J={J} />
    <StripeScene vendored={vendored} props={sceneProps} className="pointer-events-none fixed inset-0 isolate z-10" />
    <p className="fixed top-[3.75rem] left-4 z-20 text-[11px] uppercase leading-4 tracking-[0.06em] text-muted-foreground">
      [ {onShelf ? labels.shelf : labels.featured} ]
    </p>
    <TitleRail railRef={titles} titles={items.map((entry) => entry.title)} active={detail.open ?? selected ?? active}
      fade={detail.open != null ? 0 : Math.max(0, Math.min(1, (committed - K - 0.2) / 0.3))} detail={detail.open != null && !detail.leaving}
      onPick={(index) => detail.open != null ? openRef.current(index) : index < catalogue.t ? scrollTo(bookY(index), 1000) : scrollTo(shelfY(), 1833)} />
    {item && <ViewDetails href={item.href} label={labels.viewDetails} hidden={onShelf || detail.open != null} onOpen={() => openRef.current(active)} />}
    <DetailColumn open={detail.open != null && !detail.leaving} toShelf={labels.toShelf} onClose={() => detail.closeBook()}>
      {detail.open != null && items[detail.open]?.details}
    </DetailColumn>
  </div>;
}

/**
 * The art cards (BackgroundScene, 1jyk:291-622): one canvas-sized card per featured book in a column, 16 px apart (8 on
 * a phone), sliding with the locked progress, so a book's hold is its card's pause; the photo counter-moves 70 % and
 * zooms to ~1.06 one book away; the last card lifts out as the shelf arrives. Written per scroll, outside React.
 */
function Cards({ items, featured, geometry, progressRef, listeners, J }: { items: Item[]; featured: number; geometry: Geometry;
  progressRef: { current: number }; listeners: { current: Set<() => void> }; J: number }) {
  const plates = useRef<(HTMLDivElement | null)[]>([]), photos = useRef<(HTMLImageElement | null)[]>([]);
  const [shown, setShown] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setShown(true), 50); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    const { height, mobile } = geometry, gap = mobile ? 8 : CARD_GAP, set = listeners.current;
    const write = () => {
      const locked = progressRef.current;
      for (let index = 0; index < featured; index += 1) {
        const plate = plates.current[index], photo = photos.current[index];
        if (!plate) continue;
        const lift = index === J ? 1.25 * height * Math.max(0, Math.min(1, (locked - J) / (0.35 / 0.6))) : 0;
        const y = (index - locked) * (height + gap) - lift;
        plate.style.transform = "translate3d(0," + y + "px,0)";
        const c = Math.max(0, Math.min(1, (locked - index + 1) / 2)), e = (0.48 * (1 + Math.cos(2 * Math.PI * c))) / 2;
        if (photo) photo.style.transform = "translate3d(0," + -0.7 * y + "px,0) scale(" + 1 / (0.5 / 2 ** (0.38 * e) + 0.5) + ")";
      }
    };
    write();
    set.add(write);
    return () => { set.delete(write); };
  }, [geometry, featured, progressRef, listeners, J]);
  return <div aria-hidden="true" style={{ top: geometry.top, height: geometry.height - CARD_INSET_BOTTOM }}
    className="pointer-events-none fixed inset-x-4 z-0 overflow-hidden rounded-[8px] max-[899px]:inset-x-2">
    {items.slice(0, featured).map((entry, index) => <div key={entry.id} ref={(plate) => { plates.current[index] = plate; }}
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
 * The title rail (FeaturedTitleList, 21ix): fixed at 70 px (63 on a phone), every title (three times over) in one line, the active one
 * upright and centred at 47.5 % of the width (500 ms ease-in-out), the rest italic at 0.8; "(Hardcover)" above each
 * title's end; the titles fade in 1.2 s after load and fade out as the shelf takes the screen.
 */
function TitleRail({ railRef, titles, active, fade, detail, onPick }: { railRef: Ref<HTMLElement>; titles: string[]; active: number; fade: number;
  detail: boolean; onPick: (index: number) => void }) {
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [shift, setShift] = useState(0), [shown, setShown] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setShown(true), 1200); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    const place = () => {
      const item = items.current[titles.length + active];
      // Centred at 47.5vw, or 27.5vw over the shifted scene while a book is open (their centerOffsetVw −20).
      if (item) setShift((detail ? 0.275 : 0.475) * window.innerWidth - 20 - (item.offsetLeft + item.offsetWidth / 2));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active, titles, detail]);
  return <nav ref={railRef} aria-label="Titles" style={{ opacity: shown ? 1 - 2 * fade : 0 }}
    className={cn("pointer-events-none fixed inset-x-0 top-[70px] z-20 overflow-hidden px-5 pt-5 pb-3 transition-[opacity,clip-path] duration-[1600ms] max-[899px]:top-[63px]",
      detail ? "[clip-path:inset(0_40%_0_0)] [transition-duration:1600ms,600ms] [transition-timing-function:ease,cubic-bezier(0.16,1,0.3,1)]" : "[clip-path:inset(0_0_0_0)]")}>
    <ul style={{ transform: "translateX(" + shift + "px)" }}
      className="flex w-max gap-x-[72px] transition-transform duration-500 ease-in-out max-[899px]:gap-x-[30px]">
      {/* Three copies, the middle one active, so the active title always has neighbours on both sides (theirs: 21ix). */}
      {[...titles, ...titles, ...titles].map((title, slot) => { const index = slot % titles.length, middle = slot >= titles.length && slot < 2 * titles.length;
        return <li key={slot} aria-hidden={middle ? undefined : true}>
        <button ref={(item) => { items.current[slot] = item; }} type="button" tabIndex={middle ? undefined : -1} onClick={() => onPick(index)}
          className="pointer-events-auto relative font-display text-[length:calc(40px+16*(100vw-375px)/1353)] leading-[1.12] font-medium tracking-[-0.1rem] whitespace-nowrap text-foreground outline-offset-4 focus-visible:outline-2 max-[899px]:text-[length:calc(44px+17.6*(100vw-375px)/1353)]">
          <span className={cn("block origin-[0_78%] italic transition-[opacity,transform] duration-[448ms] ease-[ease]",
            middle && index === active ? "opacity-0 [transform:skewX(9deg)]" : "opacity-80")}>{title}</span>
          <span className={cn("absolute inset-0 not-italic transition-[opacity,transform] duration-[448ms] ease-[ease]",
            middle && index === active ? "opacity-100" : "opacity-0 [transform:skewX(-5deg)]")}>{title}</span>
          <span className="absolute -top-[18px] right-0 translate-x-[calc(100%+8px)] text-[11px] font-normal tracking-normal not-italic text-muted-foreground max-[899px]:hidden">(Hardcover)</span>
        </button>
      </li>; })}
    </ul>
  </nav>;
}

/** The corner link (HomeViewDetailsCorner): desktop only, fixed bottom right, in 2 s after load (500 ms). */
function ViewDetails({ href, label, hidden, onOpen }: { href: string; label: string; hidden: boolean; onOpen: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setShown(true), 2000); return () => window.clearTimeout(timer); }, []);
  return <div className={cn("fixed right-4 -bottom-0.5 z-20 flex h-[30px] items-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-[899px]:hidden",
    shown && !hidden ? "translate-y-0" : "translate-y-[calc(100%+24px)]")}>
    <Link href={href} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey) return; event.preventDefault(); onOpen(); }}
      className="text-xs uppercase tracking-[-0.02em] transition-opacity hover:opacity-70">{label} [+]</Link>
  </div>;
}

/**
 * The details column (DetailPanelBackdrop + BookDetailPanel, 0ckg:145-205; ReturnToShelfWrap 1imu:851-867): the right
 * 40 %, sliding in from the right over 600 ms (out over 300 ms), its text from 5vw over 810 ms; the return link
 * ("← All products", as the product page's) at its top; Escape and Back close it too. It scrolls on its own while the scene holds the book (their stacked panels for every book are slice C).
 */
function DetailColumn({ open, toShelf, onClose, children }: { open: boolean; toShelf: string; onClose: () => void; children: ReactNode }) {
  return <aside aria-hidden={!open} inert={!open} data-lenis-prevent
    className={cn("fixed inset-y-0 right-0 z-30 w-[40%] overflow-y-auto overscroll-contain rounded-l-[8px] bg-background text-foreground max-[899px]:hidden",
      open ? "translate-x-0 transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]" : "translate-x-full transition-transform duration-300 ease-[cubic-bezier(0.32,0,0.67,0)]")}>
    {/* The return link sits under the site header (which overlays the top 72 px), where their 46 px under their own nav
        would be covered; the content still starts about 150 px down, as theirs. */}
    <div className={cn("px-6 pt-[88px] pb-[260px] transition-transform duration-[810ms] ease-out", open ? "translate-x-0" : "translate-x-[5vw]")}>
      <button type="button" onClick={onClose}
        className="mb-[30px] inline-flex min-h-8 items-center text-[11px] uppercase tracking-[0.04em] text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeftIcon aria-hidden="true" className="mr-1.5 size-3.5" />{toShelf}
      </button>
      {children}
    </div>
  </aside>;
}
