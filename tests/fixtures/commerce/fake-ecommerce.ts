// Test-only stand-in for "@payloadcms/plugin-ecommerce/client/react" (swapped in by registerHooks in
// tests/commerce/ui/cart-state-dom.test.tsx): the cart's useCart/useEcommerce, driven by the test.
import { useSyncExternalStore } from "react";

type FakeState = {
  cart: unknown;
  isLoading: boolean;
  user: unknown;
  removeItem: (itemID: string) => Promise<void>;
  refreshCart: () => Promise<void>;
};

const listeners = new Set<() => void>();
let state: FakeState = {
  cart: undefined, isLoading: false, user: null,
  removeItem: async () => {}, refreshCart: async () => {},
};

/** Replace part of the fake plugin state and re-render every consumer. */
export function setFakeEcommerce(next: Partial<FakeState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function resetFakeEcommerce() {
  setFakeEcommerce({ cart: undefined, isLoading: false, user: null, removeItem: async () => {}, refreshCart: async () => {} });
}

function useFakeState() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => state, () => state);
}

export function useCart() {
  const current = useFakeState();
  return { cart: current.cart, isLoading: current.isLoading,
    removeItem: (itemID: string) => current.removeItem(itemID), refreshCart: () => current.refreshCart() };
}

export function useEcommerce() {
  return { user: useFakeState().user };
}
