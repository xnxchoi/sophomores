"use client";
// Three objects, shader uniforms and the physics refs are live GPU and frame state, not React state: frames and pointer
// handlers change them in place (as menu-gradient.tsx does for its uniforms).
/* eslint-disable react-hooks/immutability */

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  Box3,
  BoxGeometry,
  CanvasTexture,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type Texture
} from "three";
import { useBookSound, type BookSamples } from "./book-sound";
import { createLookState, LEAVES, LookInside, stepLookTimeline, type Ink, type LookState } from "./look-inside";

/**
 * The texture slots (README.md in this folder lists names, sizes and the atlas layout). Every cover slot uses one
 * 1920×1600 atlas: back cover · spine · front cover across the top 79%, page edges along the bottom strip.
 */
export type BookTextures = {
  coverDiffuse?: string;
  coverBumpBase?: string;
  coverBumpCustom?: string;
  coverFoil?: string;
  coverGloss?: string;
  coverGlitter?: string;
};

/** What the page tells the book, read every frame (no re-render): scroll progress, hover effects, add-to-cart spins. */
export type BookSignals = {
  scroll: number; hologram: boolean; radio: boolean; spins: number[]; look: boolean; peek: boolean;
  /** Look inside control bar: page turns waiting to run. */
  commands: ("back" | "forward")[];
  /** Touch zoom and pan of the open book (#27); unitsPerPx is written by the book for the gesture's maths. */
  view: { zoom: number; x: number; y: number; panning: boolean; unitsPerPx: number;
    /** A phone reads one page at a time: how far the view pans either way to centre a page (0 when it shows the spread). */
    reachX: number };
  /** Highlighter ink while it's on (#28). */
  marker: null | Ink;
  /**
   * The book's hit area (stripe.press's hit-rect): the View's own element, the only one that takes the pointer. It spans
   * the stage; the book clips its hit-testing to its own projected bounds each frame (clip-path), or to none while Look
   * inside is open. Its events then target the View's element, which drei's View needs to raycast.
   */
  hitRect: HTMLElement | null;
  /** Asks the canvas for a frame (on-demand rendering); the book writes it, the stage calls it on scroll, effects, theme. */
  invalidate: (() => void) | null;
  /** How far the closed book has left through the top as the page's full-width sections arrive (0 at rest, 1 gone):
   *  stripe.press's detail-scroll rule (TEARDOWN §7), measured by the stage. */
  exit: number;
  /** The pointer over the whole viewport in device coordinates (mouse and pen only), for the closed book's tilt. */
  pointer: { x: number; y: number };
  /** The stage's DOM layer above the shared canvas; the book writes its on-screen centre there (--book-x, --book-y). */
  overlay: HTMLElement | null;
  /** Told when the closed book has fully left its view (the scroll exit) or comes back, so its controls follow it. */
  onGone: ((gone: boolean) => void) | null;
  /** Told the open spread (leaves on the left) once the book has opened and on every turn, and null as it closes: the
   *  control bar shows while reading and reads its page numbers from it. */
  onReading: ((reading: { spread: number; leaves: number; shown: boolean } | null) => void) | null;
  /** The stage's rect in the View's pixels (the View spans the window): the camera is framed on it. */
  frame: { left: number; top: number; width: number; height: number } | null;
  /** The open spread's rect in the View's pixels (Look inside writes it): the open book's hit area. */
  spreadRect: { left: number; top: number; right: number; bottom: number } | null;
};

const hitBox = new Box3(), hitPart = new Box3(), hitCorner = new Vector3();
/** Clip the hit area to the book's on-screen bounds (padded 6%; the open spread padded 24 px), writing to the DOM only
 *  when it moved a pixel. */
function fitHitRect(element: HTMLElement, overlay: HTMLElement | null, root: Group, camera: PerspectiveCamera, width: number, height: number, spread: BookSignals["spreadRect"], onGone: ((gone: boolean) => void) | null) {
  let box = "0,0," + width + "," + height;
  const full = Boolean(spread);
  if (spread) box = [Math.round(spread.left - 24), Math.round(spread.top - 24), Math.round(spread.right - spread.left + 48), Math.round(spread.bottom - spread.top + 48)].join(",");
  else {
    // Visible meshes only: the closed book's hidden parts (Look inside's leaves and its double-width hit plane) don't count.
    hitBox.makeEmpty();
    root.traverseVisible((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) hitBox.union(hitPart.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld));
    });
    if (hitBox.isEmpty()) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      hitCorner.set(i & 1 ? hitBox.max.x : hitBox.min.x, i & 2 ? hitBox.max.y : hitBox.min.y, i & 4 ? hitBox.max.z : hitBox.min.z).project(camera);
      const x = (hitCorner.x + 1) / 2 * width, y = (1 - hitCorner.y) / 2 * height;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const padX = (maxX - minX) * 0.06, padY = (maxY - minY) * 0.06;
    box = [Math.round(minX - padX), Math.round(minY - padY), Math.round(maxX - minX + 2 * padX), Math.round(maxY - minY + 2 * padY)].join(",");
  }
  if (element.dataset.box === box) return;
  element.dataset.box = box;
  if (overlay) {
    const [x, y, w, h] = box.split(",").map(Number);
    overlay.style.setProperty("--book-x", x + w / 2 + "px"); overlay.style.setProperty("--book-y", y + h / 2 + "px");
  }
  const [left, top, w, h] = box.split(",").map(Number);
  // Gone: the whole book is outside its view (it has left through the top on the scroll exit).
  const gone = !full && (top + h <= 0 || top >= height);
  if (element.dataset.gone !== String(gone)) { element.dataset.gone = String(gone); onGone?.(gone); }
  element.style.clipPath = full ? "none" : `inset(${top}px ${width - left - w}px ${height - top - h}px ${left}px)`;
}

