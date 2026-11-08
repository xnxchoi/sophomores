"use client";

import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

type SessionApi = {
  stale: boolean;
  markStale: () => void;
};

const sessionStore = createStore<SessionApi>(() => ({
  stale: false,
  markStale: () => {}
}));

export function useRPSession<T>(selector: (state: SessionApi) => T): T {
  return useStore(sessionStore, selector);
}
