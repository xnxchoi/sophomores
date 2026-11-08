"use client";

import {
  createContext,
  type ReactNode,
  RefObject,
  useContext,
  useEffect,
  useState
} from "react";
import { createStore, useStore } from "zustand";

const ranger = import("@/hideaway/components/UX/Highlightr/providers/rangey").then(
  (r) => r.default
);
export type RangerState = {
  ranger: rangy.RangyStatic;
  highlighter: rangy.RangyHighlighter;
  classApplier: rangy.RangyClassApplier;
  targetContainer: HTMLElement;
};
export type RangerAct = {
  setTargetContainer: (container: HTMLElement | null) => void;
};
export type RangerStore = RangerState & RangerAct;
export const createRanger = ({ ranger }: { ranger: rangy.RangyStatic }) => {
  ranger.init();
  const highlighter = ranger.createHighlighter();
  const classApplier = ranger.createClassApplier("highlighted", {
    ignoreWhiteSpace: true,
    elementTagName: "mark",
    normalize: true
  });
  return createStore<RangerStore>()((set) => ({
    ranger,
    highlighter,
    classApplier,
    targetContainer: document.body,
    setTargetContainer: (container: HTMLElement | null) =>
      set({ targetContainer: container || document.body })
  }));
};

export const waiting = async <T,>(tg: RefObject<T>) => {
  let msCount = 0;
  while (!tg.current) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    msCount++;
    if (msCount > 350) {
      throw new Error("Target container not found");
    }
  }
  return tg.current;
};
type RangerAPI = ReturnType<typeof createRanger>;
const RangerContext = createContext<RangerAPI>(null!);

const createEmptyRanger = (): RangerAPI =>
  createStore<RangerStore>()(() => ({
    ranger: null as unknown as rangy.RangyStatic,
    highlighter: null as unknown as rangy.RangyHighlighter,
    classApplier: null as unknown as rangy.RangyClassApplier,
    targetContainer: null as unknown as HTMLElement,
    setTargetContainer: () => undefined
  }));

export const RangerProvider = ({ children }: { children: ReactNode }) => {
  const [store, setStore] = useState<RangerAPI>(createEmptyRanger);
  useEffect(() => {
    let cancelled = false;
    ranger.then((rangey) => {
      if (cancelled) return;
      setStore(createRanger({ ranger: rangey }));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <RangerContext.Provider value={store}>{children}</RangerContext.Provider>
  );
};
export const useRanger = <T,>(
  selector: (state: RangerStore) => T,
  targetContainer?: RefObject<HTMLElement>
) => {
  const ctx = useContext(RangerContext);
  if (!ctx) {
    throw new Error("useRanger must be used within a RangerProvider");
  }
  if (targetContainer) {
    waiting(targetContainer).then((tg) => {
      ctx.getState().setTargetContainer(tg);
    });
  }
  return useStore(ctx, selector);
};
