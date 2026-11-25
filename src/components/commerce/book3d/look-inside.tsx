"use client";
// The leaves' uniforms and the shared page state are live GPU and frame state, not React state: frames and pointer
// handlers change them in place (as menu-gradient.tsx does for its uniforms).
/* eslint-disable react-hooks/immutability */

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { BookSignals } from "./book";
import type { BookSound } from "./book-sound";
import { BoxGeometry, CanvasTexture, DoubleSide, MathUtils, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Vector3, type Group, type Texture } from "three";

/*
 * Look inside, rebuilt from stripe.press's own code (bundles 04ud, 3fe6, 06w9, 12s2).
 * - A turn is a curl, not a rotation: every leaf's root stays on the spine and the sheet's angle across its width is
 *   liveCurl·S·A(u). A leaf's turn state f moves liveCurl from −x (lying right) to 1 − x (lying left), x the reading
 *   position, so its fore-edge sweeps about 187° while the root stays put. The book's body turns π·x about the spine
 *   (book.tsx), so both stacks lie flat and the pages rise out of the gutter, as a real book's do. Nothing lifts off the
 *   spine: the hovered page only rolls from a corner.
 * - Leaf angles are a stepper: a dragged leaf follows the pointer, a lone released leaf springs, several in flight travel
 *   at 0.18 rad a frame, and no leaf passes the one above it.
 * - Pointer input is mapped on the spread's screen rect (stripe.press's rP): left of the spine pages back, right forward.
 * "A frame" rates are stripe.press's per-60 fps values, applied frame-rate independent.
 */

/** Shared between the book (timeline, pose, covers) and the pages (physics, gestures). */
export type LookState = {
  /** Cover progress (0 shut, 1 open) and page progress (the fan); dir +1 opening, −1 closing. */
  lu: number; ld: number; dir: 1 | -1;
  /** The face turn (0 posed, 1 facing you): stripe.press's book turns to face the reader over the first ~480 ms of
   *  opening, while the cover's slow t² start barely lifts it. Closing brings it back with the cover. */
  face: number;
  /** Tween clocks (s) and start values of the current open or close. The pages wait for the cover to be half open. */
  luClock: number; ldClock: number; luFrom: number; ldFrom: number; ldRunning: boolean;
  /** The pages take input once the fan is under way (stripe.press: page progress past 0.3). */
  active: boolean;
  /** Per leaf: physics angle (0 lying right, π lying left), its velocity (rad a frame), snap target, drawn angle, when a
   *  press braked it (ms), its tip-fold blend (the no-pass gap), and its fan-in. */
  angle: number[]; vel: number[]; target: (number | null)[]; render: number[]; brake: (number | null)[]; tip: number[]; fan: number[];
  /** The current page: how many leaves lie (or are headed) left. */
  spread: number;
  /** Eased reading position, the pointer's push, and the effective position × page progress (the body's turn, covers). */
  tx: number; push: number; n: number;
};

const noPick = () => {};
/** The preview book's leaves (340 pages). Like stripe.press, only a few live leaves are drawn as sheets (SLOTS); the rest
 *  are two page blocks, and a riffled run of leaves is a third. */
export const LEAVES = 170;
const SLOTS = 8;
/** Leaves that peel off the left stack's cover side as thin sheets while the book opens or closes. */
const PEEL = 5;
const PI = Math.PI;
// stripe.press (12s2, 3fe6): sweep min(205.35°, 6·stiffness), damping, corner curl tuning; its page is 15.05 wide.
const SWEEP = MathUtils.degToRad(205.349254), DAMPING = 0.32839134, CURL_RAD = 7.02, CURL_POWER = 0.86, FOLD_TILT = MathUtils.degToRad(31.5);
const SPAN = 32.4, STRIPE_PAGE_W = 15.05, COVER_MS = 980, PAGE_MS = 900, FACE_MS = 480;
// Closing settles in ~0.8 s on stripe.press (Review-B frames, 25 Nov), not the full 980 ms ease-out tail.
const CLOSE_COVER_MS = 800, CLOSE_PAGE_MS = 720;
const clamp01 = (x: number) => MathUtils.clamp(x, 0, 1);
const smooth = (e0: number, e1: number, x: number) => { const c = clamp01((x - e0) / (e1 - e0)); return c * c * (3 - 2 * c); };
/** A stripe.press per-frame lerp factor k, for a step of f 60 fps frames. */
const perFrame = (k: number, f: number) => 1 - (1 - k) ** f;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
/** Page fan ease (06w9:16057): slow start, quick finish. */
const fanEase = (s: number) => s <= 0 ? 0 : s >= 1 ? 1 : s ** 2.4 / (s ** 2.4 + (1 - s) ** 1.1);

export function createLookState(spread: number): LookState {
  return { lu: 0, ld: 0, face: 0, dir: -1, luClock: 0, ldClock: 0, luFrom: 0, ldFrom: 0, ldRunning: false, active: false,
    angle: Array(LEAVES).fill(PI / 2), vel: Array(LEAVES).fill(0), target: Array(LEAVES).fill(PI / 2), render: Array(LEAVES).fill(PI / 2),
    brake: Array(LEAVES).fill(null), tip: Array(LEAVES).fill(0), fan: Array(LEAVES).fill(0),
    spread: MathUtils.clamp(Math.round(spread), 0, LEAVES), tx: 0, push: 0, n: 0 };
}

/**
 * The open and close timeline (06w9:16057-16166). Opening: the book turns to face you (480 ms) while the cover starts
 * over 980 ms (t², so it barely moves before the turn is done), then, once it is half open, the pages over 900 ms (fan
 * ease): about 1.6 s in all, as stripe.press measures. Closing: both from where they are, together, easeOutCubic (800
 * and 720 ms), each frame's step capped at 34 ms so a dropped frame slows the close instead of skipping it.
 */
export function stepLookTimeline(l: LookState, want: 1 | -1, dt: number) {
  if (want !== l.dir) { l.dir = want; l.luClock = 0; l.ldClock = 0; l.luFrom = l.lu; l.ldFrom = l.ld; l.ldRunning = want < 0; }
  if (l.dir > 0) {
    if (l.face < 1) l.face = Math.min(l.face + dt * 1000 / FACE_MS, 1);
    if (l.lu < 1) { l.luClock += dt; const t = clamp01(l.luClock * 1000 / COVER_MS); l.lu = l.luFrom + (1 - l.luFrom) * t * t; }
    if (!l.ldRunning && l.lu >= 0.5) { l.ldRunning = true; l.ldClock = 0; l.ldFrom = l.ld; }
    if (l.ldRunning && l.ld < 1) { l.ldClock += dt; l.ld = l.ldFrom + (1 - l.ldFrom) * fanEase(clamp01(l.ldClock * 1000 / PAGE_MS)); }
  } else {
    const step = Math.min(dt, 0.034);
    l.luClock += step; l.ldClock += step;
    l.lu = l.luFrom * (1 - easeOutCubic(clamp01(l.luClock * 1000 / CLOSE_COVER_MS)));
    l.ld = l.ldFrom * (1 - easeOutCubic(clamp01(l.ldClock * 1000 / CLOSE_PAGE_MS)));
    l.face = Math.min(l.face, l.lu);
  }
  l.active = l.dir > 0 && l.ld > 0.3;
}

/**
 * One sheet of the book, bent in its vertex shader (3fe6:3808-3850, 6547-6632). Across the width (u from the spine) the
 * sheet's angle is θ(u) = liveCurl·S·A(u), plus a flop near upright and a tip flop while dragged, with A(u) = 1 − (1 − u)^4
 * − 0.089·u^1.99 eased toward a binding kink on a thin side. It is integrated from the spine and offset along its normal
 * by the leaf's depth in the stack (held below 0.9/curvature, so no cusps). The corner curl rolls the paper past a fold
 * line through (0.74, 0.5) tilted by ψ, at a(s) = min(amount·s^0.86, π) over the span, landing back on the bent sheet and
 * only ever lifting outward. The page blocks use the same field with a depth (position.z × uDepth).
 */