// Proportions from the atlas: each cover 826×1264 px, the spine 224 px. World units; the camera sees 17.1 units tall.
const H = 11, W = H * (826 / 1264), BOARD = 0.08, T = W * (224 / 826) - 2 * BOARD, SEGMENTS = 5, SEG = W / SEGMENTS;
// Atlas regions (u across, v up): back 0–0.455, spine 0.455–0.57, front 0.57–1; covers from v 0.21 to 1.
const V0 = 0.21, BACK_U1 = 0.455, FRONT_U0 = 0.57, BLANK: [number, number] = [0.05, 0.12];
// The main hinge takes most of an opening; the four board segments flex a little each (stripe.press's 5-part boards).
const SHARE = [0.6, 0.1, 0.1, 0.1, 0.1];
// stripe.press constants (map §C1). Rates are per 60 fps frame unless named per second.
const DRAG_RATE = 0.01125, MOUSE_MUL = 0.75, FLING_MAX = 0.42, FLING_DECAY = 0.95, TOUCH_PITCH_ARM_PX = 10;
const CLICK_PX = 5, CLICK_MS = 500, FLAP_GAIN = 0.037, FLAP_MAX = 0.35 * MathUtils.degToRad(80), FLAP_K = 40;
const PEEK = MathUtils.degToRad(5), PEEK_EASE = 0.075, REST_YAW = 0.36;
// The closed book's framing, as stripe.press sets it on the art: large and on a diagonal, its lower corner at the
// stage's lower edge. At z 0 the camera sees 17.1 units, so the turned book (about 13.2 tall, 11.9 wide) stays whole
// on a 4:5 phone stage and on the wide desktop one (r3 shots: z 12 cropped it on every side). The open pose is as before.
// The closed book stands upright, turned a little to show its spine (stripe.press's detail book), filling most of the
// stage's height.
const REST_PITCH = -0.12, REST_ROLL = -0.04, CLOSED_X = 0.2, CLOSED_Y = -0.2, CLOSED_Z = 10;
// Look inside pose (map §C2 #16): tilted back 22° (12.5° on touch); pointer height adds up to +10° / −12°.
const OPEN_TILT = MathUtils.degToRad(22), OPEN_TILT_TOUCH = MathUtils.degToRad(12.5), POINTER_UP = MathUtils.degToRad(10), POINTER_DOWN = MathUtils.degToRad(12);

/** The page you left the book at, or the middle of the book (stripe.press opens its preview mid-book). */
function readSavedSpread(key?: string) {
  const middle = Math.round(LEAVES / 2);
  if (!key) return middle;
  try { const saved = window.sessionStorage.getItem(key); return saved === null ? middle : Number(saved) || 0; } catch { return middle; }
}

type Face = "front" | "back" | "spine" | "pages";

/** Box with atlas UVs on its printed face; every other face samples a blank corner of the atlas. */
function atlasBox(face: Face, w: number, h: number, d: number, segment = 0) {
  const g = new BoxGeometry(w, h, d, face === "pages" ? 1 : 8, face === "pages" ? 1 : 24, 1);
  if (face === "front") g.translate(w / 2, 0, d / 2);
  if (face === "back") g.translate(w / 2, 0, -d / 2);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
    const v = V0 + (1 - V0) * (y + H / 2) / H;
    let u: [number, number] = BLANK;
    if (face === "front" && nz > 0.5) u = [FRONT_U0 + (1 - FRONT_U0) * (segment * SEG + x) / W, v];
    if (face === "back" && nz < -0.5) u = [BACK_U1 * (1 - (segment * SEG + x) / W), v];
    if (face === "spine" && nx < -0.5) u = [BACK_U1 + (FRONT_U0 - BACK_U1) * (z + d / 2) / d, v];
    // Page edges: the fore edge and the head/tail take the two long strips at the bottom of the atlas.
    if (face === "pages" && nx > 0.5) u = [0.575 + 0.425 * (y + h / 2) / h, 0.1 * (z + d / 2) / d];
    if (face === "pages" && Math.abs(ny) > 0.5) u = [0.15 + 0.42 * (x + w / 2) / w, 0.1 * (z + d / 2) / d];
    uv.setXY(i, u[0], u[1]);
  }
  return g;
}

/** Base grain and the emboss in one bump map (stripe.press weights them with bumpScaleBase/Custom in its shader). */
function combineBump(base?: Texture, custom?: Texture, small = false) {
  const images = [base, custom].map((t) => t?.image as HTMLImageElement | undefined);
  if (!images[0] && !images[1]) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = small ? 960 : 1920; canvas.height = small ? 800 : 1600;
  const c = canvas.getContext("2d");
  if (!c) return base ?? custom;
  c.fillStyle = "#000"; c.fillRect(0, 0, canvas.width, canvas.height);
  c.globalCompositeOperation = "lighter";
  ([[images[0], 0.55], [images[1], 0.6]] as const).forEach(([image, alpha]) => {
    if (!image) return;
    c.globalAlpha = alpha; c.drawImage(image, 0, 0, canvas.width, canvas.height);
  });
  return new CanvasTexture(canvas);
}

