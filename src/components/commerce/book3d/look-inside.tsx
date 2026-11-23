"use client";
// The leaves' uniforms and the shared page state are live GPU and frame state, not React state: frames and pointer
// handlers change them in place (as menu-gradient.tsx does for its uniforms).
/* eslint-disable react-hooks/immutability */

import { useTexture } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { BookSignals } from "./book";
import type { BookSound } from "./book-sound";
import { BoxGeometry, CanvasTexture, DoubleSide, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Vector2, type Group, type Texture } from "three";

/** Shared between the book (open/close timeline, pose) and the pages (physics, gestures). */
export type LookState = {
  /** Open timeline in seconds: 0 closed, OPEN_SECONDS fully open. dir +1 opening, -1 closing. */
  t: number; dir: 1 | -1;
  /** The pages take input only once the book is fully open. */
  active: boolean;
  angle: number[]; vel: number[]; target: (number | null)[]; bend: number[];
  /** Spread: how many leaves lie on the left. */
  spread: number;
};

const noPick = () => {};
export const LEAVES = 12, OPEN_SECONDS = 0.61 + 0.05 * LEAVES + 0.4;
const PI = Math.PI;
const smoothstep = (x: number) => { const c = MathUtils.clamp(x, 0, 1); return c * c * (3 - 2 * c); };

/** Where the open timeline is at time t (map §C2 #15): book 1.1 s, cover 0.98 s from 0.12 s, leaves settle after half cover. */
export function openCurves(t: number) {
  return { book: smoothstep(t / 1.1), cover: smoothstep((t - 0.12) / 0.98), settle: (i: number) => smoothstep((t - 0.61 - 0.05 * i) / 0.4) };
}

export function createLookState(spread: number): LookState {
  return { t: 0, dir: -1, active: false, angle: Array(LEAVES).fill(0), vel: Array(LEAVES).fill(0), target: Array(LEAVES).fill(null),
    bend: Array(LEAVES).fill(0), spread };
}

