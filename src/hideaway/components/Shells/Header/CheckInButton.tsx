"use client";
import { MotionLink } from "@/hideaway/components/core/Link/Link";
import { cn } from "@/lib/utils";
import { useRPStore } from "@/hideaway/providers/RP_Pro";
import { HTMLMotionProps } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import * as m from "motion/react-m";
const ARC_PATHS = [
  "M6.23454 19.3052C6.42429 18.8483 6.59884 18.3835 6.75758 17.9114",
  "M14.4235 21.0018C14.6981 20.2273 14.9417 19.4381 15.1528 18.6357C15.3443 17.9077 15.5091 17.1689 15.646 16.4204",
  "M19.6893 17.2526C20.0652 15.2266 20.2617 13.1377 20.2617 11.0028C20.2617 6.44492 16.5668 2.75 12.0089 2.75C10.7138 2.75 9.48836 3.04832 8.39758 3.57999",
  "M3.26172 15.1545C3.58481 13.8235 3.75605 12.4332 3.75605 11.0028C3.75605 9.20753 4.32931 7.54611 5.30276 6.19165",
  "M12.0093 11.0028C12.0093 13.8505 11.5478 16.5903 10.6955 19.1517C10.4762 19.8107 10.231 20.458 9.9611 21.0922",
  "M7.67682 14C7.8124 13.0204 7.88247 12.0198 7.88247 11.0028C7.88247 8.72388 9.72993 6.87642 12.0089 6.87642C14.2878 6.87642 16.1353 8.72388 16.1353 11.0028C16.1353 11.5049 16.1229 12.004 16.0985 12.5"
] as const;

// stagger order — drives the scanning wave across the fingerprint
const STAGGER_ORDER = [5, 4, 0, 1, 3, 2] as const;
const CYCLE_MS = 1600;
const STAGGER_MS = 120;

export const CheckInButton = ({
  className,
  ...rest
}: Omit<HTMLMotionProps<"a">, "children">) => {
  const [isCheckInPage, setIsCheckInPage] = useState(false);
  const pathName = usePathname();

  useEffect(() => {
    setIsCheckInPage(
      pathName.includes("check-in") || pathName.includes("sign-in")
    );
  }, [pathName]);

  const navIsOpen = useRPStore(useShallow((r) => r.navIsOpen));
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const paths = Array.from(
      svg.querySelectorAll<SVGPathElement>("[data-arc]")
    );
    const lengths = paths.map((el) => el.getTotalLength());
    paths.forEach((el, i) => {
      el.style.strokeDasharray = `${lengths[i]}`;
      el.style.strokeDashoffset = "0";
    });

    const btn = svg.closest("a");
    if (!btn) return;

    let running: Animation[] = [];

    const scan = () => {
      running.forEach((a) => a.cancel());
      running = [];

      STAGGER_ORDER.forEach((arcIdx, i) => {
        const el = paths[arcIdx];
        const len = lengths[arcIdx];
        if (!el) return;
        const anim = el.animate(
          [
            { strokeDashoffset: 0, offset: 0 },
            { strokeDashoffset: len, offset: 0.4 },
            { strokeDashoffset: len, offset: 0.6 },
            { strokeDashoffset: 0, offset: 1 }
          ],
          {
            duration: CYCLE_MS,
            delay: i * STAGGER_MS,
            iterations: 1,
            fill: "forwards",
            easing: "ease-in-out"
          }
        );
        running.push(anim);
      });
    };

    const reset = () => {
      running.forEach((a) => a.cancel());
      running = [];
      paths.forEach((el) => {
        el.animate(
          [
            { strokeDashoffset: getComputedStyle(el).strokeDashoffset },
            { strokeDashoffset: 0 }
          ],
          { duration: 250, easing: "ease-out", fill: "forwards" }
        );
      });
    };

    // Hover-capable pointer (mouse, pen): scan on enter, reset on leave.
    // Coarse pointer (touch): no hover state, so play the scan once on mount —
    // discovered, not advertised. Tapping navigates before a second cycle would matter.
    const hoverCapable =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover)").matches;

    if (hoverCapable) {
      btn.addEventListener("pointerenter", scan);
      btn.addEventListener("pointerleave", reset);
    } else {
      scan();
    }

    return () => {
      running.forEach((a) => a.cancel());
      if (hoverCapable) {
        btn.removeEventListener("pointerenter", scan);
        btn.removeEventListener("pointerleave", reset);
      }
    };
  }, []);

  return (
    !isCheckInPage && (
      <MotionLink
        id="checker"
        aria-label="Check-In"
        key="checker"
        className={cn(
          "group relative inline-flex min-h-[40px] touch-manipulation items-center justify-center",
          "max-sm:size-[40px] max-sm:rounded-full sm:gap-2",
          "hover:border-current hover:bg-transparent",
          navIsOpen && "border-current!",
          navIsOpen && "fg-nav-foreground",
          className
        )}
        href="/sign-in"
        {...rest}
        //deliberate; parent styling currently messes up the styles
        style={{}}
      >
        <svg
          ref={svgRef}
          width={18}
          height={18}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {ARC_PATHS.map((d, i) => (
            <m.path
              key={`a-${i}`}
              data-arc={i}
              d={d}
              strokeWidth="1.5"
              className="fill-none stroke-current"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        <span
          className={cn(
            "max-sm:sr-only sm:mr-5",
            navIsOpen ? "fg-nav-foreground" : "fg-foreground"
          )}
        >
          Check In
        </span>
      </MotionLink>
    )
  );
};