function createSheetMaterial(width: number, height: number, front?: Texture, back?: Texture, color = 0xf3f3f1) {
  const uniforms = {
    uW: { value: width }, uH: { value: height }, uCurl: { value: 0 }, uSweep: { value: SWEEP }, uThin: { value: 0 }, uFlop: { value: 0 },
    uTipFlop: { value: 0 }, uOffset: { value: 0 }, uDepth: { value: 0 }, uStack: { value: 0 }, uEdgeLift: { value: 0 },
    uCurlAmount: { value: 0 }, uCurlPower: { value: CURL_POWER }, uCurlAngle: { value: 0 }, uPivotU: { value: 0.74 }, uPivotV: { value: 0.5 },
    uSpan: { value: SPAN * width / STRIPE_PAGE_W }, uLiftSign: { value: 1 },
    uFront: { value: front ?? null }, uBack: { value: back ?? null }, uHasFront: { value: front ? 1 : 0 }, uHasBack: { value: back ? 1 : 0 },
    // Highlighter ink, one layer per side, painted at runtime.
    uInkFront: { value: null as Texture | null }, uInkBack: { value: null as Texture | null }, uHasInkFront: { value: 0 }, uHasInkBack: { value: 0 }
  };
  const material = new MeshStandardMaterial({ color, roughness: 0.92, side: DoubleSide });
  material.customProgramCacheKey = () => "book3d-sheet";
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        uniform float uW, uH, uCurl, uSweep, uThin, uFlop, uTipFlop, uOffset, uDepth, uStack;
        varying float vEdge;
        uniform float uCurlAmount, uCurlPower, uCurlAngle, uPivotU, uPivotV, uSpan, uLiftSign;
        varying vec2 vLeafUv;
        float sheetA(float u) {
          float a = 1.0 - pow(1.0 - u, 4.0) - 0.089355 * pow(u, 1.991211);
          return mix(a, 0.38 + (1.0 - 0.089355 - 0.38) * smoothstep(0.015, 0.13, u), uThin);
        }
        float sheetTheta(float u) { return uCurl * uSweep * sheetA(u) + uFlop * u * u + uTipFlop * smoothstep(0.5, 1.0, u); }
        // The bent centreline at arc length s from the spine (running straight on past the fore edge): x, depth, angle.
        vec3 sheetAt(float s) {
          float sc = clamp(s, 0.0, uW), ds = sc / 40.0;
          vec2 p = vec2(0.0);
          for (int i = 0; i < 40; i++) { float th = sheetTheta((float(i) + 0.5) * ds / uW); p += vec2(cos(th), sin(th)) * ds; }
          float th = sheetTheta(sc / uW);
          return vec3(p + vec2(cos(th), sin(th)) * (s - sc), th);
        }`)
      .replace("#include <beginnormal_vertex>", `
        // Corner curl: the roll past the fold line.
        vec2 curlDir = vec2(cos(uCurlAngle), sin(uCurlAngle));
        float xi = dot(position.xy - vec2(uPivotU * uW, (uPivotV - 0.5) * uH), curlDir);
        float dAlong = 0.0, dOut = 0.0, curlEnd = 0.0;
        if (uCurlAmount > 1e-4 && xi > 0.0) {
          float stepL = uSpan / 64.0, left = xi;
          vec2 roll = vec2(0.0);
          for (int i = 0; i < 128; i++) {
            if (left <= 0.0) break;
            float w = min(stepL, left);
            curlEnd = min(uCurlAmount * pow(clamp((float(i) + 0.5) * stepL / uSpan, 0.0, 1.0), uCurlPower), PI);
            roll += vec2(cos(curlEnd), sin(curlEnd)) * w; left -= w;
          }
          dAlong = roll.x - xi; dOut = max(roll.y, 0.0);
        }
        float landX = position.x + dAlong * curlDir.x;
        vec3 land = sheetAt(landX);
        vec2 tan2 = vec2(cos(land.z), sin(land.z)), nor2 = vec2(-tan2.y, tan2.x);
        // The leaf's depth in the stack (and a block's own depth), held where the sheet bends hard (no cusps).
        float sheetU = clamp(landX / uW, 0.0, 1.0);
        float kappa = max(abs(sheetTheta(min(sheetU + 0.01, 1.0)) - sheetTheta(max(sheetU - 0.01, 0.0))) / (0.02 * uW), 1e-4);
        float depth = clamp(uOffset + position.z * uDepth, -0.9 / kappa, 0.9 / kappa);
        vec3 sheetT = vec3(tan2.x, 0.0, tan2.y), sheetN = vec3(nor2.x, 0.0, nor2.y), sheetB = vec3(0.0, 1.0, 0.0);
        vec3 liftN = sheetN * uLiftSign;
        vec3 sheetPos = vec3(land.x + nor2.x * depth, position.y + dAlong * curlDir.y, land.y + nor2.y * depth + uStack) + dOut * liftN;
        vec3 curledN = normalize(cos(curlEnd) * liftN - sin(curlEnd) * (curlDir.x * sheetT + curlDir.y * sheetB)) * uLiftSign;
        vec3 objectNormal = normalize(sheetT * normal.x + sheetB * normal.y + curledN * normal.z);`)
      .replace("#include <begin_vertex>", "vec3 transformed = sheetPos;\nvLeafUv = uv;\nvEdge = 1.0 - abs(normal.z);");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uFront, uBack, uInkFront, uInkBack;\nuniform float uHasFront, uHasBack, uHasInkFront, uHasInkBack, uEdgeLift;\nvarying vec2 vLeafUv;\nvarying float vEdge;")
      // A block's page edges read as paper, not shadow: they take back some of their own colour (stripe.press's light fore edge).
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uEdgeLift * vEdge;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        if (gl_FrontFacing && uHasFront > 0.5) diffuseColor.rgb *= texture2D(uFront, vLeafUv).rgb;
        if (!gl_FrontFacing && uHasBack > 0.5) diffuseColor.rgb *= texture2D(uBack, vec2(1.0 - vLeafUv.x, vLeafUv.y)).rgb;
        vec4 ink = vec4(0.0);
        if (gl_FrontFacing && uHasInkFront > 0.5) ink = texture2D(uInkFront, vLeafUv);
        if (!gl_FrontFacing && uHasInkBack > 0.5) ink = texture2D(uInkBack, vLeafUv);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * ink.rgb, ink.a);`);
  };
  return { material, uniforms };
}

/** TEMPORARY: Stripe Press's two highlighter inks (pink at 0.48, yellow at 0.8); colours are on hold for the owner. */
const INK = { pink: { rgb: "255,95,168", alpha: 0.48, hex: 0xff5fa8 }, yellow: { rgb: "244,228,0", alpha: 0.8, hex: 0xf4e400 } } as const;
export type Ink = keyof typeof INK;
type Stroke = { leaf: number; back: boolean; ink: Ink; points: number[] };

/**
 * The highlighter's saved marks (#28): committed strokes only. A stroke in flight is painted but never saved until it ends
 * as a stroke (a pan or pinch that takes its finger undoes it instead). Each delayed write (400 ms) snapshots the
 * committed strokes when it fires, and flush() writes a pending save at once (on leaving) instead of dropping it
 * (Review-B r4).
 */
export function createMarkStore(key: string | undefined, storage: Pick<Storage, "getItem" | "setItem"> | null, delay = 400) {
  let committed: Stroke[] = [];
  try { committed = key && storage ? JSON.parse(storage.getItem(key) ?? "[]") as Stroke[] : []; } catch { committed = []; }
  let timer: ReturnType<typeof setTimeout> | null = null;
  const write = () => { timer = null; if (!key || !storage) return; try { storage.setItem(key, JSON.stringify(committed)); } catch { /* storage unavailable */ } };
  return {
    strokes: () => committed,
    commit(stroke: Stroke) { committed = [...committed, stroke]; if (timer !== null) clearTimeout(timer); timer = setTimeout(write, delay); },
    flush() { if (timer !== null) { clearTimeout(timer); write(); } }
  };
}
export type { Stroke };

/** A press on the open pages. mode: "brake" (leaves in flight were caught; the leaf is taken on a move or after 200 ms),
 *  "drag" (a leaf in hand), "cover" (the cover side at an end: a click closes), "edge" (a fore-edge riffle). */
type Gesture = {
  id: number; mode: "brake" | "drag" | "cover" | "edge"; left: boolean; leaf: number; startAngle: number; prevTarget: number | null;
  downX: number; downY: number; downAt: number; startX: number; lastX: number; lastAt: number; moved: number; dragTarget: number;
  edgeVel: number; timer: number;
};
/** The fore-edge riffle (04ud:1901-2290): hovering the stack's outer fifth with 2 or more leaves in it arms a block that
 *  lifts (16°); a press holds it, a fast move (0.7 px/ms) or the release turns it, a miss of 90 ms drops it. */
type Chunk = { phase: "idle" | "gather" | "release"; left: boolean; count: number; lift: number; p: number; commit: boolean; missAt: number; checkedAt: number };

/**
 * A placeholder page until the product's page images exist: paper, a running head, ragged lines of grey type (no words),
 * now and then a figure, and the folio at the outer foot. Seeded by the page, so a page always looks the same.
 */
