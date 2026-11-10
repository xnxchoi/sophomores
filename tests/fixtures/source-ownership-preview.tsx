// Synthetic local acceptance harness, not customer copy or provider acceptance.
import { Suspense, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { domAnimation, LazyMotion } from "motion/react";
import { SharedCanvas } from "@/components/gl/shared-canvas";
import { useCanvasFrameloopStore } from "@/components/gl/canvas-frameloop";
import { MenuGradient } from "@/components/shell/menu-gradient";
import { TickerCrown } from "@/components/shell/ticker/TickerCrown";
import { ProgressRail } from "@/components/radio/progress-rail";
import { TickDial } from "@/components/ui/tick-indicator/TickDial";

function Preview() {
  const eventSource = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(true);
  const [gradient, setGradient] = useState(true);
  const [ticker, setTicker] = useState(true);
  const [progress, setProgress] = useState(0.25);
  const claims = useCanvasFrameloopStore((state) => state.activeClaims);
  return (
    <LazyMotion features={domAnimation}>
      {/* The production radio supplies its navigation foreground token. */}
      <div ref={eventSource} className="min-h-screen bg-background p-6 text-foreground [--n-s-fg:var(--foreground)]">
        <SharedCanvas eventSource={eventSource} />
        <main className="relative z-10 mx-auto flex max-w-3xl flex-col gap-8">
          <section className="relative z-50 flex flex-wrap items-center gap-3 rounded-xl border bg-background p-4">
            <h1 className="w-full text-lg">Synthetic Batch7c graphics fixture</h1>
            <button className="min-h-12 rounded border px-4" onClick={() => setMounted((value) => !value)}>Synthetic mount: {mounted ? "on" : "off"}</button>
            <button className="min-h-12 rounded border px-4" onClick={() => setGradient((value) => !value)}>Synthetic gradient: {gradient ? "on" : "off"}</button>
            <button className="min-h-12 rounded border px-4" onClick={() => setTicker((value) => !value)}>Synthetic ticker: {ticker ? "on" : "off"}</button>
            <button className="min-h-12 rounded border px-4" onClick={() => setProgress(0.25)}>Synthetic progress 25%</button>
            <button className="min-h-12 rounded border px-4" onClick={() => setProgress(0.75)}>Synthetic progress 75%</button>
            <output className="w-full" data-active-claims={claims}>Actual active claims: {claims}</output>
          </section>
          <section className="relative h-64 overflow-hidden rounded-xl border" aria-label="Synthetic menu gradient viewport">
            {mounted && gradient ? <Suspense fallback={<p>Loading local texture</p>}><MenuGradient /></Suspense> : null}
          </section>
          <section className="relative z-10 flex min-h-24 items-center rounded-xl border p-6" aria-label="Synthetic ticker viewport">
            {mounted && ticker ? <TickerCrown /> : null}
          </section>
          <section className="relative z-10 flex flex-col items-center gap-6 rounded-xl border bg-background p-6" aria-label="Synthetic progress indicators">
            {mounted ? <><ProgressRail progress={progress} /><TickDial value={progress} aria-label="Synthetic dial progress" /></> : null}
          </section>
        </main>
      </div>
    </LazyMotion>
  );
}

createRoot(document.getElementById("root")!).render(<Preview />);
