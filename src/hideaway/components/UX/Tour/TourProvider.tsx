"use client";

import { createContext, ReactNode, useContext, useRef } from "react";
import { useStore } from "zustand";
import { createTourStore, TourStore } from "@/hideaway/stores/Tour/TourStore";

type TourStoreApi = ReturnType<typeof createTourStore>;

const TourContext = createContext<TourStoreApi | undefined>(undefined);

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const storeRef = useRef<TourStoreApi>(null!);
  if (!storeRef.current) {
    storeRef.current = createTourStore();
  }

  return (
    <TourContext.Provider value={storeRef.current}>
      {children}
    </TourContext.Provider>
  );
};

export const useTourStore = <T,>(selector: (store: TourStore) => T): T => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTourStore must be used within TourProvider");
  return useStore(ctx, selector);
};
