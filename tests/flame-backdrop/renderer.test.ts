import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createFlame,
  type FlameEnvironment,
  type FlameState
} from "@/components/gl/flame-backdrop/renderer";
import {
  resolveFlameConfig,
  type FlameConfigInput
} from "@/components/gl/flame-backdrop/config";
import type { FooterMaterial } from "@/components/gl/flame-backdrop/footer-material";

type Bounds = { left: number; top: number; width: number; height: number };
function fixture({
  context = true,
  compile = true,
  link = true,
  fine = true,
  allocation = "",
  fixedTime = false,
  config = {},
  initialState = {},
  transitionSeconds = 2.4,
  initialIgnitionProgress,
  initialElapsedSeconds,
  footerMaterial
}: {
  context?: boolean;
  compile?: boolean;
  link?: boolean;
  fine?: boolean;
  allocation?: string;
  fixedTime?: boolean;
  config?: FlameConfigInput;
  initialState?: Partial<FlameState>;
  transitionSeconds?: number;
  initialIgnitionProgress?: number;
  initialElapsedSeconds?: number;
  footerMaterial?: FooterMaterial;
} = {}) {
  const events = () => {
    const listeners = new Map<string, EventListener>();
    return {
      listeners,
      addEventListener: (key: string, fn: EventListener) =>
        listeners.set(key, fn),
      removeEventListener: (key: string) => listeners.delete(key),
      emit: (key: string, event: object = {}) =>
        listeners.get(key)?.(event as Event)
    };
  };
  const calls: [string, ...unknown[]][] = [];
  const methods: Record<string, unknown> = {
    getShaderParameter: () => compile,
    getProgramParameter: () => link,
    getShaderInfoLog: () => "compile error",
    getProgramInfoLog: () => "link error",
    getAttribLocation: () => 0,
    getUniformLocation: (_: unknown, name: string) => name,
    createShader: () => (allocation === "shader" ? null : {}),
    createProgram: () => (allocation === "program" ? null : {}),
    createBuffer: () => (allocation === "buffer" ? null : {}),
    getError: () => 0,
    NO_ERROR: 0
  };
  const gl = new Proxy(methods, {
    get: (target, key: string) =>
      key in target
        ? target[key]
        : (...args: unknown[]) => calls.push([key, ...args])
  });
  let bounds: Bounds = { left: 10, top: 20, width: 800, height: 400 };
  const stage = { ...events(), getBoundingClientRect: () => bounds };
  const pointerTarget = events();
  const canvas = {
    ...events(),
    hidden: false,
    width: 0,
    height: 0,
    getContext: () => (context ? gl : null)
  };
  const media = { ...events(), matches: fine };
  const queue = new Map<number, FrameRequestCallback>();
  let id = 0;
  let now = 0;
  let resize = () => {};
  let disconnected = false;
  const env: FlameEnvironment = {
    ...(fixedTime ? { now: () => 0 } : {}),
    devicePixelRatio: 2,
    performance: { now: () => now },
    matchMedia: () => media as unknown as MediaQueryList,
    requestAnimationFrame: (fn) => {
      queue.set(++id, fn);
      return id;
    },
    cancelAnimationFrame: (key) => {
      queue.delete(key);
    },
    ResizeObserver: class {
      constructor(fn: () => void) {
        resize = fn;
      }
      observe() {}
      disconnect() {
        disconnected = true;
      }
    }
  };
  const errors: Error[] = [];
  const flame = createFlame({
    canvas: canvas as unknown as HTMLCanvasElement,
    stage: stage as unknown as HTMLElement,
    pointerTarget: pointerTarget as unknown as EventTarget,
    config: resolveFlameConfig(config),
    initialState,
    transitionSeconds,
    initialIgnitionProgress,
    initialElapsedSeconds,
    footerMaterial,
    env,
    onUnavailable: (error) => errors.push(error)
  });
  // The separately targeted surface makes pointer-transparent overlays work.
  const surface = { ...stage, emit: pointerTarget.emit };
  return {
    flame,
    canvas,
    stage: surface,
    pointerTarget,
    gl,
    calls,
    queue,
    media,
    errors,
    disconnected: () => disconnected,
    uniform: (name: string): number[] =>
      calls
        .filter((row) => row[1] === name)
        .at(-1)
        ?.slice(2) as number[],
    tick: (time: number) => {
      now = time;
      const pending = [...queue.values()];
      queue.clear();
      pending.forEach((fn) => fn(time));
    },
    resize: (next: Bounds) => {
      bounds = next;
      resize();
    },
    move: (x: number, y = 220, pointerType = "mouse") =>
      pointerTarget.emit("pointermove", { clientX: x, clientY: y, pointerType })
  };
}
test("renderer forwards opt-in material only to an emitting footer", () => {
  for (const mode of ["ring", "footer"] as const) {
    const f = fixture({
      footerMaterial: "substance",
      config: { composition: { mode }, fire: { intensity: 1 } }
    });
    const sources = f.calls
      .filter((row) => row[0] === "shaderSource")
      .map((row) => String(row[2]))
      .join("\n");
    assert.equal(sources.includes("float materialEmission"), mode === "footer");
    assert.equal(f.flame.ready, true);
    f.flame.destroy();
  }
  assert.throws(
    () => fixture({ footerMaterial: "invalid" as never }),
    /footerMaterial/
  );
});
test("renders procedural scene immediately without any video/texture operation", () => {
  const f = fixture();
  assert.equal(f.flame.ready, true);
  assert.equal(f.canvas.hidden, false);
  assert.equal(f.canvas.width, 1200);
  assert.equal(f.canvas.height, 600);
  assert.deepEqual(f.uniform("uScale"), [2, 1]);
  assert.deepEqual(f.uniform("uPaletteWeights"), [0, 1, 0]);
  assert.deepEqual(f.uniform("uTime"), [0]);
  assert.equal(f.queue.size, 1);
  assert.ok(!f.calls.some((row) => /texture|texImage|sampler/i.test(row[0])));
  assert.doesNotMatch(
    readFileSync(
      new URL("../../components/gl/flame-backdrop/renderer.ts", import.meta.url),
      "utf8"
    ),
    /texImage2D|createTexture|uVideo/
  );
  f.flame.destroy();
});
test("footer uniforms and pointer focus share the shifted origin after responsive resize", () => {
  const f = fixture({
    config: { composition: { mode: "footer" } },
    fixedTime: true
  });
  assert.ok(f.uniform("uOrigin")[1] < 0);
  f.move(410, 420 - 312);
  for (let time = 40; time <= 1600; time += 40) f.tick(time);
  assert.ok(Math.abs(f.uniform("uPointer")[0]) < 0.001);
  assert.ok(Math.abs(f.uniform("uPointer")[1] - 0.35) < 0.001);
  assert.ok(f.uniform("uPointerStrength")[0] > 0.99);
  f.resize({ left: 0, top: 0, width: 390, height: 420 });
  f.move(195, 420 - (390 * 0.94) / 2);
  for (let time = 1640; time <= 3200; time += 40) f.tick(time);
  assert.ok(Math.abs(f.uniform("uPointer")[1] - 0.35) < 0.001);
  assert.ok(f.uniform("uPointerStrength")[0] > 0.99);
  f.move(195, 500); // Window-level pointer input must not activate outside its host.
  for (let time = 3240; time <= 4800; time += 40) f.tick(time);
  assert.ok(f.uniform("uPointerStrength")[0] < 0.001);
  f.flame.destroy();
});
test("paused scene stays visible, freezes time and ignores pointer movement", () => {
  const f = fixture();
  f.tick(100);
  f.flame.setState({ playing: false });
  const time = f.uniform("uTime");
  const pointer = f.uniform("uPointer");
  f.tick(5000);
  f.move(550);
  assert.equal(f.queue.size, 0);
  assert.equal(f.canvas.hidden, false);
  assert.deepEqual(f.uniform("uPointer"), pointer);
  assert.deepEqual(f.uniform("uTime"), time);
  f.flame.setState({ playing: true });
  f.tick(5040);
  assert.ok(Math.abs(f.uniform("uTime")[0] - time[0] - 0.04) < 0.00001);
  f.flame.destroy();
});

