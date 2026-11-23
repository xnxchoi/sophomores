"use client";

import { useTexture } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
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
  type Texture
} from "three";
import { useBookSound, type BookSamples } from "./book-sound";
import { createLookState, LEAVES, LookInside, OPEN_SECONDS, openCurves, type LookState } from "./look-inside";

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
  view: { zoom: number; x: number; y: number; panning: boolean; unitsPerPx: number };
};

// Proportions from the atlas: each cover 826×1264 px, the spine 224 px. World units; the camera sees 17.1 units tall.
const H = 11, W = H * (826 / 1264), BOARD = 0.08, T = W * (224 / 826) - 2 * BOARD, SEGMENTS = 5, SEG = W / SEGMENTS;
// Atlas regions (u across, v up): back 0–0.455, spine 0.455–0.57, front 0.57–1; covers from v 0.21 to 1.
const V0 = 0.21, BACK_U1 = 0.455, FRONT_U0 = 0.57, BLANK: [number, number] = [0.05, 0.12];
// The main hinge takes most of an opening; the four board segments flex a little each (stripe.press's 5-part boards).
const SHARE = [0.6, 0.1, 0.1, 0.1, 0.1];
// stripe.press constants (map §C1). Rates are per 60 fps frame unless named per second.
const DRAG_RATE = 0.01125, MOUSE_MUL = 0.75, FLING_MAX = 0.42, FLING_DECAY = 0.95, TOUCH_PITCH_ARM_PX = 10;
const CLICK_PX = 5, CLICK_MS = 500, FLAP_GAIN = 0.037, FLAP_MAX = 0.35 * MathUtils.degToRad(80), FLAP_K = 40;
const PEEK = MathUtils.degToRad(5), PEEK_EASE = 0.075, REST_YAW = 0.35;
// Look inside pose (map §C2 #16): tilted back 22° (12.5° on touch); pointer height adds up to +10° / −12°.
const OPEN_TILT = MathUtils.degToRad(22), OPEN_TILT_TOUCH = MathUtils.degToRad(12.5), POINTER_UP = MathUtils.degToRad(10), POINTER_DOWN = MathUtils.degToRad(12);

