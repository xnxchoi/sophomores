"use client";

import { noticeFixtures } from "@/lib/content/fixtures";
import { applyTheme, nextTheme } from "@/lib/content/theme";
import { AccountPanel, NotificationPanel, SearchPanel } from "./header-panels";
import { useSiteMenu } from "@/lib/content/menu";
import { cn } from "@/lib/utils";
import { AnimatePresence, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

const ARC_PATHS = [
  "M6.23454 19.3052C6.42429 18.8483 6.59884 18.3835 6.75758 17.9114",
  "M14.4235 21.0018C14.6981 20.2273 14.9417 19.4381 15.1528 18.6357C15.3443 17.9077 15.5091 17.1689 15.646 16.4204",
  "M19.6893 17.2526C20.0652 15.2266 20.2617 13.1377 20.2617 11.0028C20.2617 6.44492 16.5668 2.75 12.0089 2.75C10.7138 2.75 9.48836 3.04832 8.39758 3.57999",
  "M3.26172 15.1545C3.58481 13.8235 3.75605 12.4332 3.75605 11.0028C3.75605 9.20753 4.32931 7.54611 5.30276 6.19165",
  "M12.0093 11.0028C12.0093 13.8505 11.5478 16.5903 10.6955 19.1517C10.4762 19.8107 10.231 20.458 9.9611 21.0922",
  "M7.67682 14C7.8124 13.0204 7.88247 12.0198 7.88247 11.0028C7.88247 8.72388 9.72993 6.87642 12.0089 6.87642C14.2878 6.87642 16.1353 8.72388 16.1353 11.0028C16.1353 11.5049 16.1229 12.004 16.0985 12.5"
] as const;
const STAGGER_ORDER = [5, 4, 0, 1, 3, 2] as const;

/** Fingerprint scan from the Hideaway check-in control. */
export function CheckInButton() {
  const pathName = usePathname() ?? "";
  const hidden = pathName.includes("check-in") || pathName.includes("sign-in");
  const open = useSiteMenu((state) => state.open);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("[data-arc]"));
    const lengths = paths.map((element) => element.getTotalLength());
    paths.forEach((element, index) => {
      element.style.strokeDasharray = `${lengths[index]}`;
      element.style.strokeDashoffset = "0";
    });
    const button = svg.closest("a");
    if (!button) return;
    let running: Animation[] = [];
    const scan = () => {
      running.forEach((animation) => animation.cancel());
      running = STAGGER_ORDER.flatMap((arcIndex, index) => {
        const element = paths[arcIndex];
        const length = lengths[arcIndex];
        if (!element) return [];
        return [
          element.animate(
            [
              { strokeDashoffset: 0, offset: 0 },
              { strokeDashoffset: length, offset: 0.4 },
              { strokeDashoffset: length, offset: 0.6 },
              { strokeDashoffset: 0, offset: 1 }
            ],
            { duration: 1600, delay: index * 120, iterations: 1, fill: "forwards", easing: "ease-in-out" }
          )
        ];
      });
    };
    const reset = () => {
      running.forEach((animation) => animation.cancel());
      running = [];
      paths.forEach((element) => {
        element.animate(
          [{ strokeDashoffset: getComputedStyle(element).strokeDashoffset }, { strokeDashoffset: 0 }],
          { duration: 250, easing: "ease-out", fill: "forwards" }
        );
      });
    };
    const hoverCapable = window.matchMedia("(hover: hover)").matches;
    if (hoverCapable) {
      button.addEventListener("pointerenter", scan);
      button.addEventListener("pointerleave", reset);
    } else {
      scan();
    }
    return () => {
      running.forEach((animation) => animation.cancel());
      if (hoverCapable) {
        button.removeEventListener("pointerenter", scan);
        button.removeEventListener("pointerleave", reset);
      }
    };
  }, []);

  if (hidden) return null;
  return (
    <Link
      id="checker"
      aria-label="Check-In"
      href="/sign-in"
      className={cn("rp_btn gap-2", open && "border-current")}
    >
      <svg ref={svgRef} width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
        {ARC_PATHS.map((path, index) => (
          <path key={path} data-arc={index} d={path} strokeWidth="1.5" className="fill-none stroke-current" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      <span className="max-sm:sr-only">Check In</span>
    </Link>
  );
}

/** Search pill. Opens the same input row the Hideaway command button opens. */
export function SearchButton() {
  const open = useSiteMenu((state) => state.open);
  const [dialog, setDialog] = useState(false);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog]);

  return (
    <>
      <button
        type="button"
        className={cn("rp_btn gap-x-1", open && "border-current")}
        aria-label="Open search"
        data-state={open}
        onClick={() => setDialog(true)}
      >
        <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">
          <path
            fill="currentColor"
            d="M17.908 14.755c3.918 0 6.092 1.654 6.092 4.745 0 2.755-1.745 4.5-4.5 4.5-3.092 0-4.745-2.173-4.745-6.092v-1.806h-5.51v1.806C9.245 21.826 7.592 24 4.5 24 1.745 24 0 22.255 0 19.5c0-3.092 2.173-4.745 6.092-4.745h1.806v-5.51H6.092C2.173 9.245 0 7.592 0 4.5 0 1.745 1.745 0 4.5 0c3.092 0 4.745 2.173 4.745 6.092v1.806h5.51V6.092C14.755 2.174 16.408 0 19.5 0 22.255 0 24 1.745 24 4.5c0 3.092-2.173 4.745-6.092 4.745h-1.806v5.51zM7.898 7.898V6.092c0-3.215-1.132-4.745-3.398-4.745-2.02 0-3.153 1.133-3.153 3.153 0 2.265 1.531 3.398 4.745 3.398zm0 8.204H6.092c-3.214 0-4.745 1.132-4.745 3.398 0 2.021 1.133 3.153 3.153 3.153 2.265 0 3.398-1.531 3.398-4.745zm1.347-1.347h5.51v-5.51h-5.51zm6.857-6.857h1.806c3.214 0 4.745-1.132 4.745-3.398 0-2.02-1.132-3.153-3.153-3.153-2.265 0-3.398 1.531-3.398 4.745zM22.653 19.5c0-2.265-1.531-3.398-4.745-3.398h-1.806v1.806c0 3.215 1.133 4.745 3.398 4.745 2.02 0 3.153-1.132 3.153-3.153"
          />
        </svg>
        <span className="sr-only">Search</span>
      </button>
      <AnimatePresence>
        {dialog ? <SearchPanel onClose={() => setDialog(false)} /> : null}
      </AnimatePresence>
    </>
  );
}