function drawPage(face: { canvas: HTMLCanvasElement; texture: CanvasTexture }, page: number) {
  const { canvas, texture } = face, c = canvas.getContext("2d"); if (!c) return;
  const w = canvas.width, h = canvas.height, left = page % 2 === 0, margin = w * 0.13, measure = w - 2 * margin;
  let seed = (page * 7919) % 233280;
  const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  c.fillStyle = "#f6f5f1"; c.fillRect(0, 0, w, h);
  c.fillStyle = "#cfcec9"; c.fillRect(left ? margin : w - margin - measure * 0.3, h * 0.06, measure * 0.3, h * 0.007);
  const figure = random() < 0.3 ? { at: h * (0.16 + random() * 0.35), height: h * (0.18 + random() * 0.1) } : null;
  const line = h * 0.027;
  for (let y = h * 0.11; y < h * 0.88; y += line) {
    if (figure && y >= figure.at && y < figure.at + figure.height) {
      c.strokeStyle = "#d8d7d2"; c.lineWidth = 2; c.strokeRect(margin, figure.at, measure, figure.height - line);
      y = figure.at + figure.height; continue;
    }
    const end = random() < 0.12;
    c.fillStyle = "#c4c3be"; c.fillRect(margin, y, measure * (end ? 0.25 + random() * 0.5 : 0.94 + random() * 0.06), h * 0.008);
    if (end) y += line * 0.6;
  }
  c.fillStyle = "#8f8e89"; c.font = Math.round(h * 0.02) + "px sans-serif"; c.textAlign = left ? "left" : "right";
  c.fillText(String(page), left ? margin : w - margin, h * 0.94);
  texture.colorSpace = SRGBColorSpace; texture.needsUpdate = true;
}

/** Root frame (the spread laid flat) to the body's frame (turned π·n about the spine, book.tsx). */
function toBody(v: Vector3, n: number) {
  const a = PI * n, x = v.x, z = v.z;
  return v.set(x * Math.cos(a) + z * Math.sin(a), v.y, -x * Math.sin(a) + z * Math.cos(a));
}