test("flattened footer uniforms keep pointer sheen on the elliptical rim through resize", () => {
  const verticalScale = 0.6;
  const f = fixture({
    config: { composition: { mode: "footer", verticalScale } },
    fixedTime: true
  });
  const side = 312 / 0.35;
  assert.deepEqual(f.uniform("uScale"), [
    800 / side,
    400 / (side * verticalScale)
  ]);
  assert.deepEqual(f.uniform("uOrigin"), [0, -200 / (side * verticalScale)]);
  f.move(410, 420 - 312 * verticalScale);
  for (let time = 40; time <= 1600; time += 40) f.tick(time);
  assert.ok(Math.abs(f.uniform("uPointer")[1] - 0.35) < 0.001);
  assert.ok(f.uniform("uPointerStrength")[0] > 0.99);
  f.resize({ left: 0, top: 0, width: 390, height: 420 });
  f.move(195, 420 - ((390 * 0.94) / 2) * verticalScale);
  for (let time = 1640; time <= 3200; time += 40) f.tick(time);
  assert.ok(Math.abs(f.uniform("uPointer")[1] - 0.35) < 0.001);
  assert.ok(f.uniform("uPointerStrength")[0] > 0.99);
  f.flame.destroy();
});
test("hidden scene stops scheduling and resumes without wall-clock jump", () => {
  const f = fixture();
  f.tick(100);
  const time = f.uniform("uTime")[0];
  f.flame.setState({ visible: false });
  assert.equal(f.canvas.hidden, true);
  assert.equal(f.queue.size, 0);
  f.tick(20000);
  f.flame.setState({ visible: true });
  f.tick(20040);
  assert.ok(Math.abs(f.uniform("uTime")[0] - time - 0.04) < 0.00001);
  f.flame.destroy();
});

