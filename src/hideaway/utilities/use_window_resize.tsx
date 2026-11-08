"use client";
import { useEffect, useRef, useState } from "react";
import { useDeviceInfo } from "@/hideaway/providers/RP_Pro";

export type resizeListenerProps = {
  debounce?: number;
  detectHeightChange?: boolean;
  detectVisibilityChange?: boolean;
};

export const useWindowResize = ({
  debounce = 300,
  detectHeightChange = false,
  detectVisibilityChange = false
}: resizeListenerProps = {}) => {
  const [lastTimestamp, setLastTimestamp] = useState<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const lastWidthRef = useRef<number | null>(null);
  const lastHeightRef = useRef<number | null>(null);

  // Targeted selectors — avoids re-renders from unrelated store changes (e.g. fingerprint updates)
  const isMobile = useDeviceInfo((r) => r.isMobile);
  const isChrome = useDeviceInfo((r) => r.browser.isChrome);
  // Mobile Chrome collapses its address bar on scroll, firing spurious height resize events.
  const suppressHeight = isMobile && isChrome;

  useEffect(() => {
    // Initialize refs on first run (inside effect = safe from SSR)
    lastWidthRef.current ??= window.innerWidth;
    if (detectHeightChange && !suppressHeight) {
      lastHeightRef.current ??= window.innerHeight;
    }

    function handleResize() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        let changed = false;

        if (newWidth !== lastWidthRef.current) {
          lastWidthRef.current = newWidth;
          changed = true;
        }
        if (
          detectHeightChange &&
          !suppressHeight &&
          newHeight !== lastHeightRef.current
        ) {
          lastHeightRef.current = newHeight;
          changed = true;
        }
        if (changed) setLastTimestamp(Date.now());
      }, debounce);
    }

    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [debounce, detectHeightChange, suppressHeight]);

  useEffect(() => {
    if (!detectVisibilityChange) return;
    const handleVisibilityChange = () => {
      setTimeout(() => setLastTimestamp(performance.now()), 50);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [detectVisibilityChange]);

  return lastTimestamp;
};