/** Uniforms the injected shader reads: hologram (Ebook-style hover), radio ripple (Audiobook-style), foil, glitter. */
function createUniforms() {
  return {
    uTime: { value: 0 }, uHolo: { value: 0 }, uHoloMouse: { value: new Vector2() }, uRadio: { value: 0 },
    uRadioCenter: { value: new Vector2(0.78, 0.6) }, uFoilMask: { value: null as Texture | null }, uHasFoil: { value: 0 },
    uGlitterMap: { value: null as Texture | null }, uGlitterOpacity: { value: 0 }, uGlitterRepeat: { value: 14 }
  };
}

/** The cover material: three's physical material (light, bump, foil iridescence, gloss) plus the effects stripe.press layers on. */
function createCoverMaterial(maps: Record<string, Texture | undefined>, uniforms: ReturnType<typeof createUniforms>, small: boolean) {
  const material = new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0, bumpScale: 0.6 });
  if (maps.coverDiffuse) { maps.coverDiffuse.colorSpace = SRGBColorSpace; material.map = maps.coverDiffuse; }
  material.bumpMap = combineBump(maps.coverBumpBase, maps.coverBumpCustom, small) ?? null;
  if (maps.coverFoil) {
    material.iridescence = 1; material.iridescenceMap = maps.coverFoil; material.iridescenceIOR = 1.6;
    material.metalness = 1; material.metalnessMap = maps.coverFoil;
    uniforms.uFoilMask.value = maps.coverFoil; uniforms.uHasFoil.value = 1;
  }
  if (maps.coverGloss) { material.clearcoat = 1; material.clearcoatMap = maps.coverGloss; }
  if (maps.coverGlitter) {
    maps.coverGlitter.wrapS = maps.coverGlitter.wrapT = RepeatWrapping;
    uniforms.uGlitterMap.value = maps.coverGlitter; uniforms.uGlitterOpacity.value = 0.12;
  }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime, uRadio;\nuniform vec2 uRadioCenter;\nvarying vec2 vBookUv;")
      // Radio: rings spread from a point on the front cover, tilting the normal so the light ripples too.
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
        vec2 radioDir = uv - uRadioCenter; float radioD = length(radioDir);
        float radioPhase = radioD * 69.8 - uTime * 1.53 * 6.2831853;
        float radioFall = exp(-radioD * 4.0) * uRadio * 0.32;
        float radioWave = sin(radioPhase) * radioFall;
        objectNormal.xy -= normalize(radioDir + 1e-5) * cos(radioPhase) * radioFall * 0.5;`)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBookUv = uv;\ntransformed += normal * radioWave * 0.12;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uTime, uHolo, uHasFoil, uGlitterOpacity, uGlitterRepeat;
        uniform vec2 uHoloMouse;
        uniform sampler2D uFoilMask, uGlitterMap;
        varying vec2 vBookUv;`)
      // Hologram's chromatic split follows the mouse.
      .replace("#include <map_fragment>", `#include <map_fragment>
        #ifdef USE_MAP
          vec2 holoShift = uHoloMouse * 0.0147 * uHolo;
          diffuseColor.r = mix(diffuseColor.r, texture2D(map, vMapUv + holoShift).r, uHolo);
          diffuseColor.b = mix(diffuseColor.b, texture2D(map, vMapUv - holoShift).b, uHolo);
        #endif`)
      // Foil reads as polished metal.
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.16, uHasFoil * texture2D(uFoilMask, vBookUv).r);")
      .replace("#include <opaque_fragment>", `
        float glint = texture2D(uGlitterMap, vBookUv * uGlitterRepeat).r;
        outgoingLight += uGlitterOpacity * pow(glint, 4.0) * (0.5 + 0.5 * sin(uTime * 3.0 + glint * 40.0));
        float scan = 0.5 + 0.5 * sin(vBookUv.y * 817.0 + uTime * 10.0);
        outgoingLight = mix(outgoingLight, outgoingLight * (0.7 + 0.6 * scan) + 0.12, uHolo);
        #include <opaque_fragment>`);
  };
  return material;
}

/** The closed book's size in world units: cover width, height, and depth across the boards (what a spine shows). */
export const BOOK_SIZE = { width: W, height: H, depth: T + 2 * BOARD };

/**
 * A closed book alone: the same atlas, cover material and proportions as Book, with no physics, pages or Look inside.
 * The shop's shelf draws these (shelf-canvas.tsx). Centred like Book's body: the spine on the left (−x), front cover +z.
 */
export function ClosedBook({ textures, small }: { textures: BookTextures; small: boolean }) {
  const slots = useMemo(() => Object.fromEntries(Object.entries(textures).filter(([, url]) => url)) as Record<string, string>, [textures]);
  const maps = useTexture(slots) as unknown as Record<string, Texture>;
  const uniforms = useMemo(() => createUniforms(), []);
  const material = useMemo(() => createCoverMaterial(maps, uniforms, small), [maps, uniforms, small]);
  const geometry = useMemo(() => ({
    front: atlasBox("front", W, H, BOARD), back: atlasBox("back", W, H, BOARD),
    spine: atlasBox("spine", BOARD, H, T + 2 * BOARD), pages: atlasBox("pages", W - 0.15, H - 0.3, T)
  }), []);
  useEffect(() => () => { material.bumpMap?.dispose(); material.dispose(); Object.values(geometry).forEach((g) => g.dispose()); }, [geometry, material]);
  return <group>
    <mesh geometry={geometry.spine} material={material} position={[-W / 2 - BOARD / 2, 0, 0]} castShadow />
    <mesh geometry={geometry.pages} material={material} position={[-0.075, 0, 0]} castShadow />
    <mesh geometry={geometry.front} material={material} position={[-W / 2, 0, T / 2]} castShadow />
    <mesh geometry={geometry.back} material={material} position={[-W / 2, 0, -T / 2]} castShadow />
  </group>;
}