test("centered art coordinates follow both wide and square stage, with smoothing", () => {
  const f = fixture();
  f.move(270);
  for (let time = 40; time <= 1200; time += 40) f.tick(time);
  assert.ok(Math.abs(f.uniform("uPointer")[0] + 0.35) < 0.001);
  assert.ok(f.uniform("uPointerStrength")[0] > 0.99);
  f.resize({ left: 10, top: 20, width: 400, height: 400 });
  f.move(322, 136);
  for (let time = 1240; time <= 2400; time += 40) f.tick(time);
  assert.ok(Math.abs(f.uniform("uPointer")[0] - 0.28) < 0.001);
  assert.ok(Math.abs(f.uniform("uPointer")[1] - 0.21) < 0.001);
  assert.deepEqual(f.uniform("uCssPixel"), [1 / 400]);
  f.flame.destroy();
});
test("idempotent state and unrelated toggle preserve stationary pointer; disable resets it; palette preserves it", () => {
  const f = fixture();
  f.move(550);
  f.tick(100);
  const strength = f.uniform("uPointerStrength")[0];
  f.flame.setState({ chromaticEnabled: false });
  assert.equal(f.uniform("uPointerStrength")[0], strength);
  assert.deepEqual(f.uniform("uChromatic"), [0]);
  const count = f.calls.length;
  f.flame.setState({ chromaticEnabled: false });
  assert.equal(f.calls.length, count);
  f.flame.setState({ pointerEnabled: false });
  assert.deepEqual(f.uniform("uPointerStrength"), [0]);
  f.flame.setState({ pointerEnabled: true });
  f.move(270);
  f.tick(200);
  const prior = f.uniform("uPointerStrength");
  f.flame.setState({ palette: "copper-ember" });
  assert.deepEqual(f.uniform("uPointerStrength"), prior);
  assert.deepEqual(f.uniform("uPaletteWeights"), [0, 1, 0]);
  f.flame.destroy();
});
test("coarse/touch input does not gate scene but cannot activate pointer light", () => {
  const f = fixture({ fine: false });
  f.move(550);
  f.tick(100);
  assert.equal(f.canvas.hidden, false);
  assert.deepEqual(f.uniform("uPointerStrength"), [0]);
  f.media.matches = true;
  f.media.emit("change");
  f.move(550, 220, "touch");
  f.tick(200);
  assert.deepEqual(f.uniform("uPointerStrength"), [0]);
  f.move(550);
  f.tick(300);
  assert.ok(f.uniform("uPointerStrength")[0] > 0);
  f.stage.emit("pointerleave");
  f.tick(400);
  f.media.matches = false;
  f.media.emit("change");
  assert.deepEqual(f.uniform("uPointerStrength"), [0]);
  f.flame.destroy();
});
test("resize redraws paused scene and caps resolution without restarting animation", () => {
  const f = fixture();
  f.flame.setState({ playing: false });
  f.resize({ left: 0, top: 0, width: 3000, height: 2000 });
  assert.equal(f.canvas.width, 1440);
  assert.equal(f.canvas.height, 960);
  assert.equal(f.queue.size, 0);
  f.resize({ left: 0, top: 0, width: 0, height: 0 });
  assert.equal(f.canvas.hidden, true);
  f.flame.destroy();
});
test("retains frame deadline remainder at 60Hz for a 30fps scene", () => {
  const f = fixture();
  for (let index = 1; index <= 720; index++) f.tick((index * 1000) / 60);
  const draws = f.calls.filter((row) => row[0] === "drawArrays").length;
  assert.ok(draws >= 360 && draws <= 362, `${draws} draws`);
  assert.ok(
    Math.min(f.uniform("uTime")[0], 12 - f.uniform("uTime")[0]) < 0.001
  );
  f.flame.destroy();
});
test("initial failures keep poster visible and expose ready false", () => {
  for (const options of [
    { context: false },
    { compile: false },
    { link: false },
    { allocation: "shader" },
    { allocation: "program" },
    { allocation: "buffer" }
  ]) {
    const f = fixture(options);
    assert.equal(f.flame.ready, false);
    assert.equal(f.canvas.hidden, true);
    assert.equal(f.errors.length, 1);
    f.flame.setState({ visible: true });
    assert.equal(f.queue.size, 0);
    f.flame.destroy();
  }
});
test("context loss or draw failure disables scene and exposes poster; destroy cleans listeners", () => {
  for (const reason of ["loss", "throw", "glerror"]) {
    const f = fixture();
    if (reason === "loss") f.canvas.emit("webglcontextlost");
    else {
      if (reason === "throw")
        f.gl.drawArrays = () => {
          throw new Error("draw failed");
        };
      else f.gl.getError = () => 1282;
      f.tick(100);
    }
    assert.equal(f.flame.ready, false);
    assert.equal(f.canvas.hidden, true);
    assert.equal(f.queue.size, 0);
    assert.equal(f.errors.length, 1);
    f.flame.destroy();
    f.flame.destroy();
    f.flame.setState({ visible: true });
    assert.equal(f.stage.listeners.size, 0);
    assert.equal(f.canvas.listeners.size, 0);
    assert.equal(f.media.listeners.size, 0);
    assert.equal(f.disconnected(), true);
  }
});

