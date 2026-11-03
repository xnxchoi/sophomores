"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type RefObject } from "react";
import { reelPack } from "@/lib/content/transport";

const SPOKES = 3;
const TURN_SECONDS = 8;
const LEFT = { x: 80, y: 70 };
const RIGHT = { x: 240, y: 70 };
const FLANGE = 38;
const HUB = 8;

function spokePath(center: { x: number; y: number }, index: number) {
  const angle = (index / SPOKES) * Math.PI * 2 - Math.PI / 2;
  const inner = FLANGE * 0.45;
  return `M ${center.x + Math.cos(angle) * inner} ${center.y + Math.sin(angle) * inner} L ${center.x + Math.cos(angle) * FLANGE} ${center.y + Math.sin(angle) * FLANGE}`;
}

function Reel({
  center,
  pack,
  reelRef
}: {
  center: { x: number; y: number };
  pack: number;
  reelRef: RefObject<SVGGElement | null>;
}) {
  return (
    <g ref={reelRef} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
      <circle cx={center.x} cy={center.y} r={FLANGE} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <circle cx={center.x} cy={center.y} r={pack} fill="none" stroke="currentColor" strokeWidth={Math.max(1, (pack - HUB) * 2)} opacity="0.35" />
      <circle cx={center.x} cy={center.y} r={HUB} fill="none" stroke="currentColor" strokeWidth="1.5" />
      {Array.from({ length: SPOKES }, (_, index) => (
        <path key={index} d={spokePath(center, index)} stroke="currentColor" strokeWidth="1" opacity="0.7" />
      ))}
    </g>
  );
}

/** Dual SVG reels. The 3D tape model stays in Hideaway. */
export function TapeReels({ playing, progress }: { playing: boolean; progress: number }) {
  const scope = useRef<SVGSVGElement>(null);
  const supply = useRef<SVGGElement>(null);
  const takeup = useRef<SVGGElement>(null);
  const supplyTL = useRef<gsap.core.Timeline | null>(null);
  const takeupTL = useRef<gsap.core.Timeline | null>(null);
  const pack = reelPack(progress);

  useGSAP(
    () => {
      if (!supply.current || !takeup.current) return;
      supplyTL.current = gsap.timeline({ repeat: -1 }).to(supply.current, {
        rotate: -360,
        duration: TURN_SECONDS,
        ease: "none",
        transformOrigin: "center"
      });
      takeupTL.current = gsap.timeline({ repeat: -1 }).to(takeup.current, {
        rotate: 360,
        duration: TURN_SECONDS,
        ease: "none",
        transformOrigin: "center"
      });
      supplyTL.current.timeScale(0);
      takeupTL.current.timeScale(0);
    },
    { scope }
  );

  useGSAP(
    () => {
      const speed = playing ? 1 : 0;
      const ease = playing ? "power2.in" : "power2.out";
      if (supplyTL.current) gsap.to(supplyTL.current, { timeScale: speed, duration: 0.3, ease, overwrite: true });
      if (takeupTL.current) gsap.to(takeupTL.current, { timeScale: speed, duration: 0.3, ease, overwrite: true });
    },
    { dependencies: [playing], scope }
  );

  return (
    <svg ref={scope} viewBox="0 0 320 140" className="w-full text-foreground" aria-hidden="true">
      <path d={`M ${LEFT.x + HUB} ${LEFT.y - 6} L ${RIGHT.x - HUB} ${RIGHT.y - 6}`} stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <path d={`M ${LEFT.x + HUB} ${LEFT.y + 6} L ${RIGHT.x - HUB} ${RIGHT.y + 6}`} stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx={LEFT.x + FLANGE + 8} cy={LEFT.y} r="2" fill="currentColor" opacity="0.7" />
      <circle cx={RIGHT.x - FLANGE - 8} cy={RIGHT.y} r="2" fill="currentColor" opacity="0.7" />
      <Reel center={LEFT} pack={pack.supply} reelRef={supply} />
      <Reel center={RIGHT} pack={pack.takeup} reelRef={takeup} />
    </svg>
  );
}
