/* eslint-disable react-hooks/refs */
"use client";

// Cauterization: search is out of pass 1. Hideaway: createSearchBarStore from @/stores/CMDK/SearchStore.
import { createCursorStore, HA_CURS } from "@/stores/Cursor/CursorStore";
import {
  createDeviceStore,
  DeviceStore
} from "@/stores/Device/DeviceStore";
import { detectDevice, readClientDeviceEnv } from "@/stores/Device/detectDevice";
import {
  createMenuStructure,
  FrameSide,
  RP_BluePrint
} from "@/stores/Frame_Ctrl";

import { createHAStore, HA_VAULT } from "@/stores/RP_Ui";

import { createId } from "@paralleldrive/cuid2";
import { getThumbmark } from "@thumbmarkjs/thumbmarkjs";

import { MotionValue, useMotionValue, useTransform } from "motion/react";
import { useTransitionState } from "next-transition-router";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef
} from "react";

import { useStore } from "zustand";
import { shallow, useShallow } from "zustand/shallow";
import { useStoreWithEqualityFn } from "zustand/traditional";

export type HAAPI = ReturnType<typeof createHAStore>;
export type HACPI = ReturnType<typeof createCursorStore>;
export type DeviceAPI = ReturnType<typeof createDeviceStore>;

export const DeviceContext = createContext<DeviceAPI | undefined>(undefined);
export const HAStoreContext = createContext<HAAPI | undefined>(undefined);
export const CurContext = createContext<HACPI | undefined>(undefined);

export interface DeviceProviderProps {
  children: ReactNode;
}

export interface HAStoreProviderProps {
  children: ReactNode;
}

export interface CurProviderProps {
  children: ReactNode;
}

const IntDeviceProvider = ({ children }: DeviceProviderProps) => {
  const storeRef = useRef<DeviceAPI>(null!);
  if (!storeRef.current) {
    storeRef.current = createDeviceStore();
  }
  useEffect(() => {
    storeRef.current
      .getState()
      .hydrateDevice(detectDevice(readClientDeviceEnv()));
  }, []);
  return (
    <DeviceContext.Provider value={storeRef.current}>
      {children}
    </DeviceContext.Provider>
  );
};
const Thumbprint = ({ children }: { children: ReactNode }) => {
  const setFingerprint = useDeviceInfo((r) => r.setFingerPrint);
  useEffect(() => {
    const thumbmark = getThumbmark();
    thumbmark
      .then((res) => {
        setFingerprint(res.thumbmark);
      })
      .catch(() => {
        /**flimsy fallback to account for errors; this is done out of necessity as
         **/
        setFingerprint(createId());
      });
  }, [setFingerprint]);
  return <>{children}</>;
};
export const DeviceProvider = ({ children }: DeviceProviderProps) => {
  return (
    <IntDeviceProvider>
      <Thumbprint>{children}</Thumbprint>
    </IntDeviceProvider>
  );
};

export const HAStoreProvider = ({ children }: HAStoreProviderProps) => {
  const storeRef = useRef<HAAPI>(null!);
  if (!storeRef.current) {
    storeRef.current = createHAStore();
  }

  return (
    <HAStoreContext.Provider value={storeRef.current}>
      {children}
    </HAStoreContext.Provider>
  );
};
export const CursorProvider = ({ children }: CurProviderProps) => {
  const sRef = useRef<HACPI>(null!);
  if (!sRef.current) {
    sRef.current = createCursorStore();
  }
  return (
    <CurContext value={sRef.current}>{children}</CurContext>
  );
};