/** A five-segment board: each segment hangs off the previous one's far edge, so the board can swing and flex. */
function Board({ geometries, segments, meshes, material, k = 0 }: { geometries: BoxGeometry[]; segments: RefObject<(Group | null)[]>; meshes: RefObject<(Mesh | null)[]>; material: MeshPhysicalMaterial; k?: number }) {
  if (k >= geometries.length) return null;
  return <group ref={(group) => { segments.current[k] = group; }} position={[k === 0 ? 0 : SEG, 0, 0]}>
    <mesh ref={(mesh) => { meshes.current[k] = mesh; }} geometry={geometries[k]} material={material} castShadow />
    <Board geometries={geometries} segments={segments} meshes={meshes} material={material} k={k + 1} />
  </group>;
}

const smoothstep = (x: number) => x * x * (3 - 2 * x);
const smootherstep = (x: number) => x * x * x * (x * (6 * x - 15) + 10);
const easeInOutQuint = (x: number) => x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2;
export const easeInOutQuad = (x: number) => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;

/**
 * The closed book and everything you can do to it (map §C1): drag to turn and fling, pitch easing home, covers that
 * swing open with spin and spring shut, a lift while held, the cover peek on hover, the add-to-cart spin and dip, scroll
 * coupling, and the hologram and radio effects. `onOpen` gets a click (a press under 5 px and 500 ms).
 * Look inside (signals.look) opens the book in place; the pages are LookInside's. The spread you leave is saved.
 */
