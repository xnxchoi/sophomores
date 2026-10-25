'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import { cn } from 'cn';
import { FieldCanvas } from './FieldCanvas';
import { DEFAULT_MASK_URL } from '../field/parameters';

export { DEFAULT_FOOTER_CONFIG, resolveFooterConfig } from '../footer-config';

export interface FlameFooterBackdropProps {
  /** PNG/SVG alpha controls coverage. Replacing the source does not reset motion. */
  readonly maskSource?: string;
  readonly paused?: boolean;
  readonly visible?: boolean;
  /** Bottom-anchored presentation scale; does not alter the saved mask or active clock. */
  readonly verticalStretch?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/** The approved transparent field with footer-only ignition; editor and hero stay unchanged. */
export function FlameFooterBackdrop({ maskSource = DEFAULT_MASK_URL, paused = false, visible = true,
  verticalStretch = 1, className, style }: FlameFooterBackdropProps) {
  const [failure, setFailure] = useState('');
  const [maskFailure, setMaskFailure] = useState('');
  const reportFailure = useCallback((message: string) => {
    console.error('Footer field unavailable:', message);
    setFailure(message);
  }, []);
  const reportMaskFailure = useCallback((message: string) => {
    console.error('Footer mask unavailable:', message);
    setMaskFailure(message);
  }, []);
  const maskReady = useCallback(() => setMaskFailure(''), []);
  return <div data-flame-backdrop data-flame-field data-field-error={failure || maskFailure || undefined}
    aria-hidden="true" className={cn('pointer-events-none relative h-full w-full', className)} style={style}>
    <FieldCanvas ignition maskSource={maskSource} paused={paused} visible={visible} verticalStretch={verticalStretch}
      onFailure={reportFailure} onMaskFailure={reportMaskFailure} onMaskReady={maskReady} />
  </div>;
}

export default FlameFooterBackdrop;
