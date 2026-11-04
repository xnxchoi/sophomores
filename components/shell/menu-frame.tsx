"use client";

import { animate } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Hideaway menu frame. Bars and corner stones move to the window
 * over 1.2s. Opening uses power4.inOut. Closing uses power3.inOut.
 */
const TOP_LEFT = "M270 0H0v270C14.03 87.66 84.16 17.53 270 0";
const TOP_RIGHT = "M270 270V0H0c182.34 14.03 252.47 84.16 270 270";
const BOTTOM_RIGHT = "M0 270h270V0C255.97 182.34 185.84 252.47 0 270";
const BOTTOM_LEFT = "M0 0v270h270C87.66 255.97 17.53 185.84 0 0";

const OPEN_EASE = [0.76, 0, 0.24, 1] as const;
const CLOSE_EASE = [0.77, 0, 0.175, 1] as const;

function Stone({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 270 270" className="site-menu-corner-svg" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function MenuFrame({ open, children }: { open: boolean; children?: ReactNode }) {
  const windowRef = useRef<HTMLDivElement>(null);
  const frames = useRef<Array<HTMLDivElement | null>>([]);
  const corners = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const hole = windowRef.current;
    if (!hole) return;
    const box = hole.getBoundingClientRect();
    const duration = 1.2;
    const ease = open ? OPEN_EASE : CLOSE_EASE;
    frames.current.forEach((frame, index) => {
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      const offX = index === 1 ? rect.width || frame.offsetWidth : index === 3 ? -(rect.width || frame.offsetWidth) : 0;
      const offY = index === 0 ? -(rect.height || 80) : index === 2 ? rect.height || 80 : 0;
      animate(frame, open ? { x: [offX, 0], y: [offY, 0], opacity: 1 } : { x: offX, y: offY, opacity: 1 }, { duration, ease });
    });
    corners.current.forEach((corner, index) => {
      if (!corner) return;
      const x = open ? (index === 1 || index === 2 ? -box.left : box.left) : 0;
      const y = open ? (index === 2 || index === 3 ? -box.top : box.top) : 0;
      animate(corner, { x, y, opacity: open ? 1 : 0 }, { duration: open ? 0.4 : duration, ease: open ? "easeInOut" : ease });
    });
  }, [open]);

  return (
    <>
      <div className="site-menu-frame frame-top" ref={(element) => { frames.current[0] = element; }} />
      <div className="site-menu-frame frame-right" ref={(element) => { frames.current[1] = element; }} />
      <div className="site-menu-frame frame-bottom" ref={(element) => { frames.current[2] = element; }} />
      <div className="site-menu-frame frame-left" ref={(element) => { frames.current[3] = element; }} />
      <div className="site-menu-corner corner-topleft" ref={(element) => { corners.current[0] = element; }}>
        <Stone path={TOP_LEFT} />
      </div>
      <div className="site-menu-corner corner-topright" ref={(element) => { corners.current[1] = element; }}>
        <Stone path={TOP_RIGHT} />
      </div>
      <div className="site-menu-corner corner-bottomright" ref={(element) => { corners.current[2] = element; }}>
        <Stone path={BOTTOM_RIGHT} />
      </div>
      <div className="site-menu-corner corner-bottomleft" ref={(element) => { corners.current[3] = element; }}>
        <Stone path={BOTTOM_LEFT} />
      </div>
      <div ref={windowRef} className="site-menu-window">
        {children}
      </div>
    </>
  );
}