test("injected fixed scene clock keeps pointer easing live for equal-time visual proof", () => {
  const f = fixture({ fixedTime: true });
  f.move(550);
  for (let time = 40; time <= 1000; time += 40) f.tick(time);
  assert.deepEqual(f.uniform("uTime"), [0]);
  assert.ok(f.uniform("uPointerStrength")[0] > 0.99);
  assert.ok(f.uniform("uPointer")[0] > 0.349);
  f.stage.emit("pointerleave");
  for (let time = 1040; time <= 2000; time += 40) f.tick(time);
  assert.ok(f.uniform("uPointerStrength")[0] < 0.001);
  assert.deepEqual(f.uniform("uTime"), [0]);
  f.flame.destroy();
});

test("pointer leave while paused invalidates hover without redrawing the frozen frame", () => {
  const f = fixture();
  f.move(550);
  for (let time = 40; time <= 1000; time += 40) f.tick(time);
  f.flame.setState({ playing: false });
  const strength = f.uniform("uPointerStrength")[0];
  const calls = f.calls.length;
  f.stage.emit("pointerleave");
  assert.equal(f.calls.length, calls);
  assert.equal(f.queue.size, 0);
  assert.equal(f.uniform("uPointerStrength")[0], strength);
  f.tick(2000);
  f.flame.setState({ playing: true });
  f.tick(2040);
  assert.ok(f.uniform("uPointerStrength")[0] < strength);
  for (let time = 2080; time <= 3040; time += 40) f.tick(time);
  assert.ok(f.uniform("uPointerStrength")[0] < 0.001);
  f.flame.destroy();
});

test("hiding invalidates hover even when no pointerleave arrives while the surface is hidden", () => {
  const f = fixture();
  f.move(550);
  for (let time = 40; time <= 1000; time += 40) f.tick(time);
  const strength = f.uniform("uPointerStrength")[0];
  f.flame.setState({ visible: false });
  const calls = f.calls.length;
  f.move(270);
  f.tick(2000);
  assert.equal(f.calls.length, calls);
  assert.equal(f.queue.size, 0);
  f.flame.setState({ visible: true });
  f.tick(2040);
  assert.ok(f.uniform("uPointerStrength")[0] < strength);
  for (let time = 2080; time <= 3040; time += 40) f.tick(time);
  assert.ok(f.uniform("uPointerStrength")[0] < 0.001);
  f.move(270);
  f.tick(3080);
  assert.ok(f.uniform("uPointerStrength")[0] > 0.1);
  f.flame.destroy();
});

const radius = (f: ReturnType<typeof fixture>) =>
  Math.hypot(...f.uniform("uPointer"));
const angle = (f: ReturnType<typeof fixture>) =>
  Math.atan2(f.uniform("uPointer")[1], f.uniform("uPointer")[0]);
const movePolar = (f: ReturnType<typeof fixture>, theta: number, r = 0.35) =>
  f.move(410 + 400 * r * Math.cos(theta), 220 - 400 * r * Math.sin(theta));

