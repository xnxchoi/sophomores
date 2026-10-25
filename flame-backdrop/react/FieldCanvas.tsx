'use client';

import { Component, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Mesh, ShaderMaterial, Vector2, Vector3, type Texture } from 'three';
import { FLAME_APPEARANCE } from '../appearance';
import { artworkLayout } from '../layout';
import { emissionGainAt, referenceConfig } from '../field/material';
import { createResponsiveEnvelopeShader } from '../field/shader';
import { createGasFlameShader } from '../field/gas-shader';
import { createMaskTextureSession } from '../field/texture';
import { DEFAULT_MASK_URL } from '../field/parameters';
import { canPlayField } from '../field/playback';
import { advanceFieldTime } from '../field/runtime';
import { advanceIgnition, INITIAL_IGNITION, latchReverseIntent, latestViewportIntersection, retainPilotOnExit, viewportExposure } from '../field/ignition';
import { FIELD_VERTEX_SHADER, validateVerticalStretch } from '../field/presentation';
import { subscribeVisibility, serverSnapshot as serverHidden } from '../../utils/browser/visibility';

interface FieldCanvasProps {
  readonly maskSource?: string;
  readonly paused?: boolean;
  readonly visible?: boolean;
  readonly verticalStretch?: number;
  /** Production footer only; the editor retains its historical material and active clock. */
  readonly ignition?: boolean;
  readonly onFailure?: (message: string) => void;
  readonly onMaskFailure?: (message: string) => void;
  readonly onMaskReady?: () => void;
}

const unavailable = 'The decorative field could not start on this device.';
const documentHidden = () => document.hidden;

class FieldBoundary extends Component<{ readonly children: ReactNode; readonly report?: (message: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) {
    console.error('Footer field initialization failed', error);
    this.props.report?.(unavailable);
  }
  render() { return this.state.failed ? <div data-render-status="error" /> : this.props.children; }
}

/** R3F owns the renderer, canvas sizing, camera, geometry/material disposal and scheduling. */
export function FieldCanvas({ maskSource = DEFAULT_MASK_URL, paused = false, visible = true,
  verticalStretch = 1, ignition = false, onFailure, onMaskFailure, onMaskReady }: FieldCanvasProps) {
  validateVerticalStretch(verticalStretch);
  const hidden = useSyncExternalStore(subscribeVisibility, documentHidden, serverHidden);
  const [inView, setInView] = useState(false);
  const playing = canPlayField({ paused, visible: visible && (!ignition || inView), hidden });
  const [available, setAvailable] = useState(false);
  return <FieldBoundary report={onFailure}>
    <Canvas className="pointer-events-none! h-full w-full" frameloop={playing && available ? 'always' : 'demand'} dpr={[...FLAME_APPEARANCE.rendering.dpr]} flat={FLAME_APPEARANCE.rendering.flat}
      gl={{ antialias: FLAME_APPEARANCE.rendering.antialias, alpha: FLAME_APPEARANCE.rendering.alpha, premultipliedAlpha: FLAME_APPEARANCE.rendering.premultipliedAlpha }}
      fallback={<div data-render-status="error" />}>
      <FieldPlane maskSource={maskSource} playing={playing} verticalStretch={verticalStretch} ignition={ignition} onFailure={onFailure}
        onMaskFailure={onMaskFailure} onMaskReady={onMaskReady} onAvailabilityChange={setAvailable} onViewportChange={setInView} />
    </Canvas>
  </FieldBoundary>;
}

interface FieldPlaneProps extends FieldCanvasProps {
  readonly playing: boolean;
  readonly onAvailabilityChange: (available: boolean) => void;
  readonly onViewportChange: (visible: boolean) => void;
}

