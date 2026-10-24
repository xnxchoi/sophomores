import { Camera, Mesh, PlaneGeometry, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer } from 'three';
import { artworkLayout } from '../layout';
import { emissionGainAt, HISTORICAL_VERTEX_SHADER, referenceConfig } from './material';
import { createEnvelopeShader } from './shader';
import { createMaskTextureSession } from './texture';
import { DEFAULT_MASK_URL } from './parameters';
import { canPlayField } from './playback';

export interface EnvelopePlaybackOptions {
  readonly paused: boolean;
  readonly visible?: boolean;
  readonly maskSource?: string;
  readonly onMaskReady?: () => void;
  readonly onMaskFailure?: (message: string) => void;
}

/** Shared image-backed field. Mask swaps and playback changes preserve the GPU context and active-time clock. */
export function createEnvelopeRenderer(canvas: HTMLCanvasElement, onFailure: (message: string) => void,
  options: EnvelopePlaybackOptions = { paused: false }) {
  let config = referenceConfig(1440, 900);
  const initialShader = createEnvelopeShader(config);
  const disposers: Array<() => void> = [];
  let disposed = false;
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    for (let index = disposers.length - 1; index >= 0; index--) {
      try { disposers[index](); } catch (error) { console.error('Envelope renderer cleanup failed', error); }
    }
  };
  try {
    const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: false });
    disposers.push(() => renderer.dispose());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const scene = new Scene();
    const camera = new Camera();
    const geometry = new PlaneGeometry(2, 2);
    disposers.push(() => geometry.dispose());
    const mask = createMaskTextureSession({
      onChange: (texture, status) => {
        uniforms.uMask.value = texture;
        canvas.dataset.maskStatus = status;
        if (status === 'ready' && !failed) options.onMaskReady?.();
        draw();
      },
      onError: options.onMaskFailure ?? onFailure
    });
    disposers.push(() => mask.destroy());
    const uniforms = {
      uMask: { value: mask.placeholder },
      uScale: { value: new Vector2() }, uOrigin: { value: new Vector2() },
      uTime: { value: 0 }, uColorTime: { value: 0 }, uCssPixel: { value: 0 }, uEmissionGain: { value: emissionGainAt(0) },
      uPointer: { value: new Vector2() }, uPointerStrength: { value: 0 },
      uChromatic: { value: 0 }, uPaletteWeights: { value: new Vector3(0, 1, 0) }
    };
    const material = new ShaderMaterial({ uniforms, vertexShader: HISTORICAL_VERTEX_SHADER,
      fragmentShader: initialShader, depthTest: false, depthWrite: false });
    disposers.push(() => material.dispose());
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    disposers.push(() => scene.remove(mesh));

    let failed = false;
    let paused = options.paused;
    let visible = options.visible ?? true;
    let frame = 0;
    disposers.push(() => cancelAnimationFrame(frame));
    let seconds = 0;
    let lastTime: number | null = null;
    let lastDraw = -Infinity;
    const fail = (message: string) => {
      if (disposed) return;
      failed = true;
      canvas.dataset.renderStatus = 'error';
      cancelAnimationFrame(frame);
      onFailure(message);
    };
    renderer.debug.onShaderError = () => fail('The envelope material could not compile on this device.');
    const draw = () => {
      if (disposed || failed) return;
      uniforms.uTime.value = seconds % config.motion.loopSeconds;
      uniforms.uColorTime.value = seconds;
      uniforms.uEmissionGain.value = emissionGainAt(seconds);
      renderer.render(scene, camera);
      if (!failed) {
        canvas.dataset.renderStatus = canvas.dataset.maskStatus === 'ready' ? 'ready' : 'loading';
        canvas.dataset.elapsed = seconds.toFixed(6);
        canvas.dataset.emissionGain = uniforms.uEmissionGain.value.toFixed(6);
        canvas.dataset.breathingElapsed = seconds.toFixed(6);
      }
    };
    const active = () => !disposed && !failed && canPlayField({ paused, visible, hidden: document.hidden });
    const tick = (now: number) => {
      frame = 0;
      if (!active()) return;
      if (now - lastDraw >= 1000 / config.quality.fps) {
        if (lastTime !== null) seconds += Math.max(0, Math.min(.1, (now - lastTime) / 1000));
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
      canvas.dataset.playback = active() ? 'playing' : 'paused';
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
      const source = createEnvelopeShader(config, width / height);
      if (source !== material.fragmentShader) {
        material.fragmentShader = source;
        material.needsUpdate = true;
      }
      renderer.setSize(width, height, false);
      draw();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      fail('The graphics context was lost. Reload the page to retry.');
    };
    const observer = new ResizeObserver(resize);
    disposers.push(() => observer.disconnect());
    observer.observe(canvas);
    disposers.push(() => document.removeEventListener('visibilitychange', sync));
    document.addEventListener('visibilitychange', sync);
    disposers.push(() => canvas.removeEventListener('webglcontextlost', onContextLost));
    canvas.addEventListener('webglcontextlost', onContextLost);
    resize();
    mask.setSource(options.maskSource ?? DEFAULT_MASK_URL);
    sync();

    return {
      setPaused(value: boolean) { paused = value; sync(); },
      setVisible(value: boolean) { visible = value; sync(); },
      setMaskSource(value: string) { mask.setSource(value); },
      destroy
    };
  } catch (error) {
    destroy();
    throw error;
  }
}
