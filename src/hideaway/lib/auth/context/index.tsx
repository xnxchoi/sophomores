"use client";

import { createContext, useContext, type ReactNode } from "react";

type UserContextType = {
  currentUserPromise: Promise<{ id?: string } | null>;
};

const BetterAuthContext = createContext<UserContextType | null>(null);
const emptyUser = Promise.resolve(null);

export function useBetterAuth(): UserContextType {
  const context = useContext(BetterAuthContext);
  if (context === null) {
    throw new Error("useBetterAuth must be used within a BetterAuthProvider");
  }
  return context;
}

/** Keeps the Hideaway registration tour mounted. Sophomores has no paid-account session yet, so the user promise is empty. */
export function BetterAuthProvider({ children }: { children: ReactNode }) {
  return (
    <BetterAuthContext.Provider value={{ currentUserPromise: emptyUser }}>
      {children}
    </BetterAuthContext.Provider>
  );
}
