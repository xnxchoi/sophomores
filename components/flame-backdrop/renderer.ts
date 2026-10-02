import type { FlameConfig } from './config';
import { pointerWeightAt } from './geometry';
import { resolvePaletteWeights, type PaletteInput, type PaletteWeights } from './palette';
import { createFragmentShader, vertexShader } from './shaders';
import { artworkLayout, artworkPoint } from './layout';

export interface FlameState {
  palette: PaletteInput;
  transitionSeconds: number;
  playing: boolean;
  visible: boolean;
  pointerEnabled: boolean;
  chromaticEnabled: boolean;
  reducedMotion: boolean;
  /** Flame emission target. False extinguishes and rearms the ignition sequence. */
  ignited: boolean;
}

/** Injectable browser clock/surface dependencies for deterministic rendering tests. */
export interface FlameEnvironment {
  now?: () => number;
  performance: { now(): number };
  devicePixelRatio: number;
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(id: number): void;
  matchMedia(query: string): MediaQueryList;
  ResizeObserver: new (callback: () => void) => { observe(target: Element): void; disconnect(): void };
}

export interface FlameHandle {
  readonly ready: boolean;
  /** Current normalized ignition amount, retained after destroy for recreation. */
  readonly ignitionProgress: number;
  setState(patch: Partial<FlameState>): void;
  destroy(): void;
}

export interface CreateFlameOptions {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  config: FlameConfig;
  /** Use window for a pointer-transparent fixed backdrop. */
  pointerTarget?: EventTarget;
  onUnavailable?: (error: Error) => void;
  env?: FlameEnvironment;
  initialPalette?: PaletteInput;
  transitionSeconds?: number;
  initialState?: Partial<FlameState>;
  /** Resume an in-flight ignition, or use 1 for an already-lit fallback. */
  initialIgnitionProgress?: number;
}

type Point = { x: number; y: number };
type Graphics = ReturnType<typeof createGraphics>;
const asError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error));
const validDuration = (value: number) => {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('transitionSeconds must be finite and nonnegative.');
  return value;
};
const equalWeights = (a: PaletteWeights, b: PaletteWeights) => a.every((value, i) => value === b[i]);
const validIgnited = (value: boolean) => {
  if (typeof value !== 'boolean') throw new TypeError('ignited must be a boolean.');
};
const validIgnitionProgress = (value: number) => {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('initialIgnitionProgress must be finite and between 0 and 1.');
  return value;
};