export function Book({ textures, signals, onOpen, small, storageKey, pageTextures = [], samples, source, closedZ = CLOSED_Z }: {
  /** The book's DOM hit area (the View's element): its pointer listeners and cursor state live there. */
  source?: HTMLElement;
  textures: BookTextures; signals: RefObject<BookSignals>; onOpen?: () => void; onClose?: () => void; small: boolean;
  /** sessionStorage key for the saved spread (#26). */
  storageKey?: string;
  pageTextures?: string[];
  samples?: BookSamples;
  /** How near the closed book stands (default CLOSED_Z): the shop's featured book comes closer, larger than its art. */
  closedZ?: number;
}) {
  const sound = useBookSound(samples);
  const slots = useMemo(() => Object.fromEntries(Object.entries(textures).filter(([, url]) => url)) as Record<string, string>, [textures]);
  const maps = useTexture(slots) as unknown as Record<string, Texture>;
  const uniforms = useMemo(() => createUniforms(), []);
  const material = useMemo(() => createCoverMaterial(maps, uniforms, small), [maps, uniforms, small]);
  const geometry = useMemo(() => ({
    front: SHARE.map((_, k) => atlasBox("front", SEG, H, BOARD, k)),
    back: SHARE.map((_, k) => atlasBox("back", SEG, H, BOARD, k)),
    spine: atlasBox("spine", BOARD, H, T + 2 * BOARD),
    pages: atlasBox("pages", W - 0.15, H - 0.3, T)
  }), []);
  useEffect(() => () => {
    material.bumpMap?.dispose(); material.dispose();
    [...geometry.front, ...geometry.back, geometry.spine, geometry.pages].forEach((g) => g.dispose());
  }, [geometry, material]);

  const root = useRef<Group>(null), front = useRef<(Group | null)[]>([]), back = useRef<(Group | null)[]>([]);
  const frontMeshes = useRef<(Mesh | null)[]>([]), backMeshes = useRef<(Mesh | null)[]>([]), backHinge = useRef<Group>(null);
  const frontHinge = useRef<Group>(null), closedPages = useRef<Mesh>(null), body = useRef<Group>(null);
  // The control bar shows once the pages have nearly fanned in (stripe.press: 95%), and fades as the book closes.
  const revealed = useRef(false);
  const look = useRef<LookState | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { const sig = signals.current; sig.invalidate = () => invalidate(); return () => { sig.invalidate = null; }; }, [invalidate, signals]);
  const physics = useRef({
    yaw: 0, pitch: 0, velYaw: 0, velPitch: 0, lastYaw: 0, spinSpeed: 0, dragging: false, hovered: false,
    released: -Infinity, pitchFrom: 0, returning: false, touch: false, armed: false, totalX: 0, lastX: 0, lastY: 0,
    downX: 0, downY: 0, downAt: 0, frontA: 0, frontV: 0, backA: 0, backV: 0, peek: 0, lift: 0, liftT: 0,
    spin: null as null | { dir: number; t: number }, exitRot: 0, scroll: 0, holo: 0, holoSince: -1, radio: 0, clock: 0, openTilt: 0, tiltYaw: 0, tiltPitch: 0, exit: 0,
    lastPointer: new Vector2()
  });
  // Audio starts on the first press anywhere on the stage.
  useEffect(() => {
    if (!source) return;
    source.addEventListener("pointerdown", sound.unlock);
    return () => source.removeEventListener("pointerdown", sound.unlock);
  }, [source, sound]);

  const setCursor = (value: "" | "hover" | "drag") => { if (source) source.dataset.book = value; };

  // The closed book's pointer input arrives on the View's own element, the hit area clipped to the book (the layer is a
  // body portal, outside the canvas's event source, so R3F's mesh events never see it): a press anywhere on it drags
  // the book, and a click opens it; entering and leaving it is the hover.
  useEffect(() => {
    if (!source) return;
    const down = (event: PointerEvent) => { if (event.button === 0 || event.pointerType !== "mouse") onPointerDown(event); };
    const enter = () => { physics.current.hovered = true; if (!physics.current.dragging && (look.current?.lu ?? 0) === 0) setCursor("hover"); };
    const leave = () => { physics.current.hovered = false; if (!physics.current.dragging && (look.current?.lu ?? 0) === 0) setCursor(""); };
    source.addEventListener("pointerdown", down); source.addEventListener("pointerenter", enter); source.addEventListener("pointerleave", leave);
    return () => { source.removeEventListener("pointerdown", down); source.removeEventListener("pointerenter", enter); source.removeEventListener("pointerleave", leave); };
  });

  function onPointerDown(e: PointerEvent) {
    // The stage's own controls (Look inside, Close) sit over the canvas; presses on them aren't for the book.
    if ((e.target as Element | null)?.closest?.("[data-book-ui]")) return;
    if ((look.current?.lu ?? 0) > 0 || (look.current?.face ?? 0) > 0) return; // open or opening: the pages take the pointer
    const s = physics.current;
    if (s.dragging) return; // one pointer owns the drag; a second finger is ignored
    Object.assign(s, { dragging: true, touch: e.pointerType !== "mouse", armed: false, totalX: 0, lastX: e.clientX, lastY: e.clientY,
      downX: e.clientX, downY: e.clientY, downAt: performance.now(), velYaw: 0, velPitch: 0, returning: false });
    setCursor("drag");
    const move = (m: PointerEvent) => {
      if (m.pointerId !== e.pointerId) return;
      const dx = m.clientX - s.lastX, dy = m.clientY - s.lastY, rate = DRAG_RATE * (s.touch ? 1 : MOUSE_MUL);
      s.lastX = m.clientX; s.lastY = m.clientY; s.totalX += dx;
      // Touch turns the book first; tilt joins at half rate once the finger has moved 10 px sideways.
      if (s.touch && Math.abs(s.totalX) > TOUCH_PITCH_ARM_PX) s.armed = true;
      const yaw = dx * rate, pitch = s.touch ? (s.armed ? dy * rate * 0.5 : 0) : dy * rate;
      s.yaw += yaw; s.pitch = MathUtils.clamp(s.pitch + pitch, -1.2, 1.2);
      s.velYaw = MathUtils.clamp(yaw, -FLING_MAX, FLING_MAX); s.velPitch = MathUtils.clamp(pitch, -FLING_MAX, FLING_MAX);
    };
    // The drag follows the pointer by capture on the stage (it keeps going past the stage until release); no window listeners.
    const target = source ?? (e.target as HTMLElement);
    const up = (u: PointerEvent) => {
      if (u.pointerId !== e.pointerId) return;
      target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", up); target.removeEventListener("pointercancel", up);
      target.removeEventListener("lostpointercapture", up);
      if (!s.dragging) return;
      s.dragging = false; s.released = s.clock; setCursor(s.hovered ? "hover" : "");
      // Only a real release clicks: a touch scroll cancels the pointer, and that never opens Look inside.
      if (u.type === "pointerup" && Math.hypot(u.clientX - s.downX, u.clientY - s.downY) < CLICK_PX && performance.now() - s.downAt < CLICK_MS) onOpen?.();
    };
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
    target.addEventListener("pointermove", move); target.addEventListener("pointerup", up); target.addEventListener("pointercancel", up);
    target.addEventListener("lostpointercapture", up);
  }

  useFrame((state, delta) => {
    // The View's own size: in drei's View the portal's state.size only updates when the View re-renders, so a resize or
    // a sticky slot would leave it stale; the hit area is the View's tracked element.
    const sw = source?.clientWidth || state.size.width, sh = source?.clientHeight || state.size.height;
    const dt = Math.min(delta, 0.05), f = dt * 60, sig = signals.current, s = physics.current;
    s.clock += dt; uniforms.uTime.value = s.clock;
    const l = (look.current ??= createLookState(readSavedSpread(storageKey)));
    if (sig.hitRect && root.current) fitHitRect(sig.hitRect, sig.overlay, root.current, state.camera as PerspectiveCamera, sw, sh, l.lu > 0 ? sig.spreadRect : null, sig.onGone);

    // Look inside (stripe.press, 06w9:16057-16166): the cover opens over 980 ms (t²) and, from half open, the pages fan
    // in over 900 ms; closing runs both back together (easeOutCubic). The pages own the leaves (look-inside.tsx).
    const want = sig.look ? 1 : -1;
    // A phone opens on the left page, one page filling the width (stripe.press's read view).
    if (want !== l.dir && want > 0 && small) { sig.view.x = -W / 2; sig.view.reachX = W / 2; }
    if (want !== l.dir && want > 0) {
      sound.play("crackle");
      // Turn the shortest way to the reading pose, and stop any fling.
      const yaw = REST_YAW + s.yaw; s.yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw)) - REST_YAW; s.velYaw = 0; s.velPitch = 0; s.lastYaw = s.yaw;
    }
    stepLookTimeline(l, want, dt);
    if (l.dir > 0 && l.ld >= 0.95 && !revealed.current) { revealed.current = true; sig.onReading?.({ spread: l.spread, leaves: LEAVES, shown: true }); }
    if (l.dir < 0 && revealed.current) { revealed.current = false; sig.onReading?.({ spread: l.spread, leaves: LEAVES, shown: false }); }
    if (l.dir < 0 && l.lu === 0 && l.luFrom > 0) { l.luFrom = 0; sig.onReading?.(null); }
    const lu = l.lu, n = l.n;
    if (closedPages.current) closedPages.current.visible = lu === 0;

    // Fling and pitch return: yaw stays where it's left; pitch eases home after 2 s (touch 0.6 s) over 5 s (2.5 s).
    if (!s.dragging) {
      s.yaw += s.velYaw * f; s.velYaw *= FLING_DECAY ** f;
      const wait = s.touch ? 0.6 : 2, span = s.touch ? 2.5 : 5, since = s.clock - s.released - wait;
      if (since < 0) { s.pitch = MathUtils.clamp(s.pitch + s.velPitch * f, -1.2, 1.2); s.velPitch *= FLING_DECAY ** f; }
      else {
        if (!s.returning) { s.returning = true; s.pitchFrom = s.pitch; }
        s.pitch = s.pitchFrom * (1 - easeInOutQuint(Math.min(since / span, 1)));
      }
    }

    // Covers swing open with spin speed and spring back (critically damped, k 40); the back board swings 1.5×.
    const speed = Math.abs(s.yaw - s.lastYaw) / Math.max(dt, 1e-4); s.lastYaw = s.yaw;
    s.spinSpeed += (speed - s.spinSpeed) * (1 - Math.exp(-11 * dt));
    // Cover peek (04ud:20232): 5° on each bone, fading as the cover opens; not while the book is held.
    s.peek += (((s.hovered || sig.peek) && !s.dragging ? Math.max(0, PEEK - lu * MathUtils.degToRad(28)) : 0) - s.peek) * (1 - (1 - PEEK_EASE) ** f);
    const flap = Math.min(s.spinSpeed * FLAP_GAIN, FLAP_MAX), damping = 2 * Math.sqrt(FLAP_K);
    const frontBefore = s.frontA;
    s.frontV += (FLAP_K * (flap - s.frontA) - damping * s.frontV) * dt; s.frontA += s.frontV * dt;
    // A cover shutting fast slaps, louder the faster it closes.
    if (frontBefore > 0.03 && s.frontA <= 0.03 && s.frontV < -0.8) sound.slap(-s.frontV / 6);
    // The pointer moving across the closed book rubs its cover.
    const moved = s.lastPointer.distanceTo(state.pointer) * Math.max(sw, sh) / 2;
    s.lastPointer.copy(state.pointer);
    if (s.hovered && lu === 0 && !s.dragging && moved > 0) sound.rub("cover", moved / (dt * 1000));
    s.backV += (FLAP_K * (flap * 1.5 - s.backA) - damping * s.backV) * dt; s.backA += s.backV * dt;
    // The covers bend bone by bone (five bones, each 0.8× the last; 3fe6:1525-1541): opening rolls the front cover by
    // lu·28°·(2 − 2n) a bone (about 188° shut to open), and as reading moves on (n) the back cover rolls 2n·28° a bone,
    // so with the body's turn both lie flat at any page. The peek and the spin flap ride on top.
    const coverStep = MathUtils.degToRad(28);
    // The board swings stiff on a fixed spine (the whole roll at the hinge), then, as the pages fan in, bends along the
    // pages' own profile (stripe.press's A(u) = 1 − (1 − u)^4 − 0.089·u^1.99, most of the bend near the spine), so it
    // lies under the stacks it carries instead of standing above them. The front board stays hinged at the front, where
    // the left stack's base lies (look-inside.tsx centres the stack on the spine).
    const BONES = 3.3616; // Σ 0.8^k over five bones: the cover's total roll per 28° step
    const profile = (u: number) => u <= 0 ? 0 : 1 - (1 - u) ** 4 - 0.089355 * u ** 1.991211, end = profile(1);
    const bone = (k: number) => MathUtils.lerp(k === 0 ? 1 : 0, (profile(Math.min((k + 0.5) / 5, 1)) - profile(Math.max((k - 0.5) / 5, 0))) / end, l.ld) * BONES;
    front.current.forEach((g, k) => { if (g) g.rotation.y = -Math.max(s.frontA, 0) * SHARE[k] - lu * coverStep * (2 - 2 * n) * bone(k) - s.peek * 0.8 ** k; });
    back.current.forEach((g, k) => { if (g) g.rotation.y = Math.max(s.backA, 0) * SHARE[k] + 2 * n * coverStep * bone(k); });
    // Each board lies half the book's thickness out from the spine. Shut, that offset is the hinge's (the board swings
    // on its edge); as the pages fan in it moves onto each segment, along that segment's own normal, so the bent board
    // traces the stack's outer face (an offset curve) instead of rising to the top page's height.
    const onSegments = l.ld;
    if (frontHinge.current) frontHinge.current.position.z = (T / 2) * (1 - onSegments);
    if (backHinge.current) backHinge.current.position.z = (-T / 2) * (1 - onSegments);
    frontMeshes.current.forEach((m) => { if (m) m.position.z = (T / 2) * onSegments; });
    backMeshes.current.forEach((m) => { if (m) m.position.z = (-T / 2) * onSegments; });
    // Mitred joints: where a bent board's segments meet, each offset segment is trimmed or stretched along its length to
    // the bisector (d·tan(δ/2) for a joint bending by δ), so no corner pokes out under the stacks (the sliver by the
    // spine) and the joints don't step. The hinge end stays on the spine.
    const mitre = (groups: (Group | null)[], meshes: (Mesh | null)[], d: number) => meshes.forEach((m, k) => {
      if (!m) return;
      const half = (g: Group | null | undefined) => g ? d * Math.tan(MathUtils.clamp(g.rotation.y, -1.2, 1.2) / 2) : 0;
      const start = k === 0 ? 0 : -half(groups[k]), end = half(groups[k + 1]);
      m.position.x = start; m.scale.x = Math.max(0.05, (SEG + end - start) / SEG);
    });
    mitre(front.current, frontMeshes.current, (T / 2) * onSegments + BOARD / 2);
    mitre(back.current, backMeshes.current, -((T / 2) * onSegments + BOARD / 2));
    // The body turns π·n about the spine (stripe.press's facing counter-yaw): the gutter rises toward you mid-book while
    // the covers and pages, bent back by the same amount, stay flat.
    if (body.current) {
      const turn = -Math.PI * n;
      body.current.rotation.y = turn;
      body.current.position.set(-W / 2 + (W / 2) * Math.cos(turn), 0, -(W / 2) * Math.sin(turn));
    }

    // Lift towards the camera while held: 0.3 s with a small overshoot; it falls back at 2 per second.
    if (s.dragging) { s.liftT = Math.min(s.liftT + dt / 0.3, 1); const e = smoothstep(s.liftT); s.lift = e + Math.sin(e * Math.PI) * (1 - e) * 0.12; }
    else { s.lift = Math.max(s.lift - 2 * dt, 0); s.liftT = s.lift; }

    // Add-to-cart: a full turn (removal turns back) with a dip on a sine; 0.9 s is ours (stripe.press's isn't in its code).
    if (!s.spin && sig.spins.length && lu > 0) sig.spins.length = 0; // stripe.press skips the spin while Look inside is open
    if (!s.spin && sig.spins.length) s.spin = { dir: Math.sign(sig.spins.shift() ?? 1) || 1, t: 0 };
    let spinYaw = 0, dip = 0;
    if (s.spin) {
      s.spin.t = Math.min(s.spin.t + dt / 0.9, 1);
      spinYaw = s.spin.dir * 2 * Math.PI * smootherstep(s.spin.t); dip = Math.sin(Math.PI * s.spin.t) * 3;
      if (s.spin.t >= 1) s.spin = null;
    }

    // Scroll coupling: as the column scrolls, the book eases back and turns away.
    s.scroll += (sig.scroll - s.scroll) * (1 - Math.exp(-8 * dt));

    // Hologram: starts 50 ms after the hover, fades at 6/s; radio fades in at 20/s and out at 10/s.
    if (sig.hologram) { if (s.holoSince < 0) s.holoSince = s.clock; } else s.holoSince = -1;
    const holoOn = s.holoSince >= 0 && s.clock - s.holoSince > 0.05;
    s.holo = MathUtils.clamp(s.holo + (holoOn ? 6 : -6) * dt, 0, 1);
    s.radio = MathUtils.clamp(s.radio + (sig.radio ? 20 : -10) * dt, 0, 1);
    uniforms.uHolo.value = s.holo; uniforms.uRadio.value = s.radio;
    uniforms.uHoloMouse.value.lerp(state.pointer, 1 - Math.exp(-11.5 * dt));
    // stripe.press dims its canvas to 0.9 while the hologram shows. The book's canvas is now the shared root, so dimming it
    // would dim every other View (Review-B): the hologram lives in the cover shader alone.

    // Open pose (#16): tilted back, following the pointer's height (6/s, 0.4× on touch), centred on the spread and
    // popped towards the camera; the book counter-turns a little as reading progresses (tuned to this model).
    // Open pitch (04ud:20544): 22° back, +10° with the pointer at the top and −12° at the bottom (rate 6); fixed on a phone.
    const pointerTilt = sig.pointer.y > 0 ? sig.pointer.y * POINTER_UP : sig.pointer.y * POINTER_DOWN;
    s.openTilt += ((small ? 0 : pointerTilt) - s.openTilt) * (1 - Math.exp(-6 * dt));
    // The closed book turns toward the pointer (stripe.press, TEARDOWN §4.2): yaw 0.16 rad × x, pitch −0.10 rad × y over
    // the whole viewport, eased at rate 4; opening blends it out.
    const follow = 1 - Math.exp(-4 * dt);
    s.tiltYaw += (0.16 * sig.pointer.x - s.tiltYaw) * follow; s.tiltPitch += (-0.1 * sig.pointer.y - s.tiltPitch) * follow;
    // Scroll exit (TEARDOWN §7): the stage's value, smoothed at rate 12, eased in and out; the book rises from its rest
    // height through the top of its view, plus 40 units of clearance. Opening blends it out.
    s.exit += (sig.exit - s.exit) * (1 - Math.exp(-12 * dt));
    if (Math.abs(sig.exit - s.exit) < 1e-4) s.exit = sig.exit;
    // The rise ends with the book's centre 1.4 frame heights above the top (stripe.press's 40 units at its 90-unit
    // distance), so it leaves at 2–3× the scroll; it tips back and rolls toward spine-on as it goes, following the same
    // eased weight with a lag (04ud:19817-19873, 20175-20215).
    const tan9 = Math.tan(MathUtils.degToRad(9)), halfHeight = tan9 * (54 - closedZ), exitEase = easeInOutQuad(s.exit);
    // Measured live against stripe.press (24 Nov): its book is gone by ~1000 px of scroll after a ~500 px hold, so the
    // rise runs 1.5× the 40-unit clearance's equivalent.
    const exitY = exitEase * (halfHeight - CLOSED_Y + 2.808 * halfHeight) * 1.5;
    s.exitRot += (exitEase - s.exitRot) * (1 - 0.8 ** f);
    // The closed tilt and pose blend out with the cover (× 1 − lu): the open book faces you, pitched back.
    const b = lu, closedYaw = REST_YAW + s.yaw + s.tiltYaw + spinYaw + s.scroll * 0.9;
    // Opening first turns the book to face you (easeInOutQuad over the face turn), then the cover swings.
    const faced = easeInOutQuad(l.face);
    if (root.current) {
      root.current.rotation.set(
        MathUtils.lerp(MathUtils.lerp(REST_PITCH + s.pitch + s.tiltPitch - 1.2 * s.exitRot, 0, faced), -(small ? OPEN_TILT_TOUCH : OPEN_TILT) + s.openTilt, b),
        MathUtils.lerp(MathUtils.lerp(closedYaw + 0.3 * s.exitRot, 0, faced), 0, b),
        MathUtils.lerp(MathUtils.lerp(REST_ROLL - 0.3 * s.exitRot, 0, faced), 0, b));
      // Open: the spine on the frame's centre and the spread about 60% of the window wide (stripe.press's ~870 px at
      // 1440), free to spill past the stage; on a phone one page fills the width.
      const fr = sig.frame ?? { left: 0, top: 0, width: sw, height: sh };
      const spreadPx = small ? 2 * fr.width * 0.96 : Math.min(window.innerWidth * 0.604, fr.width * 1.25);
      const zOpen = MathUtils.clamp(54 - W * fr.height / (tan9 * Math.max(spreadPx, 1)), -60, 30);
      root.current.position.set(MathUtils.lerp(CLOSED_X, W / 2, b), MathUtils.lerp(CLOSED_Y + exitY, 0, b),
        MathUtils.lerp(closedZ + s.lift - dip - s.scroll * 6, zOpen, b));
    }
    // The camera is framed on the stage inside the window-wide View: a lens shift puts the frame's centre on its axis.
    const cam = state.camera as PerspectiveCamera, frame = sig.frame ?? { left: 0, top: 0, width: sw, height: sh };
    const fullW = sw * frame.height / Math.max(sh, 1), offX = fullW / 2 - frame.left - frame.width / 2, offY = -frame.top, v = cam.view;
    if (!v || !v.enabled || Math.abs(v.fullWidth - fullW) > 0.01 || v.fullHeight !== frame.height || Math.abs(v.offsetX - offX) > 0.01 || v.offsetY !== offY || v.width !== sw || v.height !== sh)
      cam.setViewOffset(fullW, frame.height, offX, offY, sw, sh);
    // Touch zoom and pan apply only while the book is open.
    const view = sig.view, camera = state.camera as PerspectiveCamera;
    camera.position.x = view.x * b; camera.position.y = view.y * b;
    const zoom = MathUtils.lerp(1, view.zoom, b);
    if (camera.zoom !== zoom) { camera.zoom = zoom; camera.updateProjectionMatrix(); }
    view.unitsPerPx = (2 * (camera.position.z - (root.current?.position.z ?? 0)) * tan9) / Math.max(frame.height, 1) / zoom;
  });

  // On-demand rendering (the stage idles the loop when nothing is engaged): while anything still moves, or a released
  // drag's pitch return (up to 7 s) or an effect is still to play, the book asks for the next frame itself, so motion
  // always finishes and an idle book draws nothing.
  const lastPose = useRef(NaN);
  useFrame((state) => {
    const s = physics.current, l = look.current, sig = signals.current, r = root.current;
    const pose = (r ? r.rotation.x + r.rotation.y * 3 + r.rotation.z * 5 + r.position.x * 7 + r.position.y * 11 + r.position.z * 13 : 0)
      + s.frontA * 17 + s.backA * 19 + s.peek * 23 + s.yaw * 29 + s.pitch * 31 + s.tiltYaw * 43 + s.tiltPitch * 47 + s.exit * 53 + s.holo * 37 + s.radio * 41
      + (l ? l.lu * 43 + l.ld * 59 + l.n * 61 + l.face * 67 : 0) + state.camera.position.z * 53;
    const settling = s.dragging || (Number.isFinite(s.released) && s.clock - s.released < (s.touch ? 3.2 : 7.1))
      || sig.hologram || sig.radio || sig.spins.length > 0 || sig.commands.length > 0;
    if (settling || Math.abs(pose - lastPose.current) > 1e-5 || Number.isNaN(lastPose.current)) state.invalidate();
    lastPose.current = pose;
  });

  return <group ref={root}
>
    <group ref={body}>
      <mesh geometry={geometry.spine} material={material} position={[-W / 2 - BOARD / 2, 0, 0]} castShadow />
      <mesh ref={closedPages} geometry={geometry.pages} material={material} position={[-0.075, 0, 0]} castShadow />
      <group ref={frontHinge} position={[-W / 2, 0, T / 2]}><Board geometries={geometry.front} segments={front} meshes={frontMeshes} material={material} /></group>
      <group ref={backHinge} position={[-W / 2, 0, -T / 2]}><Board geometries={geometry.back} segments={back} meshes={backMeshes} material={material} /></group>
      <LookInside source={source} look={look} signals={signals} sound={sound} width={W - 0.15} height={H - 0.3} thickness={T} pageTextures={pageTextures} marksKey={storageKey && storageKey + ":marks"}
        onSpread={(spread) => { signals.current.onReading?.({ spread, leaves: LEAVES, shown: revealed.current }); if (storageKey) try { window.sessionStorage.setItem(storageKey, String(spread)); } catch { /* storage unavailable */ } }} />
    </group>
  </group>;
}