test("first meaningful ring activation glides from a nearby arc, never out from the center", () => {
  const f = fixture({ fixedTime: true });
  f.move(410);
  for (let time = 40; time <= 400; time += 40) f.tick(time);
  assert.equal(f.uniform("uPointerStrength")[0], 0);
  movePolar(f, 0);
  f.tick(440);
  assert.ok(Math.abs(radius(f) - 0.35) < 1e-6);
  assert.ok(angle(f) < -0.15 && angle(f) > -0.25);
  assert.ok(
    f.uniform("uPointerStrength")[0] > 0.1 &&
      f.uniform("uPointerStrength")[0] < 0.25
  );
  for (let time = 480; time <= 2440; time += 40) f.tick(time);
  assert.ok(Math.abs(angle(f)) < 0.001);
  assert.ok(f.uniform("uPointerStrength")[0] > 0.99);
  f.flame.destroy();
});

test("continued movement is damped around the rim, including diametric jumps and the angle seam", () => {
  const f = fixture({ fixedTime: true });
  movePolar(f, 0);
  for (let time = 40; time <= 2000; time += 40) f.tick(time);
  movePolar(f, Math.PI);
  f.tick(2040);
  assert.ok(
    Math.abs(radius(f) - 0.35) < 1e-6,
    "diametric chase must not cut through center"
  );
  assert.ok(
    Math.abs(angle(f)) > 0.2 && Math.abs(angle(f)) < 0.6,
    "damped, not snapped"
  );
  for (let time = 2080; time <= 4000; time += 40) f.tick(time);
  movePolar(f, -Math.PI + 0.1);
  f.tick(4040);
  assert.ok(Math.abs(angle(f)) > 3, "cross angle seam by the short route");
  f.flame.destroy();
});

test("pointer damping and attack are independent of 30/60/120Hz event cadence", () => {
  const samples = [30, 60, 120].map((hz) => {
    const f = fixture({ fixedTime: true });
    movePolar(f, 0);
    for (let index = 1; index <= hz; index++) {
      movePolar(f, 0);
      f.tick((index * 1000) / hz);
    }
    const result = [...f.uniform("uPointer"), ...f.uniform("uPointerStrength")];
    f.flame.destroy();
    return result;
  });
  for (const sample of samples.slice(1))
    sample.forEach((value, i) =>
      assert.ok(Math.abs(value - samples[0][i]) < 1e-8)
    );
});

test("brief departures release at the current rim position without restarting the entry glide", () => {
  const f = fixture({ fixedTime: true });
  movePolar(f, 0);
  for (let time = 40; time <= 2000; time += 40) f.tick(time);
  const before = f.uniform("uPointer");
  f.move(410);
  f.tick(2040);
  assert.deepEqual(f.uniform("uPointer"), before);
  assert.ok(f.uniform("uPointerStrength")[0] < 0.8);
  movePolar(f, 0.01);
  f.tick(2080);
  assert.ok(
    Math.abs(angle(f)) < 0.02,
    "no fresh offset for a brief boundary crossing"
  );
  f.flame.destroy();
});

test("rapid crossings near the support cutoff do not repeatedly reseed the sheen", () => {
  const f = fixture({ fixedTime: true });
  movePolar(f, 0);
  for (let time = 40; time <= 2000; time += 40) f.tick(time);
  for (let time = 2040; time <= 2400; time += 40) {
    movePolar(f, 0, time % 80 === 0 ? 0.445 : 0.455);
    f.tick(time);
    assert.ok(
      Math.abs(angle(f)) < 0.001,
      "a boundary wobble must not restart the quarter-radian entry"
    );
  }
  assert.ok(f.uniform("uPointerStrength")[0] > 0.1);
  f.flame.destroy();
});

test("completed fade and explicit resets rearm the entry glide, while pause freezes an active chase", () => {
  const f = fixture({ fixedTime: true });
  movePolar(f, 0);
  f.tick(40);
  f.flame.setState({ playing: false });
  const frozen = [...f.uniform("uPointer"), ...f.uniform("uPointerStrength")];
  movePolar(f, 1);
  f.tick(4000);
  assert.deepEqual(
    [...f.uniform("uPointer"), ...f.uniform("uPointerStrength")],
    frozen
  );
  f.flame.setState({ playing: true });
  f.tick(4040);
  assert.ok(angle(f) > Math.atan2(frozen[1], frozen[0]) && angle(f) < 0);
  f.stage.emit("pointerleave");
  for (let time = 4080; time <= 5080; time += 40) f.tick(time);
  movePolar(f, 1);
  f.tick(5120);
  assert.ok(
    angle(f) > 0.75 && angle(f) < 0.85,
    "fresh entry after complete fade"
  );
  let timestamp = 5120;
  for (const reset of [{ pointerEnabled: false }]) {
    f.flame.setState(reset);
    assert.equal(f.uniform("uPointerStrength")[0], 0);
    f.flame.setState({ pointerEnabled: true });
    movePolar(f, 0);
    f.tick((timestamp += 40));
    assert.ok(angle(f) < -0.15 && angle(f) > -0.25);
  }
  f.flame.destroy();
});

