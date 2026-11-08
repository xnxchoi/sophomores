"use client";

import { useEffect, useRef } from "react";
import { siteLayer } from "@/components/gl/layers";
import { spawnConfetti, stepConfetti } from "@/lib/content/confetti";

/** One burst. The portrait focus and the Lenis lock stay in Hideaway. */
export function CreditConfetti({ burst }: { burst: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (burst === 0) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    let pieces = spawnConfetti(width, height);
    let frame = 0;
    const draw = () => {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      pieces = stepConfetti(pieces, height);
      for (const piece of pieces) {
        const flip = Math.cos(piece.y * 0.1);
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.rotation);
        context.fillStyle = flip > 0 ? piece.front : piece.back;
        context.fillRect((-piece.w * flip) / 2, -piece.h / 2, piece.w * Math.abs(flip), piece.h);
        context.restore();
      }
      if (pieces.length > 0) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [burst]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: siteLayer.canvas }}
    />
  );
}