function FieldPlane({ maskSource = DEFAULT_MASK_URL, playing, verticalStretch = 1, ignition = false, onFailure, onMaskFailure, onMaskReady, onAvailabilityChange, onViewportChange }: FieldPlaneProps) {
  const material = useRef<ShaderMaterial>(null);
  const mesh = useRef<Mesh>(null);
  const elapsed = useRef(0);
  const ignitionState = useRef(INITIAL_IGNITION);
  const viewport = useRef({ exposure: 0, reversing: false });
  const firstFrame = useRef(true);
  const failed = useRef(false);
  const maskStatus = useRef('loading');
  const session = useRef<ReturnType<typeof createMaskTextureSession> | null>(null);
  const callbacks = useRef({ onFailure, onMaskFailure, onMaskReady });
  const { gl, size, invalidate } = useThree();
  const renderer = useRef(gl);
  const config = useMemo(() => referenceConfig(1440, 900), []);
  const fragmentShader = useMemo(() => ignition ? createGasFlameShader(config) : createResponsiveEnvelopeShader(config), [config, ignition]);
  const uniforms = useMemo(() => ({
    uMask: { value: null as Texture | null }, uMaterialWidth: { value: 1 }, uVerticalStretch: { value: 1 },
    uScale: { value: new Vector2() }, uOrigin: { value: new Vector2() },
    uTime: { value: 0 }, uMotionTime: { value: 0 }, uColorTime: { value: 0 }, uCssPixel: { value: 0 },
    uIgnitionProgress: { value: 1 }, uViewportExposure: { value: 1 },
    uEmissionGain: { value: emissionGainAt(0) }, uPointer: { value: new Vector2() },
    uPointerStrength: { value: 0 }, uChromatic: { value: 0 }, uPaletteWeights: { value: new Vector3(0, 1, 0) }
  }), []);

  useEffect(() => { callbacks.current = { onFailure, onMaskFailure, onMaskReady }; }, [onFailure, onMaskFailure, onMaskReady]);

  useEffect(() => {
    if (!ignition) return;
    const canvas = renderer.current.domElement;
    const target = canvas.closest('section') ?? canvas;
    let scrollY = window.scrollY;
    let intersecting = false;
    const measure = () => {
      const bounds = target.getBoundingClientRect();
      viewport.current = { ...viewport.current, exposure: viewportExposure(bounds.top, bounds.height, window.innerHeight) };
      ignitionState.current = retainPilotOnExit(ignitionState.current, bounds.top, window.innerHeight, viewport.current.reversing);
      invalidate();
    };
    const scroll = () => {
      const next = window.scrollY;
      viewport.current = { ...viewport.current, reversing: latchReverseIntent(viewport.current.reversing, scrollY, next) };
      scrollY = next;
      if (intersecting) measure();
    };
    const observer = new IntersectionObserver(entries => {
      const latest = latestViewportIntersection(entries);
      if (latest === undefined) return;
      intersecting = latest;
      onViewportChange(intersecting);
      measure();
    });
    observer.observe(target);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', measure);
    };
  }, [ignition, invalidate, onViewportChange]);

  useEffect(() => {
    const activeRenderer = renderer.current;
    const canvas = activeRenderer.domElement;
    const fail = (message: string) => {
      failed.current = true;
      onAvailabilityChange(false);
      canvas.dataset.renderStatus = 'error';
      canvas.dataset.playback = 'paused';
      if (mesh.current) mesh.current.visible = false;
      callbacks.current.onFailure?.(message);
      invalidate();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      fail('The graphics context was lost. Reload the page to retry.');
    };
    const previous = activeRenderer.debug.onShaderError;
    activeRenderer.debug.onShaderError = () => fail('The field material could not compile on this device.');
    canvas.addEventListener('webglcontextlost', lost);
    gl.setClearColor(0x000000, 0);
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      activeRenderer.debug.onShaderError = previous;
    };
  }, [gl, invalidate, onAvailabilityChange]);

  useEffect(() => {
    const mask = createMaskTextureSession({
      onChange: (texture, status) => {
        maskStatus.current = status;
        if (material.current) material.current.uniforms.uMask.value = texture;
        if (mesh.current) mesh.current.visible = status === 'ready' && !failed.current;
        renderer.current.domElement.dataset.maskStatus = status;
        renderer.current.domElement.dataset.renderStatus = failed.current || status === 'error' ? 'error' : status === 'ready' ? 'pending' : 'loading';
        if (status === 'ready' && !failed.current) callbacks.current.onMaskReady?.();
        onAvailabilityChange(status === 'ready' && !failed.current);
        firstFrame.current = true;
        invalidate();
      },
      onError: message => (callbacks.current.onMaskFailure ?? callbacks.current.onFailure)?.(message)
    });
    session.current = mask;
    return () => { session.current = null; mask.destroy(); };
  }, [gl, invalidate, onAvailabilityChange]);

  useEffect(() => { session.current?.setSource(maskSource); }, [maskSource]);

  useEffect(() => {
    if (material.current) material.current.uniforms.uVerticalStretch.value = verticalStretch;
    invalidate();
  }, [verticalStretch, invalidate]);

  useEffect(() => {
    if (!material.current || !size.width || !size.height) return;
    const layout = artworkLayout(size.width, size.height, referenceConfig(size.width, size.height));
    material.current.uniforms.uScale.value.set(...layout.scale);
    material.current.uniforms.uOrigin.value.set(...layout.origin);
    material.current.uniforms.uCssPixel.value = 1 / layout.side;
    material.current.uniforms.uMaterialWidth.value = Math.min(1, size.width / size.height / 1.6);
    invalidate();
  }, [size.width, size.height, invalidate]);

  useEffect(() => {
    firstFrame.current = true;
    renderer.current.domElement.dataset.playback = playing && !failed.current ? 'playing' : 'paused';
    invalidate();
  }, [playing, invalidate]);

  useFrame((state, delta) => {
    renderer.current.domElement.dataset.frameloop = state.frameloop;
    if (!material.current || failed.current) return;
    const advancing = playing && maskStatus.current === 'ready';
    renderer.current.domElement.dataset.playback = advancing ? 'playing' : 'paused';
    const frameDelta = firstFrame.current ? 0 : delta;
    elapsed.current = advanceFieldTime(elapsed.current, frameDelta, advancing);
    if (ignition) {
      ignitionState.current = advanceIgnition(ignitionState.current, frameDelta, advancing, viewport.current.exposure, viewport.current.reversing);
      if (advancing) viewport.current = { ...viewport.current, reversing: false };
    }
    firstFrame.current = false;
    const seconds = elapsed.current;
    const values = material.current.uniforms;
    values.uTime.value = seconds % config.motion.loopSeconds;
    values.uMotionTime.value = seconds;
    values.uColorTime.value = seconds;
    values.uEmissionGain.value = emissionGainAt(seconds);
    values.uIgnitionProgress.value = ignition ? ignitionState.current.progress : 1;
    values.uViewportExposure.value = ignition ? viewport.current.exposure : 1;
    renderer.current.domElement.dataset.elapsed = seconds.toFixed(6);
    renderer.current.domElement.dataset.emissionGain = values.uEmissionGain.value.toFixed(6);
    renderer.current.domElement.dataset.breathingElapsed = seconds.toFixed(6);
    renderer.current.domElement.dataset.ignitionProgress = values.uIgnitionProgress.value.toFixed(6);
    renderer.current.domElement.dataset.footerExposure = values.uViewportExposure.value.toFixed(6);
    renderer.current.domElement.dataset.ignitionPhase = !ignition ? 'disabled' : ignitionState.current.scrubbing ? 'scrub' : ignitionState.current.progress === 0 ? 'black' : ignitionState.current.progress < 1 ? 'igniting' : 'sustained';
  });

  return <mesh ref={mesh} frustumCulled={false} visible={false} onAfterRender={() => {
    if (!failed.current && maskStatus.current === 'ready') renderer.current.domElement.dataset.renderStatus = 'ready';
  }}>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={FIELD_VERTEX_SHADER}
      fragmentShader={fragmentShader} depthTest={false} depthWrite={false} toneMapped={FLAME_APPEARANCE.rendering.toneMapped} />
  </mesh>;
}