test("palette blend crosses a ring-loop boundary and settles independently", () => {
  const f = fixture();
  f.tick(11000);
  f.flame.setState({ palette: "copper-ember" });
  f.tick(12200);
  assert.deepEqual(f.uniform("uPaletteWeights"), [0, 0.5, 0.5]);
  f.tick(13400);
  assert.deepEqual(f.uniform("uPaletteWeights"), [0, 0, 1]);
  f.flame.destroy();
});
test("interrupted blend starts continuously from current weights", () => {
  const f = fixture();
  f.flame.setState({ palette: "copper-ember" });
  f.tick(1200);
  const midway = f.uniform("uPaletteWeights");
  f.flame.setState({ palette: "pale-brass" });
  assert.deepEqual(f.uniform("uPaletteWeights"), midway);
  f.tick(2400);
  assert.deepEqual(f.uniform("uPaletteWeights"), [0.5, 0.25, 0.25]);
  f.tick(3600);
  assert.deepEqual(f.uniform("uPaletteWeights"), [1, 0, 0]);
  f.flame.destroy();
});
test("pause and hide freeze palette transitions including retargets", () => {
  for (const patch of [{ playing: false }, { visible: false }]) {
    const f = fixture();
    f.flame.setState({ palette: "copper-ember" });
    f.tick(1200);
    f.flame.setState(patch);
    f.flame.setState({ palette: "pale-brass" });
    f.tick(10000);
    assert.deepEqual(f.uniform("uPaletteWeights"), [0, 0.5, 0.5]);
    f.flame.setState({ playing: true, visible: true });
    f.tick(11200);
    assert.deepEqual(f.uniform("uPaletteWeights"), [0.5, 0.25, 0.25]);
    f.flame.destroy();
  }
});

test("quality, loop, toggles and zero-duration transitions accept configured values", () => {
  const f = fixture({
    config: {
      quality: { fps: 20, maxPixelRatio: 1, maxRenderSize: 500 },
      motion: { loopSeconds: 8 },
      pointer: { enabled: false },
      prism: { enabled: false }
    },
    transitionSeconds: 0
  });
  assert.equal(f.canvas.width, 500);
  assert.equal(f.canvas.height, 250);
  assert.deepEqual(f.uniform("uChromatic"), [0]);
  f.tick(9000);
  assert.deepEqual(f.uniform("uTime"), [1]);
  f.flame.setState({ palette: "pale-brass" });
  assert.deepEqual(f.uniform("uPaletteWeights"), [1, 0, 0]);
  f.move(550);
  f.tick(9100);
  assert.deepEqual(f.uniform("uPointerStrength"), [0]);
  f.flame.destroy();
});
test("window blur invalidates hover and destroys external target listeners", () => {
  const f = fixture();
  f.move(550);
  f.tick(100);
  const strength = f.uniform("uPointerStrength")[0];
  f.pointerTarget.emit("blur");
  f.tick(200);
  assert.ok(f.uniform("uPointerStrength")[0] < strength);
  f.flame.destroy();
  assert.equal(f.pointerTarget.listeners.size, 0);
});

