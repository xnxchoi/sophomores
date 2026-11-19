"use client";

import React, {
  Context,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef
} from "react";

import { createStore } from "zustand";
import { useStore } from "zustand/index";
import { usePathname } from "next/navigation";
import { deviceTheme, pageThemeFor, readPick, savePick } from "@/lib/content/theme";
import {
  applyDocumentTheme,
  clearThemedTransitions,
  THEME_TRANSITION_SECONDS
} from "@/utilities/applyDocumentTheme";
import type { Theme, ThemeContextType } from "./types";
// Cauterization: useSearchBar is out of pass 1. Hideaway called it here to open search on meta+k.

const initialContext: ThemeContextType = {
  savedTheme: "dark",
  pageTheme: null,
  theme: "dark",
  locked: false
};
export const FALLBACK_THEME: Theme = "dark";
type ThemeActions = {
  saveTheme: (theme: Theme) => void;
  setTheme: (theme: Theme | null) => void; // eslint-disable-line no-unused-vars
  setPageTheme: (theme: Theme | null, lock?: boolean) => void; // eslint-disable-line no-unused-vars
  clearSave: () => void;
  setLocked: (locked: boolean) => void;
  clearPageTheme: () => void;
  toggleTheme: () => void;
  setBaseTheme: () => void;
  setRouteTheme: (theme: Theme | null) => void; // eslint-disable-line no-unused-vars
};
type ThemeStore = ThemeContextType & ThemeActions;
// What the page shows: a theme the page holds (its own, else its route's), else the global theme.
// `pageTheme` and `locked` describe that hold, so the switches can hide while it lasts.
const resolve = (state: ThemeContextType): Partial<ThemeContextType> => {
  const held = state.ownTheme ?? state.routeTheme ?? null;
  return {
    pageTheme: held,
    locked: held !== null,
    theme: held ?? state.savedTheme ?? FALLBACK_THEME
  };
};
const createThemeStore = (init: ThemeContextType = initialContext) => {
  return createStore<ThemeStore>()((set) => ({
    ...init,
    ...resolve(init),
    // Sets the global theme without making it a pick (the device setting, on mount or when it changes).
    saveTheme: (themeToSet: Theme) =>
      set((state) => {
        const next = { ...state, savedTheme: themeToSet };
        return { ...next, ...resolve(next) };
      }),
    // Clearing is not a pick: the global theme returns to the device setting and nothing stays saved.
    clearSave: () => {
      savePick(null);
      set((state) => {
        const next = { ...state, savedTheme: deviceTheme(), picked: false };
        return { ...next, ...resolve(next) };
      });
    },
    // The visitor's pick. A held page ignores it (its switches are hidden).
    toggleTheme: () =>
      set((state) => {
        if (state.locked) return state;
        const vice: Theme = state.savedTheme === "dark" ? "light" : "dark";
        savePick(vice);
        const next = { ...state, savedTheme: vice, picked: true };
        return { ...next, ...resolve(next) };
      }),
    setLocked: (locked: boolean) => set({ locked }),
    setTheme: (themeToSet) =>
      set((state) => {
        if (state.theme === themeToSet) return state;
        return {
          ...state,
          theme: state.locked
            ? state.pageTheme || FALLBACK_THEME
            : themeToSet || FALLBACK_THEME
        };
      }),
    setBaseTheme: () => set((state) => ({ ...state, ...resolve(state) })),
    // A page holding its own theme (the 404). Releasing it falls back to the route's hold, if any.
    setPageTheme: (themeToSet: Theme | null, lock: boolean = true) =>
      set((state) => {
        const next = { ...state, ownTheme: lock ? themeToSet : null };
        return { ...next, ...resolve(next) };
      }),
    clearPageTheme: () =>
      set((state) => {
        const next = { ...state, ownTheme: null };
        return { ...next, ...resolve(next) };
      }),
    setRouteTheme: (themeToSet: Theme | null) =>
      set((state) => {
        const next = { ...state, routeTheme: themeToSet };
        return { ...next, ...resolve(next) };
      })
  }));
};
export type ThemeAPI = ReturnType<typeof createThemeStore>;
const ThemeContext = createContext<ThemeAPI>(null!);

export const CMDKeyManager = () => {
  const toggleTheme = useTheme((store) => store.toggleTheme);
  const keyPressed = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "h":
            return (e.preventDefault(), toggleTheme());
        }
      }
    },
    [toggleTheme]
  );
  useEffect(() => {
    document.addEventListener("keydown", keyPressed);
    return () => document.removeEventListener("keydown", keyPressed);
  }, [keyPressed]);
  return <></>;
};
// Two layers, as in The Hideaway (ADR 0002). The global theme (savedTheme) is the visitor's pick, or
// their device setting until they pick; only a pick is saved. A page theme locks a page while it is open
// and wins; it is never saved. The page shows `theme`, the one that wins, and only this provider writes it.
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const themeRef = useRef<ThemeAPI>(null!);
  if (!themeRef.current) {
    themeRef.current = createThemeStore({ ...initialContext, routeTheme: pageThemeFor(pathname) });
  }
  useLayoutEffect(() => {
    const store = themeRef.current;
    const root = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (theme: Theme, animate: boolean) => {
      if (root.getAttribute("data-theme") === theme) return;
      applyDocumentTheme(root, theme, { armTransitions: animate });
      if (!animate) return;
      clearTimeout(timer);
      // Kept armed a frame past the fade (--theme-transition-duration in globals.css), as The Hideaway did.
      timer = setTimeout(() => clearThemedTransitions(root), THEME_TRANSITION_SECONDS * 1000 + 20);
    };
    const pick = readPick();
    store.setState({ picked: pick !== null });
    store.getState().saveTheme(pick ?? deviceTheme());
    show(store.getState().theme, false);
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.theme !== prev.theme) show(state.theme, true);
    });
    let media: MediaQueryList | undefined;
    try {
      media = window.matchMedia("(prefers-color-scheme: light)");
    } catch {
      media = undefined;
    }
    const followDevice = () => {
      // A pick outranks the device, even when storage is blocked and the pick lives only in the store.
      if (!store.getState().picked) store.getState().saveTheme(deviceTheme());
    };
    media?.addEventListener?.("change", followDevice);
    return () => {
      unsubscribe();
      media?.removeEventListener?.("change", followDevice);
      clearTimeout(timer);
      clearThemedTransitions(root);
    };
  }, []);
  // A page listed in pageThemes is held while it is open; leaving it releases the hold.
  useLayoutEffect(() => {
    themeRef.current.getState().setRouteTheme(pageThemeFor(pathname));
  }, [pathname]);
  return (
    <ThemeContext.Provider value={themeRef.current}>
      {children}
    </ThemeContext.Provider>
  );
};
export const AdminThemeProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const themeRef = useRef<ThemeAPI>(null!);
  if (!themeRef.current) {
    themeRef.current = createThemeStore();
  }
  return (
    <ThemeContext.Provider value={themeRef.current}>
      {children}
    </ThemeContext.Provider>
  );
};
export const useTheme = <T,>(selector: (store: ThemeStore) => T): T => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return useStore(context, selector);
};

// export const useTheme = (): ThemeContextType => useContext(ThemeContext)