export const useCursor = <T,>(selector: (store: HA_CURS) => T): T => {
  const haStoreContext = useContext(CurContext);
  if (!haStoreContext) {
    throw new Error(`useCursorStore must be used within CurStoreProvider`);
  }
  return useStoreWithEqualityFn(haStoreContext, selector, shallow);
};
export const useRPStore = <T,>(selector: (store: HA_VAULT) => T): T => {
  const haStoreContext = useContext(HAStoreContext);
  if (!haStoreContext) {
    throw new Error("useRPStore must be used within RPStoreProvider");
  }
  return useStore(haStoreContext, selector);
};
// Cauterization: SearchBarProvider and useSearchBar stay out with the search store.
// Same cut as the commented import above.
export const useDeviceInfo = <T,>(selector: (store: DeviceStore) => T) => {
  const deviceContext = useContext(DeviceContext);
  if (!deviceContext) {
    throw new Error("getDeviceInfo must be used within a DeviceProvider");
  }
  return useStore(deviceContext, selector);
};
type MenuAPI = ReturnType<typeof createMenuStructure>;
type FramerAPI = {
  [x in FrameSide]: MotionValue<number>;
} & {
  navState: MotionValue<boolean>;
  activeKey: MotionValue<string | -1>;
  setActiveKey: (key: string | null | -1) => void;
  focusedKey: MotionValue<string | -1>;
  setFocusedKey: (key: string | null | -1) => void;
  /**
   * Viewport dimensions as motion values, kept in lockstep with the
   * frame store's `viewport`. Fine-grained subscribers (canvas-like
   * components, GSAP timelines) can subscribe without re-rendering on
   * every viewport change.
   */
  viewportWidth: MotionValue<number>;
  viewportHeight: MotionValue<number>;
};
const FrameContext = createContext<FramerAPI | undefined>(undefined);
const MenuContext = createContext<MenuAPI | undefined>(undefined);
export const MenuProvider = ({ children }: { children: ReactNode }) => {
  const bleuContext = useRef<MenuAPI>(undefined);
  // eslint-disable-next-line react-hooks/refs
  if (!bleuContext.current) {
    bleuContext.current = createMenuStructure();
  }

  return (
    <MenuContext value={bleuContext.current}>
      <AMG>{children}</AMG>
    </MenuContext>
  );
};
export const useMenu = <T,>(selector: (store: RP_BluePrint) => T): T => {
  const store = useContext(MenuContext);
  if (!store) {
    throw new Error("useMenu must be used within a MenuProvider");
  }
  return useStore(store, selector);
};
export const useFrameState = () => {
  const store = useContext(FrameContext);
  if (!store)
    throw new Error("useFrameState must be used within a MenuProvider");
  return store;
};
export const useFrameFactor = <T,>(selector: (store: FramerAPI) => T) => {
  const store = useContext(FrameContext);
  if (!store)
    throw new Error("useFrameState must be used within a MenuProvider");
  return selector(store);
};
const AMG = ({ children }: { children: ReactNode }) => {
  const { stage } = useTransitionState();
  const navIsOpen = useRPStore(useShallow((r) => r.navIsOpen));
  const navState = useMotionValue(navIsOpen);

  const activeKey = useMotionValue<string | -1>(-1);
  const setActiveKey = useCallback(
    (key: string | null | -1) => {
      const cur = activeKey.get();
      const to = key || -1;
      cur !== to && activeKey.set(to);
    },
    [activeKey]
  );
  useEffect(() => {
    if (stage === "leaving") {
      activeKey.set(-1);
    }
  }, [stage, activeKey]);
  const focusedKey = useMotionValue<string | -1>(-1);
  const setFocusedKey = useCallback(
    (key: string | null | -1) => {
      const cur = focusedKey.get();
      const to = key || -1;
      cur !== to && focusedKey.set(to);
    },
    [focusedKey]
  );
  const fullscreen = useMenu((l) => l.fullscreen);
  const fsVal = useMotionValue(fullscreen);
  useEffect(() => {
    fsVal.set(fullscreen);
  }, [fullscreen, fsVal]);
  const top = useTransform(() => (fsVal.get() ? 0 : 10) as number);
  const left = useTransform(() => (fsVal.get() ? 0 : 10) as number);
  const bottom = useTransform(() => (fsVal.get() ? 0 : 30) as number);
  const right = useTransform(() => (fsVal.get() ? 0 : 10) as number);

  const syncViewport = useMenu((s) => s.syncViewport);
  const viewportWidth = useMotionValue(0);
  const viewportHeight = useMotionValue(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const apply = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      viewportWidth.set(width);
      viewportHeight.set(height);
      syncViewport({ width, height });
    };
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [syncViewport, viewportHeight, viewportWidth]);

  return (
    <FrameContext
      value={{
        activeKey,
        setActiveKey,
        setFocusedKey,
        focusedKey,
        left,

        top,
        bottom,
        right,
        navState,
        viewportWidth,
        viewportHeight
      }}
    >
      {children}
    </FrameContext>
  );
};
