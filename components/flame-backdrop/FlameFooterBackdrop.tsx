'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createEnvelopeRenderer } from './field/renderer';
import { DEFAULT_MASK_URL } from './field/parameters';

export { DEFAULT_FOOTER_CONFIG, resolveFooterConfig } from './footer-config';

export interface FlameFooterBackdropProps {
  /** PNG/SVG alpha controls coverage. Replacing the source does not reset motion. */
  readonly maskSource?: string;
  readonly paused?: boolean;
  readonly visible?: boolean;
  readonly respectReducedMotion?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The approved airy field, shared with the shader editor; hero ring defaults remain untouched. */
export function FlameFooterBackdrop({ maskSource = DEFAULT_MASK_URL, paused = false, visible = true,
  respectReducedMotion = true, className, style }: FlameFooterBackdropProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const session = useRef<ReturnType<typeof createEnvelopeRenderer> | null>(null);
  const [failure, setFailure] = useState('');
  // Initial options are consumed only at mount; individual effects handle all subsequent updates.
  const initial = useRef({ maskSource, paused, visible, respectReducedMotion });

  useEffect(() => {
    if (!canvas.current) return;
    let disposed = false;
    const report = (message: string) => {
      console.error('Footer field unavailable:', message);
      queueMicrotask(() => { if (!disposed) setFailure(message); });
    };
    try {
      session.current = createEnvelopeRenderer(canvas.current, report, {
        ...initial.current,
        onMaskFailure: report,
        onMaskReady: () => queueMicrotask(() => { if (!disposed) setFailure(''); })
      });
    } catch (error) {
      console.error('Footer field initialization failed', error);
      report('The decorative footer could not start on this device.');
    }
    return () => {
      disposed = true;
      session.current?.destroy();
      session.current = null;
    };
  }, []);

  useEffect(() => { session.current?.setPaused(paused); }, [paused]);
  useEffect(() => { session.current?.setVisible(visible); }, [visible]);
  useEffect(() => { session.current?.setRespectReducedMotion(respectReducedMotion); }, [respectReducedMotion]);
  useEffect(() => {
    if (initial.current.maskSource === maskSource) return;
    initial.current = { ...initial.current, maskSource };
    session.current?.setMaskSource(maskSource);
  }, [maskSource]);

  return <div data-flame-backdrop data-flame-field data-field-error={failure || undefined}
    aria-hidden="true" className={className}
    style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none', ...style }}>
    <canvas ref={canvas} data-render-status="loading" className="absolute inset-0 h-full w-full" />
  </div>;
}

export default FlameFooterBackdrop;
