"use client";

import { type ReactNode, createContext, useContext, useRef } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
type FormFiberState = {
  firstName: string;
  lastName: string;
  name: string;
};
type SetA = `set${Capitalize<keyof FormFiberState>}`;
type FormFiberAction = {
  [X in SetA]: (n: string) => void;
};
type FormFiberBridge = FormFiberAction & FormFiberState;
const createFiberStore = () =>
  createStore<FormFiberBridge>()((set) => ({
    firstName: "",
    lastName: "",
    name: "",
    setFirstName: (n: string) => set({ firstName: n }),
    setLastName: (n: string) => set({ lastName: n }),
    setName: (n: string) => set({ name: n })
  }));
type BridgeAPI = StoreApi<FormFiberBridge>;
const RegisterFiberCtx = createContext<BridgeAPI>(null!);
export function FormFiberBridge({ children }: { children: ReactNode }) {
  const storeRef = useRef<BridgeAPI>(null!);
  if (!storeRef.current) {
    storeRef.current = createFiberStore();
  }
  return (
    <RegisterFiberCtx.Provider value={storeRef.current}>
      {children}
    </RegisterFiberCtx.Provider>
  );
}
export function useRegisterFiber<T>(selector: (state: FormFiberBridge) => T) {
  const ctx = useContext(RegisterFiberCtx);
  if (!ctx) {
    throw new Error("useRegisterFiber must be used within a FormFiberBridge");
  }
  return useStore(ctx, selector);
}