function compile(gl: WebGLRenderingContext, type: number, source: string, resources: (() => void)[]) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Flame shader allocation failed.');
  resources.push(() => gl.deleteShader(shader));
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Flame shader compilation failed: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function createGraphics(canvas: HTMLCanvasElement, config: FlameConfig) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('WebGL is unavailable.');
  const resources: (() => void)[] = [];
  const dispose = () => resources.splice(0).reverse().forEach(release => release());
  try {
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexShader, resources);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, createFragmentShader(config), resources);
    const program = gl.createProgram();
    if (!program) throw new Error('Flame program allocation failed.');
    resources.push(() => gl.deleteProgram(program));
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Flame program linking failed: ${gl.getProgramInfoLog(program)}`);
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Flame geometry allocation failed.');
    resources.push(() => gl.deleteBuffer(buffer));
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = Object.fromEntries(['uScale', 'uOrigin', 'uTime', 'uColorTime', 'uIgnitionProgress', 'uPointer', 'uPointerStrength', 'uChromatic', 'uCssPixel', 'uPaletteWeights']
      .map(name => [name, gl.getUniformLocation(program, name)]));
    return { gl, uniforms, dispose };
  } catch (error) { dispose(); throw error; }
}

function draw(graphics: Graphics, canvas: HTMLCanvasElement, rect: DOMRect, pointer: Point,
  strength: number, time: number, colorTime: number, ignitionProgress: number, state: FlameState, weights: PaletteWeights, dpr: number, config: FlameConfig) {
  const layout = artworkLayout(rect.width, rect.height, config);
  const side = layout.side;
  if (!(side > 0)) { canvas.hidden = true; return; }
  const ratio = Math.min(Math.max(dpr || 1, 1), config.quality.maxPixelRatio, config.quality.maxRenderSize / Math.max(rect.width, rect.height));
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const { gl, uniforms } = graphics;
  gl.viewport(0, 0, width, height);
  gl.uniform2f(uniforms.uScale, ...layout.scale);
  gl.uniform2f(uniforms.uOrigin, ...layout.origin);
  gl.uniform2f(uniforms.uPointer, pointer.x, pointer.y);
  gl.uniform1f(uniforms.uPointerStrength, state.reducedMotion ? 0 : strength);
  gl.uniform1f(uniforms.uTime, state.reducedMotion ? 0 : time);
  gl.uniform1f(uniforms.uColorTime, state.reducedMotion ? 0 : colorTime);
  gl.uniform1f(uniforms.uIgnitionProgress, ignitionProgress);
  gl.uniform1f(uniforms.uCssPixel, 1 / side);
  gl.uniform1f(uniforms.uChromatic, state.chromaticEnabled && !state.reducedMotion ? 1 : 0);
  gl.uniform3f(uniforms.uPaletteWeights, ...weights);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  if (gl.getError() !== gl.NO_ERROR) throw new Error('Flame drawing failed.');
  canvas.hidden = false;
}

function chaseArc(pointer: Point, target: Point, elapsed: number, fresh: boolean, config: FlameConfig): Point {
  const targetAngle = Math.atan2(target.y, target.x);
  const angle = fresh ? targetAngle - config.pointer.entryArc : Math.atan2(pointer.y, pointer.x);
  const difference = Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle));
  const nextAngle = angle + difference * (1 - Math.exp(-config.pointer.angularFollowRate * elapsed));
  const radius = fresh ? Math.hypot(target.x, target.y) : Math.hypot(pointer.x, pointer.y);
  const nextRadius = radius + (Math.hypot(target.x, target.y) - radius) * (1 - Math.exp(-config.pointer.radialFollowRate * elapsed));
  return { x: Math.cos(nextAngle) * nextRadius, y: Math.sin(nextAngle) * nextRadius };
}

/** Procedural scene with an independent, interruptible palette transition clock. */
export function createFlame({ canvas, stage, config, pointerTarget = stage, onUnavailable = () => {},
  env = globalThis, initialPalette = 'gilded-flame', transitionSeconds = 2.4, initialState = {}, initialIgnitionProgress = 0 }: CreateFlameOptions): FlameHandle {
  let state: FlameState = { palette: initialPalette, transitionSeconds, playing: true, visible: true,
    pointerEnabled: config.pointer.enabled, chromaticEnabled: config.prism.enabled, reducedMotion: false, ignited: true, ...initialState };
  validDuration(state.transitionSeconds);
  validIgnited(state.ignited);
  let ignitionProgress = validIgnitionProgress(initialIgnitionProgress);
  const settleIgnition = () => {
    if (!config.ignition.enabled) ignitionProgress = 1;
    else if (!state.ignited) ignitionProgress = 0;
    else if (state.reducedMotion) ignitionProgress = 1;
  };
  settleIgnition();
  let weights = resolvePaletteWeights(state.palette);
  let blend = { from: weights, to: weights, elapsed: 0 };
  canvas.hidden = true;
  let graphics: Graphics;
  try { graphics = createGraphics(canvas, config); }
  catch (error) { onUnavailable(asError(error)); return { ready: false, ignitionProgress, setState() {}, destroy() {} }; }
  const interval = 1000 / config.quality.fps;
  const now = () => env.now ? env.now() : env.performance.now();
  const media = env.matchMedia('(hover: hover) and (pointer: fine)');
  let rect = stage.getBoundingClientRect();
  let target = { x: 0, y: 0, inside: false };
  let pointer: Point = { x: 0, y: 0 };
  let strength = 0; let activated = false; let seconds = 0; let colorSeconds = 0; let clock = now(); let ignitionClock = clock;
  let raf: number | null = null; let nextFrame = 0; let lastFrame: number | null = null;
  let failed = false; let destroyed = false;
  const ready = () => !failed && !destroyed;
  const running = () => ready() && state.visible && state.playing && !state.reducedMotion;
  const pointerEnabled = () => running() && state.pointerEnabled && media.matches;
  const resetPointer = () => { target = { x: 0, y: 0, inside: false }; pointer = { x: 0, y: 0 }; strength = 0; activated = false; };
  const stop = () => { if (raf !== null) env.cancelAnimationFrame(raf); raf = null; lastFrame = null; };
  const unavailable = (error: unknown) => {
    if (failed || destroyed) return;
    failed = true; stop(); canvas.hidden = true; graphics.dispose(); onUnavailable(asError(error));
  };
  const render = () => {
    if (!ready() || !state.visible) { canvas.hidden = true; return; }
    try { draw(graphics, canvas, rect, pointer, strength, seconds, colorSeconds, ignitionProgress, state, weights, env.devicePixelRatio, config); }
    catch (error) { unavailable(error); }
  };
  const advancePalette = (elapsed: number) => {
    if (equalWeights(weights, blend.to)) return;
    blend = { ...blend, elapsed: blend.elapsed + elapsed };
    const progress = state.transitionSeconds === 0 ? 1 : Math.min(1, blend.elapsed / state.transitionSeconds);
    const eased = progress * progress * (3 - 2 * progress);
    const mix = (i: number) => blend.from[i] + (blend.to[i] - blend.from[i]) * eased;
    weights = progress === 1 ? blend.to : [mix(0), mix(1), mix(2)];
  };
  const tick = (timestamp: number) => {
    raf = null;
    if (!running()) return;
    if (timestamp >= nextFrame - .1) {
      const current = now();
      const delta = Math.max(0, current - clock) / 1000;
      if (config.ignition.enabled && state.ignited) {
        ignitionProgress = Math.min(1, ignitionProgress + Math.max(0, current - Math.max(clock, ignitionClock)) / (1000 * config.ignition.durationSeconds));
      }
      colorSeconds += delta;
      seconds = (seconds + delta) % config.motion.loopSeconds; clock = current;
      advancePalette(delta);
      const elapsed = lastFrame === null ? interval : Math.min(100, Math.max(0, timestamp - lastFrame));
      lastFrame = timestamp;
      nextFrame += (Math.floor((timestamp - nextFrame + .1) / interval) + 1) * interval;
      const point: [number, number] = [target.x, target.y];
      const active = target.inside && pointerEnabled() && pointerWeightAt(point, point, 1, seconds, config) > .001;
      if (active) { pointer = chaseArc(pointer, target, elapsed / 1000, !activated, config); activated = true; }
      const rate = active ? config.pointer.attackRate : config.pointer.releaseRate;
      strength += ((active ? 1 : 0) - strength) * (1 - Math.exp(-rate * elapsed / 1000));
      if (!active && strength < .005) activated = false;
      render();
    }
    if (running()) raf = env.requestAnimationFrame(tick);
  };
  const sync = () => {
    if (!ready()) return;
    if (!state.pointerEnabled || !media.matches || state.reducedMotion) resetPointer();
    if (!running()) stop();
    else if (raf === null) {
      clock = now(); ignitionClock = clock; nextFrame = env.performance.now() + interval;
      raf = env.requestAnimationFrame(tick);
    }
    render();
  };
  const move: EventListener = event => {
    const pointerEvent = event as PointerEvent;
    if (!pointerEnabled() || pointerEvent.pointerType === 'touch') return;
    rect = stage.getBoundingClientRect();
    const layout = artworkLayout(rect.width, rect.height, config);
    const side = layout.side;
    if (!(side > 0)) return;
    const localX = pointerEvent.clientX - rect.left;
    const localY = pointerEvent.clientY - rect.top;
    const [x, y] = artworkPoint(localX, localY, layout);
    const inHost = localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height;
    target = { x, y, inside: inHost && (config.composition.mode === 'footer' || (Math.abs(x) <= .5 && Math.abs(y) <= .5)) };
  };
  const leave = () => { target = { ...target, inside: false }; };
  const lost = () => unavailable(new Error('Flame WebGL context was lost.'));
  const observer = new env.ResizeObserver(() => { rect = stage.getBoundingClientRect(); resetPointer(); render(); });
  observer.observe(stage);
  pointerTarget.addEventListener('pointermove', move, { passive: true });
  pointerTarget.addEventListener('pointerleave', leave, { passive: true });
  pointerTarget.addEventListener('blur', leave);
  canvas.addEventListener('webglcontextlost', lost);
  media.addEventListener('change', sync);
  sync();
  return {
    get ready() { return ready(); },
    get ignitionProgress() { return ignitionProgress; },
    setState(patch) {
      if (!ready()) return;
      if ('ignited' in patch) validIgnited(patch.ignited as boolean);
      const nextTarget = patch.palette === undefined ? blend.to : resolvePaletteWeights(patch.palette);
      const duration = validDuration(patch.transitionSeconds ?? state.transitionSeconds);
      const targetChanged = !equalWeights(nextTarget, blend.to);
      const durationChanged = duration !== state.transitionSeconds;
      const changed = (Object.keys(patch) as (keyof FlameState)[]).some(key => key !== 'palette' && state[key] !== patch[key]);
      if (!targetChanged && !changed) return;
      if (targetChanged || durationChanged) blend = { from: weights, to: nextTarget, elapsed: 0 };
      if (patch.visible === false) leave();
      if (patch.ignited === true && !state.ignited) ignitionClock = now();
      state = { ...state, ...patch, transitionSeconds: duration };
      settleIgnition();
      if (state.reducedMotion || (state.transitionSeconds === 0 && state.playing && state.visible)) weights = blend.to;
      sync();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; stop(); canvas.hidden = true; observer.disconnect();
      pointerTarget.removeEventListener('pointermove', move); pointerTarget.removeEventListener('pointerleave', leave);
      pointerTarget.removeEventListener('blur', leave);
      canvas.removeEventListener('webglcontextlost', lost); media.removeEventListener('change', sync);
      graphics.dispose();
    },
  };
}