test("equivalent numeric targets in new arrays do not restart a fade", () => {
  const f = fixture();
  f.flame.setState({ palette: [1, 0, 1] });
  f.tick(600);
  f.flame.setState({ palette: [2, 0, 2] });
  f.tick(2400);
  assert.deepEqual(f.uniform("uPaletteWeights"), [0.5, 0, 0.5]);
  f.flame.destroy();
});
test("zero-duration external weight streams preserve ring clock and sheen", () => {
  const f = fixture({ transitionSeconds: 0 });
  f.move(550);
  f.tick(100);
  const clock = f.uniform("uTime");
  const pointer = f.uniform("uPointer");
  const strength = f.uniform("uPointerStrength");
  for (const palette of [
    [1, 1, 0],
    [0, 1, 1],
    [1, 0, 1]
  ] as const) {
    f.flame.setState({ palette });
    assert.deepEqual(
      f.uniform("uPaletteWeights"),
      palette.map((v) => v / 2)
    );
    assert.deepEqual(f.uniform("uTime"), clock);
    assert.deepEqual(f.uniform("uPointer"), pointer);
    assert.deepEqual(f.uniform("uPointerStrength"), strength);
  }
  f.flame.destroy();
});
test("duration edits restart a transition continuously from its current mixture", () => {
  const f = fixture();
  f.flame.setState({ palette: [1, 0, 1] });
  f.tick(1200);
  const midway = f.uniform("uPaletteWeights");
  f.flame.setState({ transitionSeconds: 4 });
  assert.deepEqual(f.uniform("uPaletteWeights"), midway);
  f.tick(3200);
  assert.deepEqual(f.uniform("uPaletteWeights"), [0.375, 0.25, 0.375]);
  f.flame.setState({ transitionSeconds: 0 });
  assert.deepEqual(f.uniform("uPaletteWeights"), [0.5, 0, 0.5]);
  f.flame.destroy();
});
test("initial hidden/paused state never schedules; invalid transition durations fail clearly", () => {
  for (const initialState of [{ playing: false }, { visible: false }]) {
    const f = fixture({ initialState });
    assert.equal(f.queue.size, 0);
    f.flame.destroy();
  }
  for (const transitionSeconds of [-1, NaN, Infinity])
    assert.throws(() => fixture({ transitionSeconds }), /transitionSeconds/);
  const f = fixture();
  assert.throws(
    () => f.flame.setState({ transitionSeconds: -1 }),
    /transitionSeconds/
  );
  f.flame.destroy();
});
test("partial allocation failures release everything allocated, exactly once", () => {
  for (const [options, expected] of [
    [{ compile: false }, ["deleteShader"]],
    [{ link: false }, ["deleteProgram", "deleteShader", "deleteShader"]],
    [
      { allocation: "buffer" },
      ["deleteProgram", "deleteShader", "deleteShader"]
    ]
  ] as const) {
    const f = fixture(options);
    assert.deepEqual(
      f.calls.filter((row) => row[0].startsWith("delete")).map((row) => row[0]),
      expected
    );
    const count = f.calls.length;
    f.flame.destroy();
    assert.equal(f.calls.length, count);
  }
});

test("runtime failure releases GPU allocations immediately, without double release on destroy", () => {
  const f = fixture();
  f.canvas.emit("webglcontextlost");
  const deleted = () =>
    f.calls.filter((row) => row[0].startsWith("delete")).length;
  assert.equal(deleted(), 4);
  f.flame.destroy();
  assert.equal(deleted(), 4);
});

const ignitionConfig = {
  fire: { intensity: 1 },
  ignition: { enabled: true, durationSeconds: 1.6 }
} as const;
test("color clock remains continuous across the geometry loop and freezes with the renderer", () => {
  const f = fixture();
  f.tick(13000);
  assert.deepEqual(f.uniform("uTime"), [1]);
  assert.deepEqual(f.uniform("uColorTime"), [13]);
  f.flame.setState({ visible: false });
  f.tick(20000);
  f.flame.setState({ visible: true });
  f.tick(21000);
  assert.deepEqual(f.uniform("uColorTime"), [14]);
  f.flame.setState({ playing: false });
  f.tick(31000);
  assert.deepEqual(f.uniform("uColorTime"), [14]);
  f.flame.destroy();
});
test("ignition remains dark until activated, then lights over the configured active time without retriggering", () => {
  const f = fixture({
    config: ignitionConfig,
    initialState: { ignited: false }
  });
  assert.deepEqual(f.uniform("uIgnitionProgress"), [0]);
  f.tick(800);
  assert.equal(f.flame.ignitionProgress, 0);
  f.flame.setState({ ignited: true });
  f.tick(1600);
  assert.deepEqual(f.uniform("uIgnitionProgress"), [0.5]);
  f.flame.setState({ ignited: true });
  f.tick(2400);
  assert.deepEqual(f.uniform("uIgnitionProgress"), [1]);
  f.tick(14400);
  assert.equal(
    f.flame.ignitionProgress,
    1,
    "ignition must not repeat with scene loop"
  );
  f.flame.setState({ ignited: false });
  assert.deepEqual(f.uniform("uIgnitionProgress"), [0]);
  f.flame.setState({ ignited: true });
  f.tick(14800);
  assert.equal(f.flame.ignitionProgress, 0.25);
  assert.equal(f.queue.size, 1, "ignition shares the scene RAF");
  f.flame.destroy();
});
test("ignition pause and visibility suspension preserve progress without a wall-clock jump", () => {
  for (const patch of [{ playing: false }, { visible: false }]) {
    const f = fixture({ config: ignitionConfig });
    f.tick(400);
    assert.equal(f.flame.ignitionProgress, 0.25);
    f.flame.setState(patch);
    f.tick(10000);
    assert.equal(f.flame.ignitionProgress, 0.25);
    assert.equal(f.queue.size, 0);
    f.flame.setState({ playing: true, visible: true });
    f.tick(10400);
    assert.equal(f.flame.ignitionProgress, 0.5);
    f.flame.destroy();
  }
});
test("disabled ignition leaves the original scene lit", () => {
  const f = fixture({ initialState: { ignited: false } });
  assert.equal(f.flame.ignitionProgress, 1);
  f.flame.destroy();
});

