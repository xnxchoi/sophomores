"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

/**
 * stripe.press's book scene, copied verbatim (owner, 25 Nov: "only copy over the 3D parts verbatim … Dont build webgl
 * stuff from ground up"). Their shipped chunks live in public/vendor/stripe-press with six recorded changes
 * (scripts/stripe-press-vendor/VENDOR-CHANGES.md) and run in their own Turbopack runtime and React copy, beside the
 * site's. This island loads them once, then renders their BookStack (module 76489, export I) into our element; the
 * page (shop-home.tsx, ours) feeds it props and the live scroll ref.
 */
const BASE = "/vendor/stripe-press/", DIR = BASE + "static/immutable/chunks/", RUNTIME = "turbopack-2_04ewhudzrza.js";
const CHUNKS = ["04ud9hjinltfg.js", "0o8wbxikbqj64.js", "02r0qv9ged3vb.js", "14l5yxhvu5ecr.js", "0_xwvg_h93t1m.js", "0al_0m9d4_k3k.js",
  "1hkd3mo7rce98.js", "18l0ksfy0ov6e.js", "12s2cqzsl56ip.js", "3aodgiaju4hkl.js", "29c537hi0sbmc.js", "0bl3vphd9w8zl.js", "3fe65qr7ey8j5.js",
  "248-_vgnwste3.js", "0zqma92wkm7ei.js", "1imu45qukg0dp.js", "0is2w5i_ynjyj.js", "06y4cpdp__u2p.js", "1gsquroxu5z89.js", "0-gkbk5su9wr9.js"];
const TEX = "/assets/three/book/";

type Props = Record<string, unknown>;
type Mounted = { render: (props: Props) => void; unmount: () => void };
type Context = { i: (id: number) => Record<string, unknown> };
let loaded: Promise<(element: HTMLElement) => Mounted> | null = null;

function script(src: string) {
  return new Promise<void>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = src; tag.async = false; tag.onload = () => resolve(); tag.onerror = () => reject(new Error("vendored chunk failed: " + src));
    document.head.appendChild(tag);
  });
}

/** Their runtime, then their chunks, then our one module (990001), which reaches their React, ReactDOM and BookStack. */
function load() {
  loaded ??= (async () => {
    const global = window as unknown as Record<string, unknown>;
    global.SPTURBOPACK_CHUNK_BASE_PATH = BASE;
    await script(DIR + RUNTIME);
    await Promise.all(CHUNKS.map((file) => script(DIR + file)));
    return new Promise<(element: HTMLElement) => Mounted>((resolve) => {
      const queue = global.SPTURBOPACK as { push: (item: unknown) => void };
      const entry = "static/immutable/chunks/sophomores-entry.js";
      queue.push([entry, 990001, (context: Context) => {
        const jsx = context.i(91398) as { jsx: (type: unknown, props: Props) => unknown };
        const dom = context.i(57647) as { createRoot: (element: HTMLElement) => { render: (node: unknown) => void; unmount: () => void } };
        const stack = context.i(76489) as { I: unknown };
        resolve((element) => {
          const root = dom.createRoot(element);
          return { render: (props) => root.render(jsx.jsx(stack.I, props)), unmount: () => root.unmount() };
        });
      }]);
      queue.push([entry, { otherChunks: [], runtimeModuleIds: [990001] }]);
    });
  })();
  return loaded;
}

export type SceneBook = { id: string; title: string; stageArt: string | null };

/** One of our products in their book shape: our placeholder cover and neutral maps (no cover art exists yet). */
function stripeBook({ id, title, stageArt }: SceneBook) {
  const blank = TEX + "shared/blank.png";
  return {
    id, title, author: "", type: "book", shaderType: "sophomores", backgroundColor: "#d9d8d4", chordSku: "",
    pageCount: 240, pageImages: Array.from({ length: 240 }, () => blank), folios: { romanCount: 0, lastFolio: 240 },
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

/**
 * Their scene layer. Their canvas container is fixed over the window (100vw × 100lvh); `isolate` on our element keeps
 * their z-indexes (10050–20200) inside this layer, under the site header.
 */
export function StripeScene({ books, progress, progressRef, active, onOpen, className }: {
  books: SceneBook[]; progress: number; progressRef: RefObject<number>; active: number; onOpen: (index: number) => void; className?: string;
}) {
  const host = useRef<HTMLDivElement>(null), scene = useRef<Mounted | null>(null), open = useRef(onOpen);
  const [ready, setReady] = useState(false);
  const shaped = useMemo(() => books.map(stripeBook), [books]);
  useEffect(() => { open.current = onOpen; }, [onOpen]);
  useEffect(() => {
    let live = true;
    load().then((mount) => { if (live && host.current) { scene.current = mount(host.current); setReady(true); } }, () => undefined);
    return () => { live = false; scene.current?.unmount(); scene.current = null; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    scene.current?.render({
      books: shaped, scrollProgress: progress, scrollProgressLiveRef: progressRef, activeBookIndex: active, stackMode: "browse",
      onBookOpen: (index: number) => open.current(index),
    });
  }, [ready, shaped, progress, progressRef, active]);
  return <div ref={host} aria-hidden="true" className={className} />;
}