export function LookInside({ source, look, signals, sound, width, height, thickness, pageTextures, marksKey, onSpread }: {
  source?: HTMLElement;
  look: RefObject<LookState | null>; signals: RefObject<BookSignals>; sound: BookSound;
  width: number; height: number; thickness: number;
  /** Page images in reading order: page 1 (leaf 1 front), page 2 (leaf 1 back), ... Missing pages show blank. */
  pageTextures: string[];
  /** localStorage key for the highlighter's marks (#28). */
  marksKey?: string;
  onSpread: (spread: number) => void;
}) {
  const maps = useTexture(pageTextures) as Texture[];
  // The live sheets: each slot shows whichever leaf it is given, with that leaf's page images (the product's, or a drawn
  // placeholder page until the real pages exist) and ink.
  const slots = useMemo(() => Array.from({ length: SLOTS }, () => {
    const sheet = createSheetMaterial(width, height);
    const faces = [0, 1].map(() => { const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = Math.round(512 * height / width); return { canvas, texture: new CanvasTexture(canvas) }; });
    return { ...sheet, faces, leaf: -1 };
  }), [width, height]);
  const blocks = useMemo(() => [0, 1, 2].map(() => createSheetMaterial(width, height, undefined, undefined, 0xe9e9e6)), [width, height]);
  const peels = useMemo(() => Array.from({ length: PEEL }, () => createSheetMaterial(width, height)), [width, height]);
  // stripe.press's page plane: 48 across and in proportion down. The blocks bend across their width only.
  const geometry = useMemo(() => { const g = new PlaneGeometry(width, height, 48, Math.floor(48 * height / width)); g.translate(width / 2, 0, 0); return g; }, [width, height]);
  const block = useMemo(() => { const g = new BoxGeometry(width, height, 1, 48, 1, 1); g.translate(width / 2, 0, -0.5); return g; }, [width, height]);
  useEffect(() => () => {
    geometry.dispose(); block.dispose(); blocks.forEach((b) => b.material.dispose()); peels.forEach((p) => p.material.dispose());
    slots.forEach((slot) => { slot.material.dispose(); slot.faces.forEach((face) => face.texture.dispose()); });
  }, [geometry, block, slots, blocks, peels]);

  const per = thickness / LEAVES;
  const group = useRef<Group>(null), slotMeshes = useRef<(Group | null)[]>([]), blockMeshes = useRef<(Group | null)[]>([]), peelMeshes = useRef<(Group | null)[]>([]);
  const gesture = useRef<Gesture | null>(null);
  const chunk = useRef<Chunk>({ phase: "idle", left: false, count: 0, lift: 0, p: 0, commit: false, missAt: 0, checkedAt: 0 });
  /** Per leaf drawing state: corner curl (target, tilt, shown amount and its smoothing velocity), where it was held or
   *  hovered, the tip flop, the hover nudge, and whether its flight was dragged. */
  const leafFx = useRef(Array.from({ length: LEAVES }, () => ({ curl: 0, tilt: 0, amount: 0, amountV: 0, grabU: 1, grabV: 0.5, flop: 0, nudge: 0, dragged: false })));
  const hover = useRef({ inside: false, left: false, grabU: 0, grabV: 0.5, x: 0, y: 0, lastSide: 0, sideSince: 0, pushFrom: 0 });
  const timing = useRef({ lockoutUntil: 0, fanAt: -1, shownAt: -1, fine: true, panTo: null as number | null });
  const state = useRef<{ invalidate: () => void } | null>(null);
  useEffect(() => { timing.current.fine = window.matchMedia("(pointer: fine)").matches; }, []);
  /** The spread's screen rect in the View's pixels and the spine's x (stripe.press's book rect and spineScreenX). */
  const rect = useRef({ left: 0, top: 0, right: 0, bottom: 0, spine: 0, ready: false });

  // Highlighter (#28): each page side gets an ink canvas on first use; strokes are kept as page coordinates, so they replay
  // onto fresh canvases and save small. Marks are kept in localStorage (debounced 400 ms).
  const surfaces = useRef(new Map<string, { context: CanvasRenderingContext2D; canvas: HTMLCanvasElement; texture: CanvasTexture }>());
  const marks = useRef<ReturnType<typeof createMarkStore> | null>(null), painting = useRef<null | { stroke: Stroke; at: number; x: number; y: number; id: number }>(null);
  const marker = useRef<Group>(null), markerMaterial = useMemo(() => new MeshStandardMaterial({ color: INK.pink.hex, roughness: 0.5 }), []);
  const markerGeometry = useMemo(() => { const g = new BoxGeometry(0.32, 0.32, 2.2); g.translate(0, 0, 1.1); return g; }, []);
  const markerMotion = useRef({ x: 0, y: 0, roll: 0, rollV: 0, pitch: 0, pitchV: 0, lift: 0.35, lastX: 0, lastY: 0 });
  function surface(leaf: number, back: boolean) {
    const key = leaf + (back ? "b" : "f");
    let found = surfaces.current.get(key);
    if (!found) {
      const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = Math.round(512 * height / width);
      const context = canvas.getContext("2d"); if (!context) return null;
      found = { context, canvas, texture: new CanvasTexture(canvas) }; surfaces.current.set(key, found);
    }
    return found;
  }
  function paint(stroke: Stroke, from: number) {
    const target = surface(stroke.leaf, stroke.back); if (!target) return;
    const { context, canvas, texture } = target, ink = INK[stroke.ink], p = stroke.points;
    context.strokeStyle = `rgba(${ink.rgb},${ink.alpha})`; context.lineWidth = canvas.width * 0.045; context.lineCap = "round"; context.lineJoin = "round";
    context.beginPath();
    const start = Math.max(from - 2, 0);
    context.moveTo(p[start] * canvas.width, (1 - p[start + 1]) * canvas.height);
    for (let i = start + 2; i < p.length; i += 2) context.lineTo(p[i] * canvas.width, (1 - p[i + 1]) * canvas.height);
    if (p.length === 2) context.lineTo(p[0] * canvas.width + 0.1, (1 - p[1]) * canvas.height);
    context.stroke(); texture.needsUpdate = true;
  }
  const replay = (list: Stroke[]) => list.forEach((stroke) => { if (stroke.leaf >= 0 && stroke.leaf < LEAVES && INK[stroke.ink]) paint(stroke, 0); });
  /** Take back the stroke in flight: clear every ink canvas and replay the committed strokes (it was never committed). */
  const undoStroke = () => {
    painting.current = null;
    surfaces.current.forEach(({ context, canvas, texture }) => { context.clearRect(0, 0, canvas.width, canvas.height); texture.needsUpdate = true; });
    replay(marks.current?.strokes() ?? []);
  };
  useEffect(() => {
    // New leaf materials (new page images) start with fresh canvases; the saved strokes replay onto them.
    surfaces.current.forEach(({ texture }) => texture.dispose()); surfaces.current.clear();
    marks.current?.flush();
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { storage = null; }
    marks.current = createMarkStore(marksKey, storage);
    replay(marks.current.strokes());
    // paint() reads the stable refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marksKey]);
  useEffect(() => () => { marks.current?.flush(); markerMaterial.dispose(); markerGeometry.dispose(); surfaces.current.forEach(({ texture }) => texture.dispose()); }, [markerMaterial, markerGeometry]);

  // ---- Turning (stripe.press's index model, 04ud:2037-2060, 17605-17626) ----
  const setSpread = (next: number) => {
    const l = look.current; if (!l) return;
    next = MathUtils.clamp(next, 0, LEAVES);
    if (next !== l.spread) { l.spread = next; onSpread(next); }
  };
  /** One page by click, key or bar: the page moves at once and the leaf gets a kick (±0.08 rad a frame). At an end it does
   *  nothing and says so. */
  const step = (dir: 1 | -1) => {
    const l = look.current; if (!l?.active) return false;
    // Reading one page at a time (a phone): forward from the left page shows the right one, back from the right page
    // shows the left one; otherwise the leaf turns and the view comes to the near page of the new spread.
    const view = signals.current.view;
    if (view.reachX > 0 && !view.panning) {
      if (dir > 0 ? view.x < 0 : view.x > 0) { timing.current.panTo = dir * view.reachX; state.current?.invalidate(); return true; }
      timing.current.panTo = -dir * view.reachX;
    }
    const leaf = dir > 0 ? l.spread : l.spread - 1;
    if (leaf < 0 || leaf >= LEAVES) return false;
    l.target[leaf] = dir > 0 ? PI : 0; l.brake[leaf] = null; l.vel[leaf] = 0.08 * dir; leafFx.current[leaf].dragged = false;
    setSpread(l.spread + dir);
    sound.play("pageTurn", 0.5, dir > 0);
    return true;
  };
  /** The leaf a press on this side takes (rF, 04ud:6191-6218): the most upright leaf moving on that side, or else the top
   *  of that side's stack. */
  const pick = (left: boolean, movingOnly = false) => {
    const l = look.current; if (!l) return -1;
    let best = -1, bestSin = -1;
    for (let i = 0; i < LEAVES; i++) {
      const a = l.angle[i], t = l.target[i];
      if (!(l.brake[i] !== null || (t !== null && Math.abs(a - t) > 0.005))) continue;
      const onSide = left ? t === PI || a > PI / 2 : t !== PI || a < PI / 2;
      if (onSide && Math.sin(a) > bestSin) { bestSin = Math.sin(a); best = i; }
    }
    if (best >= 0 || movingOnly) return best;
    if (left) {
      for (let i = LEAVES - 1; i >= 0; i--) if (l.angle[i] > 0.85 * PI) return i;
      for (let i = LEAVES - 1; i >= 0; i--) if (l.angle[i] > PI / 2) return i;
    } else {
      for (let i = 0; i < LEAVES; i++) if (l.angle[i] < 0.15 * PI) return i;
      for (let i = 0; i < LEAVES; i++) if (l.angle[i] < PI / 2) return i;
    }
    return -1;
  };
  /** Release braked leaves: each flies on toward its target with a 0.08 kick. */
  const unbrake = (except = -1) => {
    const l = look.current; if (!l) return;
    for (let i = 0; i < LEAVES; i++) if (i !== except && l.brake[i] !== null) {
      l.brake[i] = null; const t = l.target[i] ?? (l.angle[i] > PI / 2 ? PI : 0); l.vel[i] = 0.08 * Math.sign(t - l.angle[i]);
    }
  };
  const grab = (g: Gesture, leaf: number) => {
    const l = look.current; if (!l || leaf < 0) return;
    unbrake(leaf); l.brake[leaf] = null;
    Object.assign(g, { mode: "drag", leaf, startAngle: l.angle[leaf], prevTarget: l.target[leaf], dragTarget: l.angle[leaf], startX: g.lastX });
    l.target[leaf] = null;
    Object.assign(leafFx.current[leaf], { dragged: true, grabU: hover.current.grabU, grabV: hover.current.grabV });
    if (source) source.dataset.book = "drag";
    sound.play("grab");
  };

  /** Pointer → the spread (rP, 04ud:6140): side by the spine's x, grabU 0 at the spine to 1 at the fore edge, grabV up;
   *  x and y on the flat spread, from the spine. */
  function mapPointer(clientX: number, clientY: number) {
    const box = source?.getBoundingClientRect(), r = rect.current;
    const x = clientX - (box?.left ?? 0), y = clientY - (box?.top ?? 0);
    // One page at a time (a phone): the side is the screen's half, not the spine's.
    const frame = signals.current.frame, single = signals.current.view.reachX > 0;
    const left = single && frame ? x < frame.left + frame.width / 2 : x < r.spine, half = left ? Math.max(r.spine - r.left, 1) : Math.max(r.right - r.spine, 1);
    const inside = r.ready && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    const grabU = clamp01(Math.abs(x - r.spine) / half), grabV = clamp01(1 - (y - r.top) / Math.max(r.bottom - r.top, 1));
    return { left, inside, grabU, grabV, x: (left ? -1 : 1) * grabU * width, y: (grabV - 0.5) * height };
  }
  /** How many leaves a riffle at this point takes: the outer fifth spans the stack, 2 at its inner edge to the whole side
   *  at the fore edge (stripe.press reads the depth where its ray leaves the stack's edge face; flat-stack equivalent). */
  function edgeCount(grabU: number, left: boolean) {
    const l = look.current; if (!l) return 0;
    const side = left ? l.spread : LEAVES - l.spread;
    return side < 2 || grabU <= 0.8 ? 0 : Math.min(side, 2 + Math.round((grabU - 0.8) / 0.2 * (side - 2)));
  }

  // Pointer input on the View's element (stripe.press listens on its book hit-rect and the window, not on meshes).
  useEffect(() => {
    if (!source) return;
    const onDown = (e: PointerEvent) => {
      const l = look.current;
      if (!l?.active || e.button !== 0 || signals.current.view.panning || (e.target as Element | null)?.closest?.("[data-book-ui]")) return;
      // A second finger is a pinch: the page in hand goes back, and the stage's pinch takes over (Review-B r2).
      if (gesture.current || painting.current) { cancel(); if (painting.current) undoStroke(); return; }
      const p = mapPointer(e.clientX, e.clientY);
      if (!p.inside) return; // around the spread: the document's 24 px rule decides
      const now = performance.now(), ink = signals.current.marker;
      if (ink) {
        // Highlighter on: a press paints on the top page of that side instead of turning it.
        const leaf = p.left ? l.spread - 1 : l.spread < LEAVES ? l.spread : -1;
        if (leaf < 0) return;
        const stroke: Stroke = { leaf, back: p.left, ink, points: [p.grabU, p.grabV] };
        paint(stroke, 0); // in flight: painted now, committed (and saved) only when it ends as a stroke
        painting.current = { stroke, at: now, x: e.clientX, y: e.clientY, id: e.pointerId };
        try { source.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
        return;
      }
      const g: Gesture = { id: e.pointerId, mode: "drag", left: p.left, leaf: -1, startAngle: 0, prevTarget: null, downX: e.clientX, downY: e.clientY,
        downAt: now, startX: e.clientX, lastX: e.clientX, lastAt: now, moved: 0, dragTarget: 0, edgeVel: 0, timer: 0 };
      const c = chunk.current;
      if (c.phase === "release") return; // a riffle is landing
      try { source.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
      // An armed fore edge (mouse): the press takes the riffle.
      if (c.phase === "gather" && e.pointerType !== "touch" && c.left === p.left) { g.mode = "edge"; gesture.current = g; return; }
      // Leaves in flight: a press brakes them (their force fades and damping rises over 400 ms); a leaf is taken on a 5 px
      // move (the most upright moving one) or after 200 ms (the next one at rest).
      if (l.angle.some((a) => a > 0.25 && a < PI - 0.25)) {
        for (let i = 0; i < LEAVES; i++) if (l.angle[i] > 0.25 && l.angle[i] < PI - 0.25) l.brake[i] = now;
        g.mode = "brake"; gesture.current = g;
        g.timer = window.setTimeout(() => { if (gesture.current === g && g.mode === "brake") grab(g, pick(g.left)); }, 200);
        return;
      }
      const leaf = pick(p.left);
      if (leaf < 0) { g.mode = "cover"; gesture.current = g; return; } // the cover side at either end: nothing to turn
      if (now < timing.current.lockoutUntil) return; // a settled leaf right after a turn
      gesture.current = g; grab(g, leaf);
    };
    const onMove = (e: PointerEvent) => {
      const l = look.current; if (!l) return;
      const p = mapPointer(e.clientX, e.clientY);
      Object.assign(hover.current, { inside: p.inside, left: p.left, grabU: p.grabU, grabV: p.grabV, x: p.x, y: p.y });
      // Painting: extend the stroke while it stays on the page it started on; the paper rubs with the speed.
      const stroke = painting.current;
      if (stroke && stroke.id === e.pointerId) {
        // A held pan or pinch took over the finger that started a stroke: that stroke is undone (Review-B r3).
        if (signals.current.view.panning) { undoStroke(); return; }
        if (p.left === stroke.stroke.back) {
          const now = performance.now(), speed = Math.hypot(e.clientX - stroke.x, e.clientY - stroke.y) / Math.max(now - stroke.at, 1);
          stroke.stroke.points.push(p.grabU, p.grabV); paint(stroke.stroke, stroke.stroke.points.length - 2);
          Object.assign(stroke, { at: now, x: e.clientX, y: e.clientY }); sound.rub("paper", speed);
        }
        return;
      }
      const g = gesture.current;
      if (!g || g.id !== e.pointerId) {
        if (g) return;
        if (l.active) source.dataset.book = p.inside ? signals.current.marker ? "mark" : "hover" : "";
        // Arming the riffle: mouse, idle, the outer fifth, 2 or more leaves (checked every 40 ms; a 90 ms miss drops it).
        const c = chunk.current, now = performance.now();
        if (l.active && e.pointerType !== "touch" && c.phase !== "release" && now - c.checkedAt > 40) {
          c.checkedAt = now;
          const count = p.inside ? edgeCount(p.grabU, p.left) : 0;
          if (count >= 2) Object.assign(c, { phase: "gather", left: p.left, count, missAt: 0 });
          else if (c.phase === "gather") { if (!c.missAt) c.missAt = now; else if (now - c.missAt > 90) c.phase = "idle"; }
        }
        return;
      }
      // A pinch or a held pan took over: the page goes back to where it was.
      if (signals.current.view.panning) { cancel(); return; }
      const now = performance.now(), stepPx = Math.abs(e.clientX - g.lastX), speed = stepPx / Math.max(now - g.lastAt, 1);
      g.moved = Math.max(g.moved, Math.hypot(e.clientX - g.downX, e.clientY - g.downY));
      sound.rub("paper", speed);
      if (g.mode === "edge") {
        // Fast across the edge commits the riffle; slow re-reads the count along it.
        g.edgeVel = 0.6 * g.edgeVel + 0.4 * stepPx / Math.max(4, now - g.lastAt);
        const c = chunk.current;
        if (g.moved >= 5 && g.edgeVel > 0.7) { Object.assign(c, { phase: "release", commit: true }); gesture.current = null; timing.current.lockoutUntil = now + 250; }
        else if (g.edgeVel < 0.35 && stepPx <= 12) { const count = edgeCount(p.grabU, c.left); if (count >= 2) c.count = count; }
      } else if (g.mode === "brake") {
        if (g.moved >= 5) { const leaf = pick(g.left, true); grab(g, leaf >= 0 ? leaf : pick(g.left)); }
      } else if (g.mode === "drag" && g.leaf >= 0) {
        // Drag → angle (04ud:6540): a 0.08π bite over the first ~12 px, then linear to a full turn at 73% of the window
        // (146% on touch). The fold's tilt and the curl's reach follow where it's held.
        const dx = e.clientX - g.startX, k = e.pointerType === "touch" ? 1.46 : 0.73;
        const travel = PI * Math.min(1, 0.08 * (1 - Math.exp(-Math.abs(dx) / 12)) + 0.92 * Math.min(1, Math.abs(dx) / (window.innerWidth * k)));
        const before = g.dragTarget;
        g.dragTarget = MathUtils.clamp(g.startAngle - Math.sign(dx) * travel, 0, PI);
        if ((before - PI / 2) * (g.dragTarget - PI / 2) < 0) sound.play("pageTurn", Math.min(1, speed), g.dragTarget > PI / 2);
        Object.assign(leafFx.current[g.leaf], { grabU: p.grabU, grabV: p.grabV });
      }
      g.lastX = e.clientX; g.lastAt = now;
    };
    const onUp = (e: PointerEvent) => {
      const stroke = painting.current;
      if (stroke && stroke.id === e.pointerId) {
        // Only a real release keeps the stroke. A cancel, a lost capture or the book hiding (which cancels the pointer)
        // takes it back, as does a held pan that took this finger over; committed marks are never touched (Review-B r3).
        if (e.type !== "pointerup" || signals.current.view.panning) undoStroke();
        else { marks.current?.commit(stroke.stroke); painting.current = null; }
        return;
      }
      const g = gesture.current, l = look.current;
      if (!g || g.id !== e.pointerId || !l) return;
      gesture.current = null; clearTimeout(g.timer);
      source.dataset.book = "";
      // A cancelled pointer (a touch scroll, lost capture, the book hiding) or a pan that took over is never a click.
      if (e.type !== "pointerup" || signals.current.view.panning) { restore(g); return; }
      const now = performance.now(), click = g.moved < 5;
      if (g.mode === "edge") { Object.assign(chunk.current, { phase: "release", commit: true }); timing.current.lockoutUntil = now + 250; return; }
      if (g.mode === "cover") return; // the book never closes from a click on it: only [ X ] and Escape close it
      if (g.mode === "brake") { unbrake(); if (click && now - g.downAt < 400) step(g.left ? -1 : 1); return; }
      // Release (04ud:6561-6612): a click turns by side; a 5 px drag in the turning direction commits; velocity is dropped
      // and the spring (or the shared flight speed) carries the page.
      timing.current.lockoutUntil = now + (click ? 60 : 250);
      const leaf = g.leaf; if (leaf < 0) return;
      l.vel[leaf] = 0;
      if (click) { l.target[leaf] = g.prevTarget ?? (g.startAngle > PI / 2 ? PI : 0); step(g.left ? -1 : 1); return; }
      const dx = e.clientX - g.startX, fromRight = g.startAngle < PI / 2;
      const commit = Math.abs(dx) >= 5 && (fromRight ? dx < 0 : dx > 0);
      const to = commit ? (fromRight ? PI : 0) : (fromRight ? 0 : PI);
      l.target[leaf] = to;
      sound.play(commit ? "pageTurn" : "flop", 0.6, to === PI);
      setSpread(to === PI ? leaf + 1 : leaf);
    };
    const onLeave = () => { hover.current.inside = false; if (!gesture.current) source.dataset.book = ""; if (chunk.current.phase === "gather") chunk.current.phase = "idle"; };
    source.addEventListener("pointerdown", onDown); source.addEventListener("pointermove", onMove); source.addEventListener("pointerleave", onLeave);
    source.addEventListener("pointerup", onUp); source.addEventListener("pointercancel", onUp); source.addEventListener("lostpointercapture", onUp);
    return () => {
      source.removeEventListener("pointerdown", onDown); source.removeEventListener("pointermove", onMove); source.removeEventListener("pointerleave", onLeave);
      source.removeEventListener("pointerup", onUp); source.removeEventListener("pointercancel", onUp); source.removeEventListener("lostpointercapture", onUp);
    };
  });

  /** Drop the gesture in hand (a pinch, a pan, the book closing): its leaf goes back where it was; braked leaves fly on. */
  function cancel() {
    const g = gesture.current; gesture.current = null;
    if (g) { clearTimeout(g.timer); restore(g); }
  }
  function restore(g: Gesture) {
    const l = look.current; if (!l) return;
    unbrake();
    if (g.mode === "drag" && g.leaf >= 0) { l.target[g.leaf] = g.startAngle > PI / 2 ? PI : 0; l.vel[g.leaf] = 0; }
    if (g.mode === "edge") Object.assign(chunk.current, { phase: "release", commit: false });
    timing.current.lockoutUntil = performance.now() + 60;
  }

  const point = useMemo(() => new Vector3(), []);
  useFrame((frameState, delta) => {
    const l = look.current, dt = Math.min(delta, 0.05), f = dt * 60, now = performance.now();
    state.current = frameState;
    if (!l) return;
    // The phone's page-to-page pan (step above).
    const pan = timing.current.panTo, view = signals.current.view;
    if (pan !== null) {
      if (view.panning || view.reachX === 0) timing.current.panTo = null;
      else { view.x += (pan - view.x) * (1 - Math.exp(-10 * dt)); if (Math.abs(pan - view.x) < 1e-3) { view.x = pan; timing.current.panTo = null; } frameState.invalidate(); }
    }
    // Control bar and keys: one page each; at either end they do nothing (06w9:16335-16353).
    while (signals.current.commands.length) { const command = signals.current.commands.shift(); if (l.active) step(command === "back" ? -1 : 1); }
    const shown = l.lu > 0;
    if (group.current) group.current.visible = shown;
    if (!shown) { rect.current.ready = false; signals.current.spreadRect = null; return; }
    if (!l.active && gesture.current) cancel();
    const g = gesture.current, h = hover.current, r = rect.current;

    // Reading position (eased 25% a frame) and the push (04ud:2622-2672). x is the pointer from the spine, in viewport
    // widths. Near the gutter the reading position eases away from the pointer's side (up to 0.2, falling as (1 − n)^5);
    // toward an edge whose side still holds most of the book it is drawn that way (to 0.3 from that end). Fine pointers
    // only; held during a page drag; cross-faded over 400 ms on a side change; eased at rate 7.
    const progress = l.spread / LEAVES;
    l.tx += (progress - l.tx) * perFrame(0.25, f);
    const box = source?.getBoundingClientRect();
    const px = signals.current.pointer.x + 1 - 2 * ((box?.left ?? 0) + r.spine) / window.innerWidth;
    const side = px < 0 ? -1 : 1, n = Math.min(1, Math.abs(px)), ii = 1 - (1 - n) ** 4;
    let pushTarget = timing.current.fine && l.active && r.ready ? -side * 0.2 * (1 - n) ** 5 + side * ii * Math.max(0, 0.3 - (side > 0 ? l.tx : 1 - l.tx)) : 0;
    if (side !== h.lastSide) { if (h.lastSide !== 0) { h.sideSince = now; h.pushFrom = l.push; } h.lastSide = side; }
    const fade = clamp01((now - h.sideSince) / 400);
    if (fade < 1) pushTarget = h.pushFrom + (pushTarget - h.pushFrom) * fade * fade * (3 - 2 * fade);
    if (!(g && g.mode === "drag")) l.push += (pushTarget - l.push) * (1 - Math.exp(-7 * dt));
    const tE = clamp01(l.tx + l.push);
    // The body turns with ld², the same ease as the stacks' curl, so the two cancel all the way in: the right stack stays
    // flat while the pages fan instead of tipping up toward the camera (and past the stage). Unchanged at rest (ld = 1).
    l.n = tE * l.ld * l.ld;

    // Opening: the live leaves around the page (stripe.press's window, 04ud:1787-1864) stand at π/2 until the fan is a
    // fifth in, then fall to their sides; the curl comes in with ld² and a stagger of 90 ms a leaf (420 ms each) from the
    // gutter out (04ud:2499-2502). The rest of the book is the two blocks. Closing stands the live leaves up again.
    const lo = Math.max(0, l.spread - 3), hi = Math.min(LEAVES, l.spread + 3), inWindow = (i: number) => i >= lo && i < hi;
    const holdUpright = l.dir < 0 || l.ld < 0.2;
    if (l.ld <= 0.01) for (let i = 0; i < LEAVES; i++) {
      l.angle[i] = l.render[i] = l.target[i] = inWindow(i) ? PI / 2 : i < l.spread ? PI : 0; l.vel[i] = 0; l.brake[i] = null;
    }
    if (l.dir > 0 && l.ld >= 0.25 && timing.current.fanAt < 0) timing.current.fanAt = now;
    if (l.dir > 0 && l.ld < 0.25) timing.current.fanAt = -1;
    // The sheets show 200 ms after the fan starts (04ud:2916-2921).
    if (l.ld <= 0.03) timing.current.shownAt = -1; else if (timing.current.shownAt < 0) timing.current.shownAt = now;
    if (l.dir > 0) for (let i = lo; i < hi; i++) {
      const k = Math.abs(i + 0.5 - l.spread) - 0.5;
      l.fan[i] = timing.current.fanAt < 0 ? 0 : smooth(0, 1, (now - timing.current.fanAt - 90 * k) / 420);
    }

    // ---- The angle stepper (04ud:334-518) ----
    const dragged = g && g.mode === "drag" ? g.leaf : -1;
    let flying = 0;
    for (let i = 0; i < LEAVES; i++) {
      const t = l.target[i];
      if (i !== dragged && l.brake[i] === null && t !== null && t !== PI / 2 && Math.abs(l.angle[i] - t) > 0.15) flying++;
    }
    for (let i = 0; i < LEAVES; i++) {
      if (i === dragged || l.brake[i] !== null) continue;
      const t = l.target[i], busy = t !== null && t !== PI / 2 && Math.abs(l.angle[i] - t) > 0.1;
      if (!busy) l.target[i] = holdUpright && inWindow(i) ? PI / 2 : i < l.spread ? PI : 0;
    }
    for (let i = 0; i < LEAVES; i++) {
      const before = l.angle[i];
      if (g && i === dragged) {
        l.angle[i] += (g.dragTarget - l.angle[i]) * (1 - 0.4 ** f); l.vel[i] = (l.angle[i] - before) / Math.max(f, 1e-3);
        // A dragged leaf crossing the vertical turns the page (04ud:479-490).
        if ((before - PI / 2) * (l.angle[i] - PI / 2) < 0) setSpread(l.angle[i] > PI / 2 ? i + 1 : i);
      } else {
        const bp = l.brake[i] === null ? null : clamp01((now - (l.brake[i] as number)) / 400);
        const force = bp === null ? 1 : 1 - bp, extra = bp === null ? 0 : 0.035 + 0.465 * bp, t = l.target[i];
        if (t === null) {
          // Coasting (no target): gravity toward the nearer side, with friction.
          const near = l.angle[i] > PI / 2 ? PI : 0, err = near - l.angle[i];
          l.vel[i] += 0.003 * Math.sign(err) * Math.sin(Math.min(Math.abs(err), PI / 2)) * f * force;
          l.vel[i] *= Math.max(0, 0.985 - extra) ** f; l.angle[i] += l.vel[i] * f;
          if (Math.abs(l.vel[i]) < 0.001 && Math.abs(err) < 0.05) l.target[i] = near;
        } else {
          const err = t - l.angle[i];
          if (flying > 1 && bp === null) {
            const move = Math.min(Math.abs(err), 0.18 * f); l.angle[i] += Math.sign(err) * move; l.vel[i] = Math.sign(err) * 0.18;
          } else {
            const near = 1 - Math.min(Math.abs(err) / (0.3 * PI), 1), damp = Math.min(0.98, 0.4 * DAMPING + near * near * 0.55 + extra);
            l.vel[i] += 0.008 * Math.sign(err) * Math.sin(Math.min(Math.abs(err), PI / 2)) * f * force;
            l.vel[i] *= (1 - damp) ** f;
            if (bp !== null && bp >= 1) l.vel[i] = 0;
            l.angle[i] += l.vel[i] * f;
          }
          if (Math.abs(t - l.angle[i]) < 0.005 && Math.abs(l.vel[i]) < 5e-4) { l.angle[i] = t; l.vel[i] = 0; }
        }
      }
      l.angle[i] = MathUtils.clamp(l.angle[i], 0, PI);
      // Tip-fold blend: the no-pass gap grows as a leaf leaves either stack.
      l.tip[i] += (clamp01(Math.min(l.angle[i], PI - l.angle[i]) / (0.15 * PI)) - l.tip[i]) * perFrame(0.02, f);
    }
    // Leaves never pass each other: a lower leaf stays under the one above it (0.02–0.06 rad, closing up on the left).
    for (let i = 0; i < LEAVES - 1; i++) {
      const gap = (0.02 + 0.04 * Math.max(l.tip[i], l.tip[i + 1])) * smooth(0, 1, (PI - l.angle[i]) / 0.15);
      if (l.angle[i + 1] > Math.max(0, l.angle[i] - gap)) { l.angle[i + 1] = Math.max(0, l.angle[i] - gap); l.vel[i + 1] = Math.min(l.vel[i + 1], l.vel[i]); }
    }
    for (let i = 0; i < LEAVES; i++) l.render[i] += (l.angle[i] - l.render[i]) * (1 - 0.15 ** f);

    // ---- The riffle (04ud:2198-2268): gather lifts the block 16°; release carries it over (rate 7, at least 0.9/s) ----
    const c = chunk.current;
    if (c.phase === "gather") c.lift += (1 - c.lift) * (1 - Math.exp(-12 * dt));
    else if (c.phase === "release") {
      const goal = c.commit ? 1 : 0, move = Math.max(Math.abs(goal - c.p) * (1 - Math.exp(-7 * dt)), 0.9 * dt);
      c.p = c.p < goal ? Math.min(c.p + move, goal) : Math.max(c.p - move, goal);
      c.lift += ((goal === 1 ? 1 - smooth(0.55, 0.95, c.p) : 0) - c.lift) * (1 - Math.exp(-10 * dt));
      if (c.p === goal && (goal === 1 || c.lift < 0.01)) {
        if (c.commit) {
          // Landed: the block's leaves lie on the far side and the page moves by the count.
          const from = c.left ? l.spread - c.count : l.spread;
          for (let i = from; i < from + c.count; i++) { l.angle[i] = l.render[i] = c.left ? 0 : PI; l.target[i] = c.left ? 0 : PI; l.vel[i] = 0; }
          setSpread(c.left ? l.spread - c.count : l.spread + c.count);
          sound.play("pageTurn", 0.8, !c.left);
        }
        Object.assign(c, { phase: "idle", p: 0, lift: 0, commit: false });
      }
    } else c.lift += (0 - c.lift) * (1 - Math.exp(-12 * dt));
    const chunkOn = c.phase !== "idle" || c.lift > 0.01, chunkFrom = c.left ? l.spread - c.count : l.spread;
    const inChunk = (i: number) => chunkOn && i >= chunkFrom && i < chunkFrom + c.count;
    const chunkAngle = c.left ? PI - c.p * PI - MathUtils.degToRad(16) * c.lift : c.p * PI + MathUtils.degToRad(16) * c.lift;

    // ---- Drawing ----
    // Depths (04ud:2509, 2593): a leaf lies (split − i) spacings along its normal from the top of its stack, and the whole
    // stack is centred on the spine by ((N − 1)/2 − split) spacings, so the roots spread across the spine's width.
    const offsetOf = (i: number) => (l.spread - i) * per, stack = ((LEAVES - 1) / 2 - l.spread) * per;
    const ld2 = l.ld * l.ld, open = l.ld, fx = leafFx.current;
    const hovered = h.inside && l.active && !g ? pick(h.left) : -1;
    const dragCurl = 1.82 * CURL_RAD * open, peekCurl = CURL_RAD * open * 0.14 * 2;
    let topRight = -1, topLeft = -1;
    for (let i = 0; i < LEAVES; i++) if (!inChunk(i) && l.render[i] < PI / 2) { topRight = i; break; }
    for (let i = LEAVES - 1; i >= 0; i--) if (!inChunk(i) && l.render[i] >= PI / 2) { topLeft = i; break; }
    // The live leaves: the two top leaves and every leaf in flight, nearest the page first, up to SLOTS. A leaf in flight
    // that gets no slot lands at once (stripe.press recycles its six live leaves the same way).
    const live: number[] = [];
    if (l.ld > 0.03 && timing.current.shownAt >= 0 && now - timing.current.shownAt >= 200) {
      const moving: number[] = [];
      for (let i = 0; i < LEAVES; i++) if (!inChunk(i) && Math.abs(l.render[i] - (l.render[i] < PI / 2 ? 0 : PI)) >= 0.002) moving.push(i);
      moving.sort((x, y) => Math.abs(x + 0.5 - l.spread) - Math.abs(y + 0.5 - l.spread));
      for (const i of [topRight, topLeft, ...moving]) if (i >= 0 && !live.includes(i) && live.length < SLOTS) live.push(i);
      for (const i of moving) if (!live.includes(i)) { const side = l.target[i] ?? (l.angle[i] > PI / 2 ? PI : 0); l.angle[i] = l.render[i] = side; l.target[i] = side; l.vel[i] = 0; }
    }
    // Slots keep their leaf while it stays live; a freed slot takes a new leaf and draws its pages.
    slots.forEach((slot) => { if (!live.includes(slot.leaf)) slot.leaf = -1; });
    for (const i of live) {
      if (slots.some((slot) => slot.leaf === i)) continue;
      const slot = slots.find((candidate) => candidate.leaf < 0); if (!slot) break;
      slot.leaf = i; drawPage(slot.faces[0], 2 * i + 1); drawPage(slot.faces[1], 2 * i + 2);
    }
    let rightCount = 0, leftCount = 0, rightFirst = LEAVES, leftLast = -1;
    for (let i = 0; i < LEAVES; i++) {
      if (live.includes(i) || inChunk(i)) continue;
      if (l.render[i] < PI / 2) { rightCount++; rightFirst = Math.min(rightFirst, i); } else { leftCount++; leftLast = Math.max(leftLast, i); }
    }
    slots.forEach((slot, k) => {
      const mesh = slotMeshes.current[k]; if (!mesh) return;
      mesh.visible = slot.leaf >= 0;
      if (slot.leaf < 0) return;
      const i = slot.leaf, a = l.render[i], uni = slot.uniforms, e = fx[i], right = a < PI / 2;
      // Its pages: the product's page images where there are some, otherwise the drawn placeholder pages; and its ink.
      const front = maps[2 * i] ?? slot.faces[0].texture, back = maps[2 * i + 1] ?? slot.faces[1].texture;
      const inkFront = surfaces.current.get(i + "f"), inkBack = surfaces.current.get(i + "b");
      uni.uFront.value = front; uni.uBack.value = back; uni.uHasFront.value = 1; uni.uHasBack.value = 1;
      uni.uInkFront.value = inkFront?.texture ?? null; uni.uHasInkFront.value = inkFront ? 1 : 0;
      uni.uInkBack.value = inkBack?.texture ?? null; uni.uHasInkBack.value = inkBack ? 1 : 0;
      // liveCurl (04ud:2504): f is the leaf's turn state; lying right it curls by −x, lying left by 1 − x.
      const fTurn = smooth(0, 1, (a / PI - 0.03) / 0.87), droop = (1 - fTurn) * tE + fTurn * (1 - tE);
      const curl = (-(1 - fTurn) * tE + fTurn * (1 - tE)) * (inWindow(i) ? l.fan[i] : 1) * ld2;
      uni.uCurl.value = curl; uni.uThin.value = smooth(0.6, 1, droop);
      uni.uFlop.value = -Math.tanh(8 * curl) * 0.6 * Math.max(0, (Math.sin(a) - 0.6) / 0.4);
      // Tip flop while dragged (04ud:2511-2536): mid-turn, the tip leads in the direction of the drag.
      const dragging = i === dragged, turn = a / PI, band = 1 - smooth(0, 1, Math.abs(turn - 0.5) / 0.28);
      e.flop += ((dragging && g ? band * Math.tanh((g.dragTarget - PI / 2) * 6) : 0) - e.flop) * perFrame(0.18, f);
      if (Math.abs(e.flop) < 1e-4) e.flop = 0;
      uni.uTipFlop.value = e.flop * smooth(0.08, 0.3, Math.min(turn, 1 - turn)) * 1.6;
      // The top leaf under the pointer sits a half spacing clear of the next (04ud:1176-1182); it never lifts as a whole.
      const nudgeOn = i === (h.left ? topLeft : topRight) && h.inside && l.active;
      e.nudge += ((nudgeOn ? open * (1 - Math.abs(Math.sin(l.angle[i]))) : 0) - e.nudge) * (1 - Math.exp(-9 * dt));
      if (e.nudge < 1e-4) e.nudge = 0;
      uni.uOffset.value = offsetOf(i) + (right ? 1 : -1) * 0.5 * per * e.nudge; uni.uDepth.value = 0; uni.uStack.value = stack;
      // Corner curl (04ud:1287-1354): dragging rolls the held corner (target 12.8), hovering peeks (1.97), a released
      // flight keeps rolling (shown through a 0.1 s smoothDamp), otherwise it relaxes. The fold tilts with the hold.
      const isHovered = i === hovered, target = l.target[i];
      const flight = l.ld > 0.98 && !dragging && !isHovered && target !== null && a > 0.15 && a < PI - 0.15 && Math.abs(l.vel[i]) > 0.02;
      if (dragging) e.curl += (dragCurl - e.curl) * perFrame(0.04, f);
      else if (isHovered) { e.curl = Math.min(e.curl, peekCurl); e.curl += (peekCurl - e.curl) * perFrame(0.06, f); }
      else if (flight) e.curl += (dragCurl - e.curl) * perFrame(0.1, f);
      else { e.curl += (0 - e.curl) * perFrame(0.05, f); if (e.curl < 0.01) e.curl = 0; }
      if (isHovered) Object.assign(e, { grabU: h.grabU, grabV: h.grabV });
      const tilt = flight ? Math.sign(e.grabV - 0.5 || 1) * Math.max(MathUtils.degToRad(30), Math.abs((e.grabV - 0.5) * 2 * FOLD_TILT)) : (e.grabV - 0.5) * 2 * FOLD_TILT;
      e.tilt += (tilt - e.tilt) * perFrame(dragging ? 0.15 : 0.3, f);
      const toward = target === PI ? a / PI : 1 - a / PI, nearSpine = 1 - (flight ? 1 : e.grabU);
      if (flight) {
        const goal = e.curl * (1 - smooth(0.6, 0.9, toward)) * 0.84 * (1 + 0.5 * (1 - smooth(0.35, 0.5, toward)));
        if (goal < e.amount) { e.amount = goal; e.amountV = 0; }
        else {
          // Unity-style smoothDamp, 0.1 s (12s2:2637).
          const omega = 20, t = Math.min(dt, 1 / 30), x = omega * t, decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
          const change = e.amount - goal, temp = (e.amountV + omega * change) * t;
          e.amountV = (e.amountV - omega * temp) * decay; e.amount = goal + (change + temp) * decay;
        }
      } else { e.amount = e.curl * (1 - 0.55 * nearSpine); e.amountV = 0; }
      const shownCurl = e.dragged || dragging || isHovered ? smooth(0, 0.17, Math.abs(Math.cos(a))) : Math.abs(Math.cos(a));
      uni.uCurlAmount.value = e.amount * shownCurl;
      uni.uCurlAngle.value = e.tilt;
      uni.uSpan.value = SPAN * width / STRIPE_PAGE_W * (1 + 1.2 * nearSpine);
      uni.uLiftSign.value = Math.cos(a) >= 0 ? 1 : -1;
      if (!dragging && target !== null && Math.abs(a - target) < 0.005) e.dragged = false;
    });

    // The fan (stripe.press's open, 1260–1432 ms: a block rises with thin sheets fanning off it): the left stack's
    // cover-side leaves peel off ahead of it one by one, following the cover, and land under it; the rest of the stack
    // follows as the block. Driven by ld, so closing mirrors opening and every sheet meets the block's pose at ld = 1.
    const peeled: number[] = [];
    if (l.ld > 0.03 && l.ld < 0.999) {
      const peelCount = Math.max(0, Math.min(PEEL, leftCount - 2));
      for (let i = 0; i < LEAVES && peeled.length < peelCount; i++) if (!live.includes(i) && !inChunk(i) && l.render[i] >= PI / 2) peeled.push(i);
    }
    peelMeshes.current.forEach((mesh, j) => {
      if (!mesh) return;
      const i = peeled[j];
      mesh.visible = i !== undefined;
      if (i === undefined) return;
      // The cover-side sheet leads most (done by ld 0.6), the fifth by ld 0.92; the block arrives at ld 1.
      const uni = peels[j].uniforms, lead = clamp01(l.ld / (1 - 0.4 * (PEEL - j) / PEEL));
      uni.uCurl.value = (1 - tE) * lead * lead; uni.uThin.value = smooth(0.6, 1, 1 - tE);
      uni.uFlop.value = 0; uni.uTipFlop.value = 0; uni.uCurlAmount.value = 0;
      uni.uOffset.value = offsetOf(i); uni.uDepth.value = 0; uni.uStack.value = stack; uni.uLiftSign.value = -1;
    });

    // The page blocks (3fe6:5187-5233): the resting leaves of each side under its top leaf, bent with that side's curl,
    // and a riffled run of leaves as one block turning over. Their page edges are lifted toward paper white.
    blockMeshes.current.forEach((mesh, k) => {
      if (!mesh) return;
      const uni = blocks[k].uniforms;
      uni.uFlop.value = 0; uni.uTipFlop.value = 0; uni.uCurlAmount.value = 0; uni.uStack.value = stack; uni.uEdgeLift.value = 0.45;
      if (k < 2) {
        const isLeft = k === 1, count = isLeft ? leftCount - peeled.length : rightCount;
        mesh.visible = count > 0;
        if (!count) return;
        uni.uCurl.value = (isLeft ? 1 - tE : -tE) * ld2; uni.uThin.value = smooth(0.6, 1, isLeft ? 1 - tE : tE);
        // Right: depths run down from the leaf under the top one; left: the other way (the left sheets' normal points down).
        uni.uOffset.value = isLeft ? offsetOf(leftLast) - 0.5 * per : offsetOf(rightFirst) + 0.5 * per;
        uni.uDepth.value = isLeft ? -count * per : count * per;
        uni.uLiftSign.value = isLeft ? -1 : 1;
        return;
      }
      mesh.visible = chunkOn && c.count > 0;
      if (!mesh.visible) return;
      const fTurn = smooth(0, 1, (chunkAngle / PI - 0.03) / 0.87);
      uni.uCurl.value = (-(1 - fTurn) * tE + fTurn * (1 - tE)) * ld2; uni.uThin.value = smooth(0.6, 1, (1 - fTurn) * tE + fTurn * (1 - tE));
      uni.uOffset.value = c.left ? 0.5 * per : 0.5 * per; uni.uDepth.value = c.left ? -c.count * per : c.count * per;
      uni.uLiftSign.value = Math.cos(chunkAngle) >= 0 ? 1 : -1;
    });
    if (group.current) group.current.position.set(-width / 2 - 0.075, 0, 0);

    // The spread's rect on screen and the spine's x (laid flat, turned into the body's frame), for the pointer mapping
    // and the outside-click close.
    if (group.current && source) {
      group.current.updateWorldMatrix(true, false);
      const w = source.clientWidth, hgt = source.clientHeight, matrix = group.current.matrixWorld;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const toScreen = (x: number, y: number) => {
        toBody(point.set(x, y, 0), l.n).applyMatrix4(matrix).project(frameState.camera);
        return [(point.x + 1) / 2 * w, (1 - point.y) / 2 * hgt];
      };
      for (const x of [-width, 0, width]) for (const y of [-height / 2, height / 2]) {
        const [sx, sy] = toScreen(x, y); minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
      }
      Object.assign(r, { left: minX, right: maxX, top: minY, bottom: maxY, spine: toScreen(0, 0)[0], ready: l.ld > 0.3 });
      // The open book's hit area is this rect (book.tsx), once the pages are in.
      signals.current.spreadRect = r.ready ? { left: minX, top: minY, right: maxX, bottom: maxY } : null;
    }

    // The 3D marker over the page: follows the pointer, rolls (±0.4) and pitches (±0.2) with its velocity on a spring
    // (120, damping 13), and lifts when not pressed. stripe.press's 0.07 lift is scaled to this model.
    const ink = signals.current.marker, m = markerMotion.current;
    if (marker.current) {
      marker.current.visible = Boolean(ink && l.active && h.inside);
      if (ink) markerMaterial.color.setHex(INK[ink].hex);
      const vx = (h.x - m.lastX) / Math.max(dt, 1e-3), vy = (h.y - m.lastY) / Math.max(dt, 1e-3); m.lastX = h.x; m.lastY = h.y;
      m.x += (h.x - m.x) * (1 - Math.exp(-30 * dt)); m.y += (h.y - m.y) * (1 - Math.exp(-30 * dt));
      m.rollV += (120 * (MathUtils.clamp(vx * 0.02, -0.4, 0.4) - m.roll) - 13 * m.rollV) * dt; m.roll += m.rollV * dt;
      m.pitchV += (120 * (MathUtils.clamp(-vy * 0.02, -0.2, 0.2) - m.pitch) - 13 * m.pitchV) * dt; m.pitch += m.pitchV * dt;
      m.lift += ((painting.current ? 0 : 0.35) - m.lift) * (1 - Math.exp(-20 * dt));
      marker.current.position.copy(toBody(point.set(m.x, m.y, 0.06 + m.lift), l.n));
      marker.current.rotation.set(0.5 + m.pitch, m.roll + PI * l.n, 0, "YXZ");
    }
    // Anything still moving keeps the frames coming (the canvas renders on demand).
    if (g || chunkOn || Math.abs(l.push - pushTarget) > 1e-4 || Math.abs(l.tx - progress) > 1e-4 || fx.some((e) => e.curl > 0 || e.nudge > 0 || e.flop !== 0)
      || l.angle.some((a, i) => Math.abs(a - l.render[i]) > 1e-4 || l.vel[i] !== 0 || (l.target[i] !== null && Math.abs(a - (l.target[i] as number)) > 1e-4))
      || l.fan.some((v) => v > 0 && v < 1)) frameState.invalidate();
  });

  // Sheets don't take the pointer (noPick): input is mapped on the spread's screen rect. Leaves cast no shadow yet: three's
  // shadow pass would draw them flat (it doesn't run the bend), so that waits for a matching depth material.
  return <group ref={group} visible={false}>
    <group ref={marker} visible={false}><mesh geometry={markerGeometry} material={markerMaterial} castShadow raycast={noPick} /></group>
    {blocks.map(({ material }, k) => <group key={"block" + k} ref={(g) => { blockMeshes.current[k] = g; }}>
      <mesh geometry={block} material={material} receiveShadow raycast={noPick} />
    </group>)}
    {peels.map(({ material }, k) => <group key={"peel" + k} ref={(g) => { peelMeshes.current[k] = g; }} visible={false}>
      <mesh geometry={geometry} material={material} receiveShadow raycast={noPick} />
    </group>)}
    {slots.map(({ material }, k) => <group key={k} ref={(g) => { slotMeshes.current[k] = g; }}>
      <mesh geometry={geometry} material={material} receiveShadow raycast={noPick} />
    </group>)}
  </group>;
}