test("initial ignition progress resumes recreation and supports settled fail-open rendering", () => {
  for (const initialIgnitionProgress of [0, 0.375, 1]) {
    const f = fixture({ config: ignitionConfig, initialIgnitionProgress });
    assert.equal(f.flame.ignitionProgress, initialIgnitionProgress);
    assert.deepEqual(f.uniform("uIgnitionProgress"), [initialIgnitionProgress]);
    f.tick(400);
    assert.equal(
      f.flame.ignitionProgress,
      Math.min(1, initialIgnitionProgress + 0.25)
    );
    const saved = f.flame.ignitionProgress;
    f.flame.destroy();
    const recreated = fixture({
      config: ignitionConfig,
      initialIgnitionProgress: saved
    });
    assert.equal(recreated.flame.ignitionProgress, saved);
    recreated.flame.destroy();
  }
  const inactive = fixture({
    config: ignitionConfig,
    initialIgnitionProgress: 1,
    initialState: { ignited: false }
  });
  assert.equal(inactive.flame.ignitionProgress, 0);
  inactive.flame.destroy();
});
test("invalid ignition inputs fail before changing the active renderer", () => {
  for (const initialIgnitionProgress of [-0.1, 1.1, NaN, Infinity, null, "1"]) {
    assert.throws(
      () =>
        fixture({ initialIgnitionProgress: initialIgnitionProgress as number }),
      /initialIgnitionProgress/
    );
  }
  for (const ignited of [null, undefined, 1, "true"]) {
    assert.throws(
      () =>
        fixture({ initialState: { ignited: ignited as unknown as boolean } }),
      /ignited/
    );
    const f = fixture({ config: ignitionConfig });
    f.tick(400);
    assert.throws(
      () => f.flame.setState({ ignited: ignited as unknown as boolean }),
      /ignited/
    );
    assert.equal(f.flame.ignitionProgress, 0.25);
    f.flame.destroy();
  }
  const failed = fixture({ context: false, config: ignitionConfig });
  assert.equal(failed.flame.ignitionProgress, 0);
  failed.flame.destroy();
});

test("config recreation preserves flame phase and monotonic color time across loop boundaries", () => {
  const first = fixture({ config: { motion: { loopSeconds: 16 } } });
  first.tick(19400);
  assert.equal(first.flame.elapsedSeconds, 19.4);
  const checkpoint = first.flame.elapsedSeconds;
  const phase = first.uniform("uTime");
  const color = first.uniform("uColorTime");
  first.flame.destroy();
  assert.equal(
    first.flame.elapsedSeconds,
    checkpoint,
    "checkpoint remains readable after cleanup"
  );
  const next = fixture({
    initialElapsedSeconds: checkpoint,
    config: {
      motion: { loopSeconds: 16 },
      composition: { mode: "footer", verticalScale: 0.6 }
    }
  });
  assert.deepEqual(next.uniform("uTime"), phase);
  assert.deepEqual(next.uniform("uColorTime"), color);
  next.tick(100);
  assert.ok(Math.abs(next.flame.elapsedSeconds - 19.5) < 0.00001);
  assert.ok(Math.abs(next.uniform("uTime")[0] - 3.5) < 0.00001);
  assert.ok(Math.abs(next.uniform("uColorTime")[0] - 19.5) < 0.00001);
  next.flame.destroy();
});

test("restored clocks remain suspended while paused or hidden", () => {
  for (const initialState of [{ playing: false }, { visible: false }]) {
    const f = fixture({ initialElapsedSeconds: 23.5, initialState });
    assert.equal(f.flame.elapsedSeconds, 23.5);
    f.tick(10000);
    assert.equal(f.flame.elapsedSeconds, 23.5);
    assert.equal(f.queue.size, 0);
    f.flame.setState({ playing: true, visible: true });
    f.tick(10100);
    assert.ok(Math.abs(f.flame.elapsedSeconds - 23.6) < 0.00001);
    f.flame.destroy();
  }
});

test("clock checkpoints validate inputs and survive failed initialization", () => {
  for (const initialElapsedSeconds of [-1, NaN, Infinity, null, "1", {}, []]) {
    assert.throws(
      () => fixture({ initialElapsedSeconds: initialElapsedSeconds as number }),
      /initialElapsedSeconds/
    );
  }
  for (const initialElapsedSeconds of [undefined, 0, 1000000]) {
    const f = fixture({ initialElapsedSeconds, context: false });
    assert.equal(f.flame.elapsedSeconds, initialElapsedSeconds ?? 0);
    f.flame.destroy();
  }
});
