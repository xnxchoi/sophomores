"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from "react";

type SettingsNavValue = {
  pathname: string;
  pendingHref: string | null;
  setPendingHref: Dispatch<SetStateAction<string | null>>;
};

const SettingsNavContext = createContext<SettingsNavValue | null>(null);

export function SettingsNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const value = useMemo(
    () => ({ pathname, pendingHref, setPendingHref }),
    [pathname, pendingHref]
  );

  return (
    <SettingsNavContext.Provider value={value}>
      {children}
    </SettingsNavContext.Provider>
  );
}

export function useSettingsNav() {
  const value = useContext(SettingsNavContext);
  if (!value) {
    throw new Error("useSettingsNav must be used within SettingsNavProvider");
  }
  return value;
}
