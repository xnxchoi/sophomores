'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { resolveFlameConfig, type FlameConfig, type FlameConfigInput } from './config';
import { resolvePaletteWeights, type PaletteInput } from './palette';
import { createFlame } from './renderer';
import { validateViewportOptions, watchViewport, type ViewportActivation } from './viewport';
import { validateFooterMaterial, type FooterMaterial } from './footer-material';

export interface FlameBackdropProps {
  /** Preset name or [pale brass, gilded flame, copper ember] weights. No automatic driver. */
  readonly palette?: PaletteInput;
  /** Seconds to ease from the currently displayed mix. Set 0 for an external animation clock. */
  readonly transitionSeconds?: number;
  /** Visual/behavior settings; changing these recreates the renderer. Palette changes do not. */
  readonly config?: FlameConfigInput;
  /** Opt-in footer-only material study. Hero rendering is unaffected. */
  readonly footerMaterial?: FooterMaterial;
  /** Freeze all animation, including palette fades. */
  readonly paused?: boolean;
  /** Suspend an offscreen/unused backdrop without unmounting. Document visibility is also respected. */
  readonly visible?: boolean;
  /** none renders immediately; once ignites at first entry; repeat reignites after a true viewport exit. */
  readonly viewportActivation?: ViewportActivation;
  /** Fraction of the host visible before ignition starts; 0 through 1. */
  readonly viewportThreshold?: number;
  readonly respectReducedMotion?: boolean;
  readonly className?: string;
  /** Supply a height or a positioned inset from the host layout. */
  readonly style?: CSSProperties;
  /** Optional decorative still behind the canvas, shown during SSR or if WebGL fails. No media required. */
  readonly fallback?: ReactNode;
  /** Client-side consumers only. Without a handler, rendering failures are logged to the console. */
  readonly onUnavailable?: (error: Error) => void;
}

/** Control-agnostic, sampler-free flame material. Viewport observation is opt-in and never captures input. */
export function FlameBackdrop({
  palette = 'gilded-flame', transitionSeconds = 2.4, config, paused = false, visible = true,
  respectReducedMotion = true, viewportActivation = 'none', viewportThreshold = .08,
  className, style, fallback, onUnavailable, footerMaterial = 'light',
}: FlameBackdropProps) {
  resolvePaletteWeights(palette);
  validateViewportOptions(viewportActivation, viewportThreshold);
  validateFooterMaterial(footerMaterial);
  if (!Number.isFinite(transitionSeconds) || transitionSeconds < 0) {
    throw new RangeError('transitionSeconds must be finite and nonnegative.');
  }
  const resolved = resolveFlameConfig(config);
  // Value equality prevents incidental parent object identity changes from resetting the WebGL scene.
  const configKey = JSON.stringify(resolved);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createFlame> | null>(null);
  const syncRef = useRef<(() => void) | null>(null);
  const ignitionRef = useRef<{ started: boolean; inView: boolean; progress: number } | null>(null);
  const elapsedRef = useRef(0);
  const latest = useRef({ palette, transitionSeconds, paused, visible, respectReducedMotion, onUnavailable });

  useEffect(() => {
    latest.current = { palette, transitionSeconds, paused, visible, respectReducedMotion, onUnavailable };
    syncRef.current?.();
  }, [palette, transitionSeconds, paused, visible, respectReducedMotion, onUnavailable]);

  useEffect(() => {
    const stage = rootRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const settings: FlameConfig = JSON.parse(configKey);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = true;
    let sync = () => {};
    const viewport = watchViewport({ target: stage, mode: viewportActivation, threshold: viewportThreshold,
      previousStarted: ignitionRef.current?.started,
      previousInView: ignitionRef.current?.inView,
      Observer: typeof window.IntersectionObserver === 'function' ? window.IntersectionObserver : undefined,
      onChange: () => sync(),
    });
    const state = () => ({
      palette: latest.current.palette, transitionSeconds: latest.current.transitionSeconds,
      playing: !latest.current.paused,
      visible: latest.current.visible && !document.hidden && viewport.state.inView,
      ignited: viewport.state.started,
      reducedMotion: latest.current.respectReducedMotion && reducedMotion.matches,
    });
    stage.dataset.renderStatus = 'pending';
    const renderer = createFlame({
      canvas, stage, pointerTarget: window, config: settings, footerMaterial,
      initialPalette: latest.current.palette, transitionSeconds: latest.current.transitionSeconds,
      initialIgnitionProgress: viewport.initialProgress === 1 ? 1 : ignitionRef.current?.progress ?? 0,
      initialElapsedSeconds: elapsedRef.current,
      initialState: state(),
      onUnavailable: error => {
        stage.dataset.renderStatus = 'unavailable';
        if (latest.current.onUnavailable) latest.current.onUnavailable(error);
        else console.error('[FlameBackdrop]', error);
      },
    });
    rendererRef.current = renderer;
    if (renderer.ready) stage.dataset.renderStatus = 'ready';
    sync = () => { if (active) renderer.setState(state()); };
    syncRef.current = sync;
    document.addEventListener('visibilitychange', sync);
    reducedMotion.addEventListener('change', sync);
    return () => {
      active = false;
      viewport.disconnect();
      ignitionRef.current = { ...viewport.checkpoint, progress: renderer.ignitionProgress };
      elapsedRef.current = renderer.elapsedSeconds;
      document.removeEventListener('visibilitychange', sync);
      reducedMotion.removeEventListener('change', sync);
      renderer.destroy();
      rendererRef.current = null;
      syncRef.current = null;
    };
  }, [configKey, viewportActivation, viewportThreshold, footerMaterial]);

  return (
    <div ref={rootRef} className={className} aria-hidden="true" data-flame-backdrop="" data-render-status="pending"
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style,
        backgroundColor: resolved.visual.backgroundColor, pointerEvents: 'none' }}>
      {fallback}
      <canvas ref={canvasRef} hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}

export default FlameBackdrop;
