"use client";

import { animate } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Hideaway menu frame. Closed bars sit just outside the window.
 * Opening slides them in over 1.2s with power4.inOut. Closing uses power3.inOut.
 * The first pose snaps, the same way the original skips its mount pass.
 */
const TOP_LEFT = "M270 0H0v270C14.03 87.66 84.16 17.53 270 0";
const TOP_RIGHT = "M270 270V0H0c182.34 14.03 252.47 84.16 270 270";
const BOTTOM_RIGHT = "M0 270h270V0C255.97 182.34 185.84 252.47 0 270";
const BOTTOM_LEFT = "M0 0v270h270C87.66 255.97 17.53 185.84 0 0";

const OPEN_EASE = [0.76, 0, 0.24, 1] as const;
const CLOSE_EASE = [0.77, 0, 0.175, 1] as const;
const INSET = { top: 10, right: 10, bottom: 30, left: 10 };

function Stone({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 270 270" className="site-menu-corner-svg" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function MenuFrame({
  open,
  onWindowClick,
  children
}: {
  open: boolean;
  onWindowClick?: () => void;
  children?: ReactNode;
}) {
  const windowRef = useRef<HTMLDivElement>(null);
  const frames = useRef<Array<HTMLDivElement | null>>([]);
  const corners = useRef<Array<HTMLDivElement | null>>([]);
  const stones = useRef<Array<HTMLDivElement | null>>([]);
  const posed = useRef(false);

  useEffect(() => {
    const hole = windowRef.current;
    if (!hole) return;
    const box = hole.getBoundingClientRect();
    const duration = posed.current ? 1.2 : 0;
    posed.current = true;
    const ease = open ? OPEN_EASE : CLOSE_EASE;
    const mobile = window.innerWidth < 967;
    const windowHeight = hole.offsetHeight;
    const below = -(window.innerHeight - (windowHeight + box.top)) + 1;

    frames.current.forEach((frame, index) => {
      if (!frame) return;
      let x = 0;
      let y = 0;
      if (!open) {
        const width = frame.offsetWidth;
        const height = frame.offsetHeight;
        if (index === 0) y = -height + INSET.top;
        if (index === 1) x = mobile ? INSET.right - 3 : width - INSET.right;
        if (index === 2) y = mobile ? height - 20 : height - INSET.bottom;
        if (index === 3) x = mobile ? -INSET.left + 3 : -width + INSET.left;
      }
      animate(frame, { x, y, opacity: 1 }, { duration, ease });
    });

    corners.current.forEach((corner, index) => {
      if (!corner) return;
      let x = INSET.left;
      let y = INSET.top;
      if (open) {
        const yOpen = index > 1 ? (mobile ? below : -box.top) : box.top;
        x = index === 1 || index === 2 ? -box.left : box.left;
        y = yOpen;
      } else if (index === 1) {
        x = -INSET.right;
        y = INSET.top;
      } else if (index === 2) {
        x = -INSET.right;
        y = -INSET.bottom;
      } else if (index === 3) {
        x = INSET.left;
        y = -INSET.bottom;
      }
      animate(corner, { x, y }, { duration, ease });
    });

    stones.current.forEach((stone) => {
      if (!stone) return;
      animate(stone, { scale: open ? 1 : 0 }, { duration, ease });
    });
  }, [open]);

  return (
    <>
      <div className="site-menu-frame frame-top" ref={(element) => { frames.current[0] = element; }} />
      <div className="site-menu-frame frame-right" ref={(element) => { frames.current[1] = element; }} />
      <div className="site-menu-frame frame-bottom" ref={(element) => { frames.current[2] = element; }} />
      <div className="site-menu-frame frame-left" ref={(element) => { frames.current[3] = element; }} />
      <div className="site-menu-corner corner-topleft" ref={(element) => { corners.current[0] = element; }}>
        <div className="site-menu-corner-stone" ref={(element) => { stones.current[0] = element; }}>
          <Stone path={TOP_LEFT} />
        </div>
      </div>
      <div className="site-menu-corner corner-topright" ref={(element) => { corners.current[1] = element; }}>
        <div className="site-menu-corner-stone" ref={(element) => { stones.current[1] = element; }}>
          <Stone path={TOP_RIGHT} />
        </div>
      </div>
      <div className="site-menu-corner corner-bottomright" ref={(element) => { corners.current[2] = element; }}>
        <div className="site-menu-corner-stone" ref={(element) => { stones.current[2] = element; }}>
          <Stone path={BOTTOM_RIGHT} />
        </div>
      </div>
      <div className="site-menu-corner corner-bottomleft" ref={(element) => { corners.current[3] = element; }}>
        <div className="site-menu-corner-stone" ref={(element) => { stones.current[3] = element; }}>
          <Stone path={BOTTOM_LEFT} />
        </div>
      </div>
      <div ref={windowRef} id="navWindow" className="site-menu-window" onClick={onWindowClick}>
        {children}
      </div>
    </>
  );
}