/** Leaf bend, written fresh: the leaf's angle about the spine plus a lag bend and a corner curl, integrated along the page. */
function createLeafMaterial(width: number, height: number, front?: Texture, back?: Texture) {
  const uniforms = {
    uAngle: { value: 0 }, uBend: { value: 0 }, uCurl: { value: 0 }, uCurlPower: { value: 2 }, uCurlSign: { value: 1 },
    uPivot: { value: new Vector2(1, 0) }, uCurlDir: { value: new Vector2(0.7071, -0.7071) }, uWidth: { value: width }, uHeight: { value: height },
    uFront: { value: front ?? null }, uBack: { value: back ?? null }, uHasFront: { value: front ? 1 : 0 }, uHasBack: { value: back ? 1 : 0 },
    // Highlighter ink, one layer per side, painted at runtime.
    uInkFront: { value: null as Texture | null }, uInkBack: { value: null as Texture | null }, uHasInkFront: { value: 0 }, uHasInkBack: { value: 0 }
  };
  const material = new MeshStandardMaterial({ color: 0xf3f3f1, roughness: 0.92, side: DoubleSide });
  material.customProgramCacheKey = () => "book3d-leaf";
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        uniform float uAngle, uBend, uCurl, uCurlPower, uCurlSign, uWidth, uHeight;
        uniform vec2 uPivot, uCurlDir;
        varying vec2 vLeafUv;
        float leafPhase(float s, float v) {
          float u = s / uWidth;
          float curl = pow(max(0.0, dot(vec2(u, v) - uPivot, uCurlDir)), uCurlPower);
          // The bend is taken up near the spine and the free edge runs straight, as paper turns about its hinge
          // (owner, 24 Nov: a real leaf turn, not pages flung from the spine). u(2 - u): full slope at the hinge, none at the edge.
          return uAngle + uBend * u * (2.0 - u) + uCurl * curl * uCurlSign;
        }`)
      .replace("#include <beginnormal_vertex>", `
        float leafV = position.y / uHeight + 0.5;
        vec2 leafP = vec2(0.0);
        float leafDs = position.x / 24.0;
        for (int i = 0; i < 24; i++) {
          float ph = leafPhase((float(i) + 0.5) * leafDs, leafV);
          leafP += vec2(cos(ph), sin(ph)) * leafDs;
        }
        float leafPhi = leafPhase(position.x, leafV);
        vec3 objectNormal = vec3(-sin(leafPhi), 0.0, cos(leafPhi));`)
      .replace("#include <begin_vertex>", "vec3 transformed = vec3(leafP.x, position.y, leafP.y);\nvLeafUv = uv;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uFront, uBack, uInkFront, uInkBack;\nuniform float uHasFront, uHasBack, uHasInkFront, uHasInkBack;\nvarying vec2 vLeafUv;")
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

type Gesture = {
  leaf: number; dir: 1 | -1; startAngle: number; downX: number; downY: number; downAt: number; lastX: number; lastAt: number;
  speed: number; v: number; edge: boolean; moved: number; braked: boolean;
};

/**
 * Look inside, part 1 (map §C2 #15–26): leaves that turn by drag (with curl from where you grab), click, flick or riffle
 * at the fore edge, and trackpad swipe; pages in flight can be caught; they never pass each other; hovering lifts and
 * curls the page under the cursor and pushes the block near the screen's edge. Tapping past either end closes.
 */
export function LookInside({ look, root, signals, sound, width, height, thickness, pageTextures, marksKey, onClose, onSpread }: {
  look: RefObject<LookState | null>; root: RefObject<Group | null>; signals: RefObject<BookSignals>; sound: BookSound;
  width: number; height: number; thickness: number;
  /** Page images in reading order: page 1 (leaf 1 front), page 2 (leaf 1 back), ... Missing pages show blank. */
  pageTextures: string[];
  /** localStorage key for the highlighter's marks (#28). */
  marksKey?: string;
  onClose: () => void; onSpread: (spread: number) => void;
}) {
  const maps = useTexture(pageTextures) as Texture[];
  const leaves = useMemo(() => Array.from({ length: LEAVES }, (_, i) => createLeafMaterial(width, height, maps[2 * i], maps[2 * i + 1])), [maps, width, height]);
  const geometry = useMemo(() => { const g = new PlaneGeometry(width, height, 96, 8); g.translate(width / 2, 0, 0); return g; }, [width, height]);
  const block = useMemo(() => new BoxGeometry(width, height, 1), [width, height]);
  const blockMaterial = useMemo(() => new MeshStandardMaterial({ color: 0xe9e9e6, roughness: 0.95 }), []);
  // The leaves bend only in their shader, so the pointer is picked on one flat plane over the whole spread instead;
  // side, u and v come from where it hits (stripe.press picks analytically the same way).
  const hitGeometry = useMemo(() => new PlaneGeometry(width * 2, height), [width, height]);
  const hitMaterial = useMemo(() => new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), []);
  useEffect(() => () => {
    geometry.dispose(); block.dispose(); blockMaterial.dispose(); hitGeometry.dispose(); hitMaterial.dispose(); leaves.forEach((l) => l.material.dispose());
  }, [geometry, block, blockMaterial, hitGeometry, hitMaterial, leaves]);

  const group = useRef<Group>(null), hit = useRef<Mesh>(null), leafGroups = useRef<(Group | null)[]>([]), rightBlock = useRef<Mesh>(null), leftBlock = useRef<Mesh>(null);
  const source = useThree((state) => state.events.connected) as HTMLElement | undefined;
  const gesture = useRef<Gesture | null>(null);
  const hover = useRef({ side: "" as "" | "left" | "right", x: 0, y: 0, v: 0, lift: 0, curl: 0, edge: 0, edgeSince: -1, brakeUntil: 0, swipe: 0, swipeAt: 0, lastTurnAt: 0, clock: 0 });

  // Highlighter (#28): each page side gets an ink canvas on first use; strokes are kept as page coordinates, so they replay
  // onto fresh canvases and save small. Marks are kept in localStorage (debounced 400 ms).
  const surfaces = useRef(new Map<string, { context: CanvasRenderingContext2D; canvas: HTMLCanvasElement; texture: CanvasTexture }>());
  const strokes = useRef<Stroke[]>([]), painting = useRef<null | { stroke: Stroke; at: number; x: number; y: number }>(null), saveTimer = useRef(0);
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
      const uni = leaves[leaf].uniforms;
      if (back) { uni.uInkBack.value = found.texture; uni.uHasInkBack.value = 1; } else { uni.uInkFront.value = found.texture; uni.uHasInkFront.value = 1; }
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
  const saveMarks = () => {
    if (!marksKey) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { try { window.localStorage.setItem(marksKey, JSON.stringify(strokes.current)); } catch { /* storage unavailable */ } }, 400);
  };
  useEffect(() => {
    // New leaf materials (new page images) start with fresh canvases; the saved strokes replay onto them.
    surfaces.current.forEach(({ texture }) => texture.dispose()); surfaces.current.clear();
    try { strokes.current = marksKey ? JSON.parse(window.localStorage.getItem(marksKey) ?? "[]") as Stroke[] : []; } catch { strokes.current = []; }
    strokes.current.forEach((stroke) => { if (stroke.leaf >= 0 && stroke.leaf < LEAVES && INK[stroke.ink]) paint(stroke, 0); });
    // paint() reads leaves (a dependency) and the stable refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaves, marksKey]);
  useEffect(() => () => { window.clearTimeout(saveTimer.current); markerMaterial.dispose(); markerGeometry.dispose(); surfaces.current.forEach(({ texture }) => texture.dispose()); }, [markerMaterial, markerGeometry]);

  // The leaves' hinge in book space: the page block's spine edge.
  const spine = -width / 2 - 0.075;
  const resting = (i: number) => { const l = look.current; return l ? l.target[i] ?? (l.angle[i] > PI / 2 ? PI : 0) : 0; };
  const firstForward = () => { for (let i = 0; i < LEAVES; i++) if (resting(i) !== PI) return i; return -1; };
  const lastBack = () => { for (let i = LEAVES - 1; i >= 0; i--) if (resting(i) === PI) return i; return -1; };
  /** Turn one leaf forward or back; past either end the book closes (#25). */
  const turn = (dir: 1 | -1) => {
    const i = dir > 0 ? firstForward() : lastBack();
    if (i < 0) { onClose(); return; }
    if (look.current) look.current.target[i] = dir > 0 ? PI : 0;
    sound.play("pageTurn", 0.5, dir > 0);
  };
  /** Several leaves at once (riffle): they travel together as one block (#23). */
  const turnMany = (dir: 1 | -1, count: number) => {
    for (let n = 0; n < count; n++) { const i = dir > 0 ? firstForward() : lastBack(); if (i < 0 || !look.current) break; look.current.target[i] = dir > 0 ? PI : 0; }
  };

  /** The pointer on the pages: which side of the spine, and how far up the page (0 bottom, 1 top). */
  function pageCoords(event: ThreeEvent<PointerEvent>) {
    const local = root.current ? root.current.worldToLocal(event.point.clone()) : event.point;
    const side: "left" | "right" = local.x >= spine ? "right" : "left";
    return { side, u: MathUtils.clamp(Math.abs(local.x - spine) / width, 0, 1), v: MathUtils.clamp(local.y / height + 0.5, 0, 1), x: local.x, y: local.y };
  }

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    const l = look.current;
    if (!l?.active || signals.current.view.panning || (event.nativeEvent.target as Element | null)?.closest?.("[data-book-ui]")) return;
    event.stopPropagation();
    const { side, u, v } = pageCoords(event), e = event.nativeEvent, now = performance.now();
    // Highlighter on: a press paints on the top page of that side instead of turning it.
    const ink = signals.current.marker;
    if (ink) {
      const leaf = side === "right" ? (l.spread < LEAVES ? l.spread : -1) : l.spread - 1;
      if (leaf < 0) return;
      const stroke: Stroke = { leaf, back: side === "left", ink, points: [u, v] };
      strokes.current.push(stroke); paint(stroke, 0);
      painting.current = { stroke, at: now, x: e.clientX, y: e.clientY };
      const target = source ?? (e.target as HTMLElement);
      const end = () => {
        target.removeEventListener("pointerup", end); target.removeEventListener("pointercancel", end); target.removeEventListener("lostpointercapture", end);
        if (!painting.current) return;
        painting.current = null; saveMarks();
      };
      try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
      target.addEventListener("pointerup", end); target.addEventListener("pointercancel", end); target.addEventListener("lostpointercapture", end);
      return;
    }
    // Catch pages in flight (#22): pressing while leaves are airborne brakes them over 400 ms.
    const flying = l.target.some((t, i) => t !== null && Math.abs(t - l.angle[i]) > 0.02);
    if (flying) { hover.current.brakeUntil = hover.current.clock + 0.4; l.target = l.target.map(() => null); }
    const dir: 1 | -1 = side === "right" ? 1 : -1, leaf = dir > 0 ? firstForward() : lastBack();
    gesture.current = { leaf, dir, startAngle: leaf >= 0 ? l.angle[leaf] : 0, downX: e.clientX, downY: e.clientY, downAt: now, lastX: e.clientX, lastAt: now,
      speed: 0, v, edge: u > 0.9, moved: 0, braked: flying };
    if (source) source.dataset.book = "drag";
    sound.play("grab");
    const pageWidthPx = Math.max(160, (source?.clientWidth ?? 800) / 2);
    const move = (m: PointerEvent) => {
      const g = gesture.current; if (!g) return;
      // A pinch or a held pan took over: the page goes back to where it was.
      if (signals.current.view.panning) {
        if (g.leaf >= 0) l.target[g.leaf] = g.startAngle > PI / 2 ? PI : 0;
        gesture.current = null; return;
      }
      const t = performance.now(), d = (g.downX - m.clientX) * g.dir; // distance dragged in the turn direction
      g.speed = Math.abs(m.clientX - g.lastX) / Math.max(t - g.lastAt, 1); g.lastX = m.clientX; g.lastAt = t;
      g.moved = Math.max(g.moved, Math.hypot(m.clientX - g.downX, m.clientY - g.downY));
      sound.rub("paper", g.speed);
      if (g.edge || g.leaf < 0) return; // riffle: the flick decides on release
      // Drag curve (#20): a quick start, then linear with distance across the page.
      const travel = PI * (0.08 * (1 - Math.exp(-Math.max(d, 0) / 12)) + 0.92 * d / pageWidthPx);
      l.target[g.leaf] = MathUtils.clamp(g.startAngle + g.dir * travel, 0, PI);
      // Where you grab sets the curl pivot; vertical drag tilts the fold (up to 31.5°).
      const tilt = MathUtils.clamp((m.clientY - g.downY) / 200, -1, 1) * MathUtils.degToRad(31.5);
      const uni = leaves[g.leaf].uniforms;
      uni.uPivot.value.set(g.dir > 0 ? 1 : 0, g.v); uni.uCurlDir.value.set(Math.cos(tilt) * g.dir, Math.sin(tilt));
    };
    // Captured on the stage: the page follows the drag past the stage until release; no window listeners.
    const target = source ?? (e.target as HTMLElement);
    const up = (u: PointerEvent) => {
      target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", up); target.removeEventListener("pointercancel", up);
      target.removeEventListener("lostpointercapture", up);
      if (source) source.dataset.book = "";
      const g = gesture.current; gesture.current = null; if (!g) return;
      const quick = g.moved < 5 && performance.now() - g.downAt < 400;
      if (quick && !g.braked) { turn(g.dir); return; } // click to turn (#21)
      if (g.edge && g.speed > 0.7) { turnMany(g.dir, MathUtils.clamp(Math.round(g.speed * 3), 2, 8)); return; } // riffle (#23)
      if (g.leaf < 0 || g.edge) return;
      // Release (#20): dragged in the turn direction commits, otherwise the page returns.
      const d = (g.downX - u.clientX) * g.dir;
      l.target[g.leaf] = d > 24 ? (g.dir > 0 ? PI : 0) : (g.dir > 0 ? 0 : PI);
      sound.play(d > 24 ? "pageTurn" : "flop", Math.min(g.speed, 1), g.dir > 0);
    };
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
    target.addEventListener("pointermove", move); target.addEventListener("pointerup", up); target.addEventListener("pointercancel", up);
    target.addEventListener("lostpointercapture", up);
  }

  function onPointerMove(event: ThreeEvent<PointerEvent>) {
    if (!look.current?.active) return;
    const { side, u, v, x, y } = pageCoords(event); Object.assign(hover.current, { side, v, x, y });
    if (source && !gesture.current) source.dataset.book = signals.current.marker ? "mark" : "hover";
    // Painting: extend the stroke while it stays on the page it started on; the paper rubs with the speed.
    const p = painting.current, e = event.nativeEvent;
    if (p && (side === "left") === p.stroke.back) {
      const now = performance.now(), speed = Math.hypot(e.clientX - p.x, e.clientY - p.y) / Math.max(now - p.at, 1);
      p.stroke.points.push(u, v); paint(p.stroke, p.stroke.points.length - 2);
      Object.assign(p, { at: now, x: e.clientX, y: e.clientY }); sound.rub("paper", speed);
    }
  }

  // Trackpad swipe (#24): mostly horizontal wheel movement turns a page every 80 px; momentum after a turn is ignored.
  useEffect(() => {
    if (!source) return;
    const onWheel = (event: WheelEvent) => {
      if (!look.current?.active || Math.abs(event.deltaX) < 0.5 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      const h = hover.current, now = performance.now();
      if (now - h.swipeAt > 200) h.swipe = 0;
      h.swipeAt = now;
      if (now - h.lastTurnAt < 350 && Math.abs(event.deltaX) < 30) return; // trailing momentum
      h.swipe += event.deltaX;
      if (Math.abs(h.swipe) >= 80) { turn(h.swipe > 0 ? 1 : -1); h.swipe = 0; h.lastTurnAt = now; }
    };
    source.addEventListener("wheel", onWheel, { passive: false });
    return () => source.removeEventListener("wheel", onWheel);
  });

  useFrame((state, delta) => {
    const l = look.current, h = hover.current, dt = Math.min(delta, 0.05), f = dt * 60;
    h.clock += dt;
    if (!l) return;
    // Control bar turns (#29's bar: back, forward).
    while (l.active && signals.current.commands.length) turn(signals.current.commands.shift() === "back" ? -1 : 1);
    if (!l.active) signals.current.commands.length = 0;
    const shown = l.t > 0;
    if (group.current) group.current.visible = shown;
    if (!shown) return;
    const curves = openCurves(l.t);

    for (let i = 0; i < LEAVES; i++) {
      if (!l.active) {
        // Opening: leaves before the saved spread travel with the cover; the rest stay on their stack (owner, 24 Nov:
        // pages must not fly out of the spine). Closing: every leaf folds home with the cover.
        if (l.dir > 0) l.angle[i] = i < l.spread ? curves.cover * PI : 0;
        else l.angle[i] = Math.min(l.angle[i], curves.cover * PI);
        l.vel[i] = 0;
        continue;
      }
      const target = l.target[i];
      if (h.clock < h.brakeUntil) { l.vel[i] *= 0.85 ** f; l.angle[i] += l.vel[i] * f; continue; }
      if (target === null) {
        // Free swing: gravity pulls a loose leaf to the nearer side, with friction.
        l.vel[i] += 0.003 * Math.sin(l.angle[i] - PI / 2) * f; l.vel[i] *= 0.985 ** f; l.angle[i] += l.vel[i] * f;
        if (l.angle[i] <= 0 || l.angle[i] >= PI) { l.angle[i] = MathUtils.clamp(l.angle[i], 0, PI); l.vel[i] = 0; l.target[i] = l.angle[i]; }
        continue;
      }
      const err = target - l.angle[i], g = gesture.current;
      if (g && g.leaf === i && !g.edge) { const k = 1 - 0.4 ** f; l.vel[i] = err * k / Math.max(f, 1e-3); l.angle[i] += err * k; }
      else {
        // Spring towards the side, damped harder near the target; several leaves in flight travel at 0.18 rad/frame.
        const inFlight = l.target.filter((t, j) => t !== null && Math.abs(t - l.angle[j]) > 0.02).length;
        if (inFlight > 1) { const step = Math.min(Math.abs(err), 0.18 * f); l.angle[i] += Math.sign(err) * step; l.vel[i] = Math.sign(err) * step / Math.max(f, 1e-3); }
        else { l.vel[i] += 0.016 * Math.sin(err / 2) * f; l.vel[i] *= (0.86 + 0.13 * Math.min(Math.abs(err), 1)) ** f; l.angle[i] += l.vel[i] * f; }
        if (Math.abs(err) < 0.002 && Math.abs(l.vel[i]) < 0.002) { l.angle[i] = target; l.vel[i] = 0; }
      }
      l.angle[i] = MathUtils.clamp(l.angle[i], 0, PI);
    }
    // Leaves never pass each other: a lower leaf stays under the one above it (a small gap when both are moving).
    for (let i = 1; i < LEAVES; i++) {
      const gap = l.angle[i - 1] < PI - 0.001 && l.angle[i] > 0.001 ? 0.02 : 0;
      if (l.angle[i] > l.angle[i - 1] - gap) l.angle[i] = Math.max(l.angle[i - 1] - gap, 0);
    }

    const spread = l.angle.filter((a) => a > PI / 2).length;
    if (l.active && spread !== l.spread) { l.spread = spread; onSpread(spread); }

    // Hover: the top page on the cursor's side lifts (9/s) and its corner curls (0.06/frame); near the screen's edge
    // (after 200 ms) the block on that side is pushed and its edge lifts (ease 7/s).
    const edgeSide = Math.abs(state.pointer.x) > 0.75 ? (state.pointer.x > 0 ? "right" : "left") : "";
    if (edgeSide) { if (h.edgeSince < 0) h.edgeSince = h.clock; } else h.edgeSince = -1;
    const edgeTarget = edgeSide && h.clock - h.edgeSince > 0.2 ? (Math.abs(state.pointer.x) - 0.75) / 0.25 : 0;
    h.edge += (edgeTarget - h.edge) * (1 - Math.exp(-7 * dt));
    h.lift += ((h.side && l.active ? 0.03 : 0) - h.lift) * (1 - Math.exp(-9 * dt));
    h.curl += ((h.side && l.active && !gesture.current ? 7.02 * 0.14 * 2 : 0) - h.curl) * (1 - (1 - 0.06) ** f);
    const topRight = spread < LEAVES ? spread : -1, topLeft = spread - 1;

    // Block heights follow the spread; the leaves on top of each stack are drawn, the rest sit inside the blocks.
    const per = thickness / LEAVES;
    if (rightBlock.current) {
      const n = Math.max(LEAVES - spread - 1, 0.001);
      rightBlock.current.scale.z = n * per; rightBlock.current.position.set(spine + width / 2, 0, -thickness / 2 + n * per / 2);
    }
    if (leftBlock.current) {
      const n = Math.max(spread - 1, 0.001);
      leftBlock.current.visible = curves.cover > 0.98 && spread > 1;
      leftBlock.current.scale.z = n * per; leftBlock.current.position.set(spine - width / 2, 0, -thickness / 2 + n * per / 2);
    }

    leafGroups.current.forEach((leaf, i) => {
      if (!leaf) return;
      const a = l.angle[i], uni = leaves[i].uniforms;
      // Each leaf's hinge sits on its stack: right stack top-down, left stack bottom-up, rising through the turn.
      const zRight = -thickness / 2 + (LEAVES - i - 0.5) * per, zLeft = -thickness / 2 + (i + 0.5) * per;
      leaf.position.set(spine, 0, MathUtils.lerp(zRight, zLeft, a / PI) + Math.sin(a) * 0.02);
      const right = a < PI / 2, isTop = i === topRight || i === topLeft;
      const onHoverSide = isTop && (right ? h.side === "right" : h.side === "left");
      const pushSide = isTop && edgeSide !== "" && (right ? edgeSide === "right" : edgeSide === "left");
      uni.uAngle.value = a + (onHoverSide ? (right ? h.lift : -h.lift) : 0);
      l.bend[i] += (MathUtils.clamp(-l.vel[i] * 4, -0.35, 0.35) - l.bend[i]) * (1 - Math.exp(-10 * dt));
      uni.uBend.value = l.bend[i];
      uni.uCurlSign.value = right ? 1 : -1;
      const g = gesture.current, dragging = g !== null && g.leaf === i && !g.edge;
      if (!dragging && onHoverSide) {
        uni.uPivot.value.set(right ? 1 : 0, h.v < 0.5 ? 0 : 1); uni.uCurlDir.value.set(right ? 0.7071 : -0.7071, h.v < 0.5 ? 0.7071 : -0.7071);
      }
      // Curl strengths: hover and edge are stripe.press's (7.02×0.14×2, 0.3) scaled to this bend model; the drag curl is
      // held to 0.6 so a dragged corner bends rather than flies (owner, 24 Nov).
      const curlTarget = dragging ? 0.6 : onHoverSide ? h.curl * 0.1 : pushSide ? 0.3 * h.edge ** 4 * 4 : 0;
      uni.uCurl.value += (curlTarget - uni.uCurl.value) * (1 - (1 - (dragging ? 0.04 : 0.06)) ** f);
      leaf.visible = isTop || Math.abs(a - (right ? 0 : PI)) > 0.002 || !l.active;
    });
    if (hit.current) {
      hit.current.position.set(spine, 0, thickness / 2 + 0.05);
      hit.current.raycast = l.active ? Mesh.prototype.raycast : () => {};
    }
    if (group.current) group.current.position.x = edgeSide ? (edgeSide === "right" ? 1 : -1) * 0.2 * h.edge ** 4 : 0;

    // The 3D marker over the page: follows the pointer, rolls (±0.4) and pitches (±0.2) with its velocity on a spring
    // (120, damping 13), and lifts when not pressed. stripe.press's 0.07 lift is scaled to this model.
    const ink = signals.current.marker, m = markerMotion.current;
    if (marker.current) {
      marker.current.visible = Boolean(ink && l.active && h.side);
      if (ink) markerMaterial.color.setHex(INK[ink].hex);
      const vx = (h.x - m.lastX) / Math.max(dt, 1e-3), vy = (h.y - m.lastY) / Math.max(dt, 1e-3); m.lastX = h.x; m.lastY = h.y;
      m.x += (h.x - m.x) * (1 - Math.exp(-30 * dt)); m.y += (h.y - m.y) * (1 - Math.exp(-30 * dt));
      m.rollV += (120 * (MathUtils.clamp(vx * 0.02, -0.4, 0.4) - m.roll) - 13 * m.rollV) * dt; m.roll += m.rollV * dt;
      m.pitchV += (120 * (MathUtils.clamp(-vy * 0.02, -0.2, 0.2) - m.pitch) - 13 * m.pitchV) * dt; m.pitch += m.pitchV * dt;
      m.lift += ((painting.current ? 0 : 0.35) - m.lift) * (1 - Math.exp(-20 * dt));
      marker.current.position.set(m.x, m.y, thickness / 2 + 0.06 + m.lift);
      marker.current.rotation.set(0.5 + m.pitch, m.roll, 0);
    }
  });

  // Leaves and blocks don't take the pointer (noPick); the hit plane does. Leaves cast no shadow yet: three's shadow pass
  // would draw them flat (it doesn't run the bend), so that waits for a matching depth material.
  return <group ref={group} visible={false}>
    <mesh ref={hit} geometry={hitGeometry} material={hitMaterial} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerOut={() => { hover.current.side = ""; if (source && !gesture.current) source.dataset.book = ""; }} />
    <group ref={marker} visible={false}><mesh geometry={markerGeometry} material={markerMaterial} castShadow raycast={noPick} /></group>
    <mesh ref={rightBlock} geometry={block} material={blockMaterial} raycast={noPick} />
    <mesh ref={leftBlock} geometry={block} material={blockMaterial} visible={false} raycast={noPick} />
    {leaves.map(({ material }, i) => <group key={i} ref={(g) => { leafGroups.current[i] = g; }}>
      <mesh geometry={geometry} material={material} receiveShadow raycast={noPick} />
    </group>)}
  </group>;
}