/** Sun and moon trade places. Same spring the Hideaway toggle uses. */
export function DarkmodeButton() {
  const open = useSiteMenu((state) => state.open);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document === "undefined" ? "dark" : document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
  );
  const themeValue = useMotionValue(theme);
  const darkSource = useTransform(() => (themeValue.get() === "dark" ? 0 : 105));
  const lightSource = useTransform(() => (themeValue.get() === "dark" ? -105 : 0));
  const darkSpring = useSpring(darkSource, { visualDuration: 0.2, stiffness: 320, damping: 42 });
  const lightSpring = useSpring(lightSource, { visualDuration: 0.2, stiffness: 320, damping: 42 });
  const darkY = useMotionTemplate`${darkSpring}%`;
  const lightY = useMotionTemplate`${lightSpring}%`;
  const labelId = useId();

  useEffect(() => {
    themeValue.set(theme);
  }, [theme, themeValue]);

  return (
    <button
      type="button"
      id={labelId}
      className={cn("rp_btn circ-bt", open && "border-current")}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode.`}
      onClick={() => {
        const next = nextTheme(document.documentElement.getAttribute("data-theme"));
        applyTheme(next);
        themeValue.set(next);
        setTheme(next);
      }}
    >
      <m.span className="theme-toggle-icon" style={{ y: lightY }}>
        <svg className="w-[12px]" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M1.39091 9.86727L2.16 10.6364L3.14182 9.66L2.36727 8.88546M6 2.72727C4.19455 2.72727 2.72727 4.19455 2.72727 6C2.72727 7.80545 4.19455 9.27273 6 9.27273C7.80545 9.27273 9.27273 7.80545 9.27273 6C9.27273 4.18909 7.80545 2.72727 6 2.72727ZM10.3636 6.54545H12V5.45455H10.3636M8.85818 9.66L9.84 10.6364L10.6091 9.86727L9.63273 8.88546M10.6091 2.18182L9.84 1.41818L8.85818 2.39455L9.63273 3.16909M6.54545 0H5.45455V1.63636H6.54545M3.14182 2.39455L2.16 1.41818L1.39091 2.18182L2.36727 3.16909L3.14182 2.39455ZM0 6.54545H1.63636V5.45455H0M6.54545 10.3636H5.45455V12H6.54545" fill="currentColor" />
        </svg>
      </m.span>
      <m.span className="theme-toggle-icon" style={{ y: darkY }}>
        <svg className="w-[7px]" viewBox="0 0 7 10" aria-hidden="true">
          <path d="M0.333986 9.71549C2.27597 9.0291 3.66732 7.17703 3.66732 5C3.66732 2.82297 2.27597 0.970903 0.333984 0.284509C0.855283 0.100257 1.41626 0 2.00065 0C4.76207 0 7.00065 2.23858 7.00065 5C7.00065 7.76142 4.76207 10 2.00065 10C1.41626 10 0.855285 9.89974 0.333986 9.71549Z" fill="currentColor" />
        </svg>
      </m.span>
    </button>
  );
}

/** Bell. Count stays in the button. The list opens from the same control. */
export function NotificationButton({ count = 0 }: { count?: number }) {
  const open = useSiteMenu((state) => state.open);
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      type="button"
      className={cn("rp_btn bell-button", open && "border-current")}
      aria-label="Notifications"
      aria-expanded={expanded}
      onClick={() => setExpanded((current) => !current)}
    >
      <span className="text-[12px] tracking-[-0.01em]">{count}</span>
      <svg className="bell-icon" viewBox="0 0 45 45" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="m40.7,34.79c-1.21-1.07-2.26-2.31-3.14-3.66-.96-1.87-1.53-3.92-1.69-6.01v-6.18c.02-6.81-5.04-12.57-11.8-13.44v-1.61c0-.92-.75-1.67-1.67-1.67s-1.67.75-1.67,1.67v1.64c-6.69.93-11.68,6.65-11.66,13.41v6.18c-.16,2.1-.73,4.14-1.69,6.01-.86,1.35-1.9,2.58-3.09,3.66-.27.24-.42.58-.42.94v1.7c0,.69.56,1.25,1.25,1.25h34.75c.69,0,1.25-.56,1.25-1.25v-1.7c0-.36-.16-.7-.43-.94Zm-34.22,1.39c1.16-1.12,2.19-2.38,3.05-3.75,1.21-2.26,1.91-4.75,2.06-7.31v-6.18c-.2-6.03,4.52-11.08,10.55-11.29,6.03-.2,11.08,4.52,11.29,10.55,0,.25,0,.49,0,.74v6.18c.15,2.56.86,5.05,2.06,7.31.86,1.37,1.89,2.63,3.05,3.75H6.48Z" />
        <path d="m22.56,42.85c1.63-.04,2.99-1.24,3.22-2.85h-6.58c.24,1.66,1.68,2.87,3.35,2.85Z" />
      </svg>
      <AnimatePresence>{expanded ? <NotificationPanel onClose={() => setExpanded(false)} /> : null}</AnimatePresence>
    </button>
  );
}

export function AccountButton() {
  const open = useSiteMenu((state) => state.open);
  const [menu, setMenu] = useState(false);
  return (
    <span className="relative">
      <button type="button" className={cn("rp_btn circ-bt", open && "border-current")} aria-label="Account" aria-expanded={menu} onClick={() => setMenu((current) => !current)}>
        <span className="account-mark" aria-hidden="true" />
      </button>
      <AnimatePresence>{menu ? <AccountPanel onClose={() => setMenu(false)} /> : null}</AnimatePresence>
    </span>
  );
}

/** Signed out: Check In, Search, theme. Signed in: bell, account, Search, theme. */
export function HeaderActions() {
  return (
    <div className="header-actions">
      <CheckInButton />
      <NotificationButton count={noticeFixtures.length} />
      <AccountButton />
      <SearchButton />
      <DarkmodeButton />
    </div>
  );
}
