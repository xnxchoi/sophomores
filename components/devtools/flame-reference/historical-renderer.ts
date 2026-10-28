import {
  Camera,
  Mesh,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";
import { artworkLayout } from "@/components/gl/flame-backdrop/layout";
import {
  createHistoricalShader,
  emissionGainAt,
  HISTORICAL_VERTEX_SHADER,
  referenceConfig,
  type HistoricalVariant
} from "@/components/gl/flame-backdrop/field/material";

export interface HistoricalPlaybackOptions {
  readonly variant: HistoricalVariant;
  readonly paused: boolean;
}

/** Recovered shader playback only: no material, geometry, opacity, or palette interpretation. */
export function createHistoricalRenderer(
  canvas: HTMLCanvasElement,
  onFailure: (message: string) => void,
  options: HistoricalPlaybackOptions = { variant: "stronger", paused: false }
) {
  let config = referenceConfig(1440, 900);
  let variant: HistoricalVariant = options.variant;
  const initialShader = createHistoricalShader(config, variant);
  const disposers: Array<() => void> = [];
  let disposed = false;
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    for (let index = disposers.length - 1; index >= 0; index--) {
      try {
        disposers[index]();
      } catch (error) {
        console.error("Historical renderer cleanup failed", error);
      }
    }
  };
  try {
    const renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false
    });
    disposers.push(() => renderer.dispose());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const scene = new Scene();
    const camera = new Camera();
    const geometry = new PlaneGeometry(2, 2);
    disposers.push(() => geometry.dispose());
    const uniforms = {
      uScale: { value: new Vector2() },
      uOrigin: { value: new Vector2() },
      uTime: { value: 0 },
      uColorTime: { value: 0 },
      uCssPixel: { value: 0 },
      uEmissionGain: { value: emissionGainAt(0) },
      uPointer: { value: new Vector2() },
      uPointerStrength: { value: 0 },
      uChromatic: { value: 0 },
      uPaletteWeights: { value: new Vector3(0, 1, 0) }
    };
    const material = new ShaderMaterial({
      uniforms,
      vertexShader: HISTORICAL_VERTEX_SHADER,
      fragmentShader: initialShader,
      depthTest: false,
      depthWrite: false
    });
    disposers.push(() => material.dispose());
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    disposers.push(() => scene.remove(mesh));

    let failed = false;
    let paused = options.paused;
    let frame = 0;
    disposers.push(() => cancelAnimationFrame(frame));
    let seconds = 0;
    let breathingStartedAt = 0;
    let lastTime: number | null = null;
    let lastDraw = -Infinity;
    const fail = (message: string) => {
      if (disposed) return;
      failed = true;
      canvas.dataset.renderStatus = "error";
      cancelAnimationFrame(frame);
      onFailure(message);
    };
    renderer.debug.onShaderError = () =>
      fail("The recovered shader could not compile on this device.");
    const draw = () => {
      if (disposed || failed) return;
      uniforms.uTime.value = seconds % config.motion.loopSeconds;
      uniforms.uColorTime.value = seconds;
      uniforms.uEmissionGain.value = emissionGainAt(
        seconds - breathingStartedAt
      );
      renderer.render(scene, camera);
      if (!failed) {
        canvas.dataset.renderStatus = "ready";
        canvas.dataset.variant = variant;
        canvas.dataset.elapsed = seconds.toFixed(6);
        canvas.dataset.emissionGain = (
          variant === "initial"
            ? 1
            : variant === "stronger"
              ? emissionGainAt(0)
              : uniforms.uEmissionGain.value
        ).toFixed(6);
        canvas.dataset.breathingElapsed = (
          seconds - breathingStartedAt
        ).toFixed(6);
      }
    };
    const active = () => !disposed && !failed && !paused && !document.hidden;
    const tick = (now: number) => {
      frame = 0;
      if (!active()) return;
      if (now - lastDraw >= 1000 / config.quality.fps) {
        if (lastTime !== null)
          seconds += Math.max(0, Math.min(0.1, (now - lastTime) / 1000));
        lastTime = now;
        lastDraw = now;
        draw();
      }
      if (active()) frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
      if (active()) frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      if (disposed || failed) return;
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      config = referenceConfig(width, height);
      const layout = artworkLayout(width, height, config);
      uniforms.uScale.value.set(...layout.scale);
      uniforms.uOrigin.value.set(...layout.origin);
      uniforms.uCssPixel.value = 1 / layout.side;
      const source = createHistoricalShader(config, variant);
      if (source !== material.fragmentShader) {
        material.fragmentShader = source;
        material.needsUpdate = true;
      }
      renderer.setSize(width, height, false);
      draw();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      fail("The graphics context was lost. Reload this reference to retry.");
    };
    const observer = new ResizeObserver(resize);
    disposers.push(() => observer.disconnect());
    observer.observe(canvas);
    disposers.push(() =>
      document.removeEventListener("visibilitychange", sync)
    );
    document.addEventListener("visibilitychange", sync);
    disposers.push(() =>
      canvas.removeEventListener("webglcontextlost", onContextLost)
    );
    canvas.addEventListener("webglcontextlost", onContextLost);
    resize();
    sync();

    return {
      setVariant(next: HistoricalVariant) {
        if (disposed || failed) return;
        const source = createHistoricalShader(config, next);
        if (next === "breathing" && variant !== "breathing")
          breathingStartedAt = seconds;
        variant = next;
        material.fragmentShader = source;
        material.needsUpdate = true;
        draw();
      },
      setPaused(value: boolean) {
        paused = value;
        sync();
      },
      destroy
    };
  } catch (error) {
    destroy();
    throw error;
  }
}
