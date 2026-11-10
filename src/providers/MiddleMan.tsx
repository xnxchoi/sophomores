"use client";
import type { ViewportSizes } from "@/cssVariables";
import { useDeviceInfo, useFrameState, useRPStore } from "@/providers/RP_Pro";
import { useTheme } from "@/providers/Theme";
import {
  defaultTheme,
  getImplicitPreference,
  themeLocalStorageKey
} from "@/providers/Theme/shared";
import { themeIsValid } from "@/providers/Theme/types";
import { applyDocumentTheme } from "@/utilities/applyDocumentTheme";
import canUseDOM from "@/utilities/canUseDOM";
import { getIsMobile } from "@/utilities/getBreakpoints";
import { getViewportSize } from "@/utilities/getViewportSize";
import { storageAvailable } from "@/utilities/isLocalStorageAvailable";
import dynamic from "next/dynamic";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useEffectEvent,
  useState
} from "react";
const RP_Cursor = dynamic(
  () => import("@/components/UX/Cursor").then((m) => m.default),
  {
    ssr: false
  }
);
export const MobileContext = createContext<{
  isMobile: boolean;
  isTouch: boolean;
}>({
  isMobile: false,
  isTouch: false
});

export const MobileProvider = ({ children }: { children: ReactNode }) => {
  const [isTouch, setIsTouch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pointerReady, setPointerReady] = useState(false);
  const MOBILE_BREAKPOINT = 640;
  const setViewportDimensions = useRPStore((r) => r.setViewportDimensions);
  const setViewportSize = useRPStore((r) => r.setViewportSize);
  const [vs, setVs] = useState<ViewportSizes>("lg");
  const setSnapPoints = useRPStore((r) => r.setSnapPoints);
  const { left, bottom } = useFrameState();

  const onResize = useEffectEvent(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    setViewportDimensions({ width, height });
    setVs(getViewportSize(width));
    setIsMobile(width < MOBILE_BREAKPOINT);

    const v = getIsMobile(width)
      ? height * 0.35 + bottom.get()
      : width * 0.76 + left.get();
    setSnapPoints([`${v}px`, 1]);
  });

  useEffect(() => {
    window.addEventListener("resize", onResize);
    onResize();
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    setViewportSize(vs);
  }, [setViewportSize, vs]);

  useEffect(() => {
    const touchQ = window.matchMedia("(hover:none)");
    setIsTouch(touchQ.matches);
    setPointerReady(true);
    const onTouchChange = () => {
      setIsTouch(touchQ.matches);
    };
    touchQ.addEventListener("change", onTouchChange);
    return () => {
      touchQ.removeEventListener("change", onTouchChange);
    };
  }, []);

  // iOS Safari ignores `maximum-scale=1` for accessibility, so the viewport
  // meta alone does not stop pinch-zoom or double-tap-zoom. Block them
  // explicitly at the document level on touch surfaces. Desktop is left
  // alone (browser zoom is a legitimate user need there).
  useEffect(() => {
    if (!isTouch) return;
    const preventGesture = (e: Event) => e.preventDefault();
    // `gesture*` events are Safari-only; harmless no-op listeners elsewhere.
    document.addEventListener("gesturestart", preventGesture, {
      passive: false
    });
    document.addEventListener("gesturechange", preventGesture, {
      passive: false
    });
    document.addEventListener("gestureend", preventGesture, {
      passive: false
    });

    // Double-tap-to-zoom is handled by `touch-action: manipulation` on
    // `html` in globals.css — adding a JS `touchend` swallow on top
    // breaks legitimate fast taps (form-input refocus, repeated button
    // taps), so we deliberately keep this to gesture-events only.

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
    };
  }, [isTouch]);

  return (
    <MobileContext value={{ isTouch, isMobile }}>
      {pointerReady && !isTouch && <RP_Cursor />}
      {children}
    </MobileContext>
  );
};
export const useIsMobile = () => {
  const mobileCtx = useContext(MobileContext);
  if (!mobileCtx) {
    throw new Error("useIsMobile must be used within a MobileProvider");
  }
  return mobileCtx;
};
export const MiddleMan = ({ children }: { children: ReactNode }) => {
  const localStorageEnabled = useDeviceInfo((r) => r.localStorage),
    setLocalStorageEnabled = useDeviceInfo((r) => r.setStorageAvailable);
  const locked = useTheme((r) => r.locked);
  const setTheme = useTheme((store) => store.setTheme);
  const saveTheme = useTheme((r) => r.saveTheme);
  const pageTheme = useTheme((store) => store.pageTheme);
  const savedTheme = useTheme((store) => store.savedTheme);
  const theme = useTheme((store) => store.theme);

  useEffect(() => {
    if (canUseDOM) {
      const s = storageAvailable("localStorage");
      setLocalStorageEnabled(s);
      let implicitPreference = getImplicitPreference() ?? defaultTheme;
      if (s) {
        const k = window.localStorage.getItem(themeLocalStorageKey);
        if (themeIsValid(k)) {
          implicitPreference = k;
        }
      }
      saveTheme(implicitPreference);
    }
  }, [saveTheme, setLocalStorageEnabled]);
  useEffect(() => {
    applyDocumentTheme(document.documentElement, theme, {
      armTransitions: false
    });
  }, [theme]);
  useEffect(() => {
    setTheme(locked ? pageTheme || defaultTheme : savedTheme || defaultTheme);
  }, [pageTheme, savedTheme, locked, setTheme]);
  useEffect(() => {
    if (localStorageEnabled) {
      if (savedTheme) {
        window.localStorage.setItem(themeLocalStorageKey, savedTheme);
      } else {
        window.localStorage.removeItem(themeLocalStorageKey);
      }
    }
  }, [localStorageEnabled, savedTheme]);

  return <MobileProvider>{children}</MobileProvider>;
};