function readSavedSpread(key?: string) {
  if (!key) return 0;
  try { return Number(window.sessionStorage.getItem(key)) || 0; } catch { return 0; }
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

/** A five-segment board: each segment hangs off the previous one's far edge, so the board can swing and flex. */
function Board({ geometries, segments, material, k = 0 }: { geometries: BoxGeometry[]; segments: RefObject<(Group | null)[]>; material: MeshPhysicalMaterial; k?: number }) {
  if (k >= geometries.length) return null;
  return <group ref={(group) => { segments.current[k] = group; }} position={[k === 0 ? 0 : SEG, 0, 0]}>
    <mesh geometry={geometries[k]} material={material} castShadow />
    <Board geometries={geometries} segments={segments} material={material} k={k + 1} />
    <LookInside look={look} root={root} signals={signals} sound={sound} width={W - 0.15} height={H - 0.3} thickness={T} pageTextures={pageTextures}
      onClose={() => onClose?.()}
      onSpread={(spread) => { if (storageKey) try { window.sessionStorage.setItem(storageKey, String(spread)); } catch { /* storage unavailable */ } }} />
  </group>;
}

const smoothstep = (x: number) => x * x * (3 - 2 * x);
const smootherstep = (x: number) => x * x * x * (x * (6 * x - 15) + 10);
const easeInOutQuint = (x: number) => x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2;

/**
 * The closed book and everything you can do to it (map §C1): drag to turn and fling, pitch easing home, covers that
 * swing open with spin and spring shut, a lift while held, the cover peek on hover, the add-to-cart spin and dip, scroll
 * coupling, and the hologram and radio effects. `onOpen` gets a click (a press under 5 px and 500 ms).
 * Look inside (signals.look) opens the book in place; the pages are LookInside's. The spread you leave is saved.
 */
export function Book({ textures, signals, onOpen, onClose, small, storageKey, pageTextures = [], samples }: {
  textures: BookTextures; signals: RefObject<BookSignals>; onOpen?: () => void; onClose?: () => void; small: boolean;
  /** sessionStorage key for the saved spread (#26). */
  storageKey?: string;
  pageTextures?: string[];
  samples?: BookSamples;
}) {
  const sound = useBookSound(samples);
  const slots = useMemo(() => Object.fromEntries(Object.entries(textures).filter(([, url]) => url)) as Record<string, string>, [textures]);
  const maps = useTexture(slots) as unknown as Record<string, Texture>;
  const uniforms = useMemo(createUniforms, []);
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
  const frontHinge = useRef<Group>(null), closedPages = useRef<Mesh>(null);
  const look = useRef<LookState | null>(null);
  const source = useThree((state) => state.events.connected) as HTMLElement | undefined;
  const physics = useRef({
    yaw: 0, pitch: 0, velYaw: 0, velPitch: 0, lastYaw: 0, spinSpeed: 0, dragging: false, hovered: false,
    released: -Infinity, pitchFrom: 0, returning: false, touch: false, armed: false, totalX: 0, lastX: 0, lastY: 0,
    downX: 0, downY: 0, downAt: 0, frontA: 0, frontV: 0, backA: 0, backV: 0, peek: 0, lift: 0, liftT: 0,
    spin: null as null | { dir: number; t: number }, scroll: 0, holo: 0, holoSince: -1, radio: 0, clock: 0, openTilt: 0,
    lastPointer: new Vector2()
  });
  // Audio starts on the first press anywhere on the stage.
  useEffect(() => {
    if (!source) return;
    source.addEventListener("pointerdown", sound.unlock);
    return () => source.removeEventListener("pointerdown", sound.unlock);
  }, [source, sound]);

  const setCursor = (value: "" | "hover" | "drag") => { if (source) source.dataset.book = value; };

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    // The stage's own controls (Look inside, Close) sit over the canvas; presses on them aren't for the book.
    if ((event.nativeEvent.target as Element | null)?.closest?.("[data-book-ui]")) return;
    event.stopPropagation();
    if ((look.current?.t ?? 0) > 0) return; // open or opening: the pages take the pointer
    const s = physics.current;
    const e = event.nativeEvent;
    Object.assign(s, { dragging: true, touch: e.pointerType !== "mouse", armed: false, totalX: 0, lastX: e.clientX, lastY: e.clientY,
      downX: e.clientX, downY: e.clientY, downAt: performance.now(), velYaw: 0, velPitch: 0, returning: false });
    setCursor("drag");
    const move = (m: PointerEvent) => {
      const dx = m.clientX - s.lastX, dy = m.clientY - s.lastY, rate = DRAG_RATE * (s.touch ? 1 : MOUSE_MUL);
      s.lastX = m.clientX; s.lastY = m.clientY; s.totalX += dx;
      // Touch turns the book first; tilt joins at half rate once the finger has moved 10 px sideways.
      if (s.touch && Math.abs(s.totalX) > TOUCH_PITCH_ARM_PX) s.armed = true;
      const yaw = dx * rate, pitch = s.touch ? (s.armed ? dy * rate * 0.5 : 0) : dy * rate;
      s.yaw += yaw; s.pitch = MathUtils.clamp(s.pitch + pitch, -1.2, 1.2);
      s.velYaw = MathUtils.clamp(yaw, -FLING_MAX, FLING_MAX); s.velPitch = MathUtils.clamp(pitch, -FLING_MAX, FLING_MAX);
    };
    const up = (u: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      s.dragging = false; s.released = s.clock; setCursor(s.hovered ? "hover" : "");
      if (Math.hypot(u.clientX - s.downX, u.clientY - s.downY) < CLICK_PX && performance.now() - s.downAt < CLICK_MS) onOpen?.();
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05), f = dt * 60, sig = signals.current, s = physics.current;
    s.clock += dt; uniforms.uTime.value = s.clock;
    const l = (look.current ??= createLookState(readSavedSpread(storageKey)));

    // Look inside timeline (#15): opens over OPEN_SECONDS, closes over 1.88 s.
    const want = sig.look ? 1 : -1;
    if (want !== l.dir) {
      l.dir = want; l.active = false;
      if (want > 0) {
        sound.play("crackle");
        // Turn the shortest way to the reading pose, and stop any fling.
        const yaw = REST_YAW + s.yaw; s.yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw)) - REST_YAW; s.velYaw = 0; s.velPitch = 0; s.lastYaw = s.yaw;
      }
    }
    l.t = MathUtils.clamp(l.t + (l.dir > 0 ? dt : -dt * OPEN_SECONDS / 1.88), 0, OPEN_SECONDS);
    if (l.dir > 0 && l.t >= OPEN_SECONDS && !l.active) {
      l.active = true; l.angle.forEach((_, i) => { l.target[i] = i < l.spread ? Math.PI : 0; });
    }
    const open = openCurves(l.t);
    if (closedPages.current) closedPages.current.visible = l.t === 0;

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
    s.peek += (((s.hovered || sig.peek) && l.t === 0 ? PEEK : 0) - s.peek) * (1 - (1 - PEEK_EASE) ** f);
    const flap = Math.min(s.spinSpeed * FLAP_GAIN, FLAP_MAX), damping = 2 * Math.sqrt(FLAP_K);
    const frontBefore = s.frontA;
    s.frontV += (FLAP_K * (flap + s.peek - s.frontA) - damping * s.frontV) * dt; s.frontA += s.frontV * dt;
    // A cover shutting fast slaps, louder the faster it closes.
    if (frontBefore > 0.03 && s.frontA <= 0.03 && s.frontV < -0.8) sound.slap(-s.frontV / 6);
    // The pointer moving across the closed book rubs its cover.
    const moved = s.lastPointer.distanceTo(state.pointer) * Math.max(state.size.width, state.size.height) / 2;
    s.lastPointer.copy(state.pointer);
    if (s.hovered && l.t === 0 && !s.dragging && moved > 0) sound.rub("cover", moved / (dt * 1000));
    s.backV += (FLAP_K * (flap * 1.5 - s.backA) - damping * s.backV) * dt; s.backA += s.backV * dt;
    // Opening swings the front cover flat to the left and drops its hinge to the back cover's level.
    front.current.forEach((g, k) => { if (g) g.rotation.y = -Math.max(s.frontA, 0) * SHARE[k] - (k === 0 ? open.cover * Math.PI : 0); });
    if (frontHinge.current) frontHinge.current.position.z = MathUtils.lerp(T / 2, -T / 2, open.cover);
    back.current.forEach((g, k) => { if (g) g.rotation.y = Math.max(s.backA, 0) * SHARE[k]; });

    // Lift towards the camera while held: 0.3 s with a small overshoot; it falls back at 2 per second.
    if (s.dragging) { s.liftT = Math.min(s.liftT + dt / 0.3, 1); const e = smoothstep(s.liftT); s.lift = e + Math.sin(e * Math.PI) * (1 - e) * 0.12; }
    else { s.lift = Math.max(s.lift - 2 * dt, 0); s.liftT = s.lift; }

    // Add-to-cart: a full turn (removal turns back) with a dip on a sine; 0.9 s is ours (stripe.press's isn't in its code).
    if (!s.spin && sig.spins.length && l.t > 0) sig.spins.length = 0; // stripe.press skips the spin while Look inside is open
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
    // stripe.press drops the canvas to 0.9 while the hologram shows.
    state.gl.domElement.style.opacity = String(1 - 0.1 * s.holo);

    // Open pose (#16): tilted back, following the pointer's height (6/s, 0.4× on touch), centred on the spread and
    // popped towards the camera; the book counter-turns a little as reading progresses (tuned to this model).
    const pointerTilt = state.pointer.y > 0 ? state.pointer.y * POINTER_UP : state.pointer.y * POINTER_DOWN;
    s.openTilt += (pointerTilt * (small ? 0.4 : 1) - s.openTilt) * (1 - Math.exp(-6 * dt));
    const b = open.book, closedYaw = REST_YAW + s.yaw + spinYaw + s.scroll * 0.9, progress = l.spread / LEAVES;
    if (root.current) {
      root.current.rotation.set(
        MathUtils.lerp(s.pitch, -(small ? OPEN_TILT_TOUCH : OPEN_TILT) + s.openTilt, b),
        MathUtils.lerp(closedYaw, -0.1 * (progress * 2 - 1), b), 0);
      root.current.position.set(MathUtils.lerp(0, W / 2, b), 0, MathUtils.lerp(s.lift - dip - s.scroll * 6, 4, b));
    }
    // The open spread is twice as wide: on a narrow stage the camera backs off until it fits (after the intro dolly).
    if (s.clock > 2) {
      const aspect = state.size.width / Math.max(state.size.height, 1), fit = Math.max(54, (W * 1.1) / (Math.tan(MathUtils.degToRad(9)) * aspect) + 4);
      state.camera.position.z = MathUtils.lerp(54, fit, b);
    }
    // Touch zoom and pan apply only while the book is open.
    const view = sig.view, camera = state.camera as PerspectiveCamera;
    camera.position.x = view.x * b; camera.position.y = view.y * b;
    const zoom = MathUtils.lerp(1, view.zoom, b);
    if (camera.zoom !== zoom) { camera.zoom = zoom; camera.updateProjectionMatrix(); }
    view.unitsPerPx = (2 * (camera.position.z - 4) * Math.tan(MathUtils.degToRad(9))) / Math.max(state.size.height, 1) / zoom;
  });

  return <group ref={root}
    onPointerDown={onPointerDown}
    onPointerOver={(e) => { e.stopPropagation(); physics.current.hovered = true; if (!physics.current.dragging) setCursor("hover"); }}
    onPointerOut={() => { physics.current.hovered = false; if (!physics.current.dragging) setCursor(""); }}>
    <mesh geometry={geometry.spine} material={material} position={[-W / 2 - BOARD / 2, 0, 0]} castShadow />
    <mesh ref={closedPages} geometry={geometry.pages} material={material} position={[-0.075, 0, 0]} castShadow />
    <group ref={frontHinge} position={[-W / 2, 0, T / 2]}><Board geometries={geometry.front} segments={front} material={material} /></group>
    <group position={[-W / 2, 0, -T / 2]}><Board geometries={geometry.back} segments={back} material={material} /></group>
  </group>;
}
