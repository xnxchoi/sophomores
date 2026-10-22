"use client";

import { useEffect, useRef, useState } from 'react';
import { createHistoricalRenderer } from './historical-renderer';
import { type HistoricalVariant } from './historical-shaders';
export { referenceConfig } from './historical-shaders';

export function FlameReference() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const session = useRef<ReturnType<typeof createHistoricalRenderer> | null>(null);
  const [variant, setVariant] = useState<HistoricalVariant>('stronger');
  const [paused, setPaused] = useState(false);
  const [showText, setShowText] = useState(true);
  const [failure, setFailure] = useState('');
  const playbackOptions = useRef({ variant, paused });

  useEffect(() => {
    if (!canvas.current) return;
    let disposed = false;
    const onFailure = (message: string) => queueMicrotask(() => {
      if (!disposed) setFailure(message);
    });
    try {
      session.current = createHistoricalRenderer(canvas.current, onFailure, playbackOptions.current);
    } catch (error) {
      console.error('Historical flame reference initialization failed', error);
      canvas.current.dataset.renderStatus = 'error';
      onFailure('This browser could not start the historical flame reference.');
    }
    return () => {
      disposed = true;
      session.current?.destroy();
      session.current = null;
    };
  }, []);

  return (
    <main className="relative min-h-svh bg-black text-white">
      <canvas ref={canvas} aria-hidden="true" data-render-status="loading" className="fixed inset-0 block h-full w-full" />
      <header className="fixed inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-3 p-5 text-xs text-white/70 sm:p-8">
        <div><h1>Recovered flame references</h1><p className="mt-1 text-white/50">B is the selected baseline. Breathing is an optional variation, not a recovered snapshot.</p></div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label className="flex items-center gap-2">Snapshot
            <select aria-label="Historical snapshot" value={variant} className="min-h-11 rounded border border-white/25 bg-black px-2 text-white focus-visible:outline-2 focus-visible:outline-offset-4" onChange={event => {
              const next = event.target.value as HistoricalVariant;
              playbackOptions.current = { ...playbackOptions.current, variant: next };
              session.current?.setVariant(next);
              setVariant(next);
            }}>
              <option value="initial">A — Original gas · 01:46</option>
              <option value="stronger">B — Increased emission · 01:50</option>
              <option value="breathing">B + A↔B breathing (24s)</option>
            </select>
          </label>
          <button type="button" className="min-h-11 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4" onClick={() => {
            playbackOptions.current = { ...playbackOptions.current, paused: !paused };
            session.current?.setPaused(!paused);
            setPaused(!paused);
          }}>{paused ? 'Play' : 'Pause'}</button>
          <button type="button" className="min-h-11 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
            onClick={() => setShowText(value => !value)}>{showText ? 'Hide text' : 'Show text'}</button>
        </div>
      </header>
      {showText && <div className="pointer-events-none relative z-10 px-6 pt-[30svh] sm:px-12">
        <p className="max-w-2xl font-serif text-4xl leading-tight sm:text-6xl">For Those Who Have Been Somewhere. And Still Wonder What Else Is Out There.</p>
      </div>}
      {failure && <p role="alert" className="fixed inset-x-5 bottom-5 z-20 text-center text-sm">{failure}</p>}
    </main>
  );
}
