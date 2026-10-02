"use client";

import { useEffect, useState } from "react";

type NetworkInformation = {
  saveData?: boolean;
  addEventListener?: (name: string, fn: () => void) => void;
  removeEventListener?: (name: string, fn: () => void) => void;
};

/** Start fail-closed: no remote video request before local preferences are known. */
export function useIntroMedia() {
  const [environment, setEnvironment] = useState({
    ready: false,
    reduced: false,
    saveData: false,
    visible: true
  });
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & { connection?: NetworkInformation }
    ).connection;
    const update = () =>
      setEnvironment({
        ready: true,
        reduced: query.matches,
        saveData: connection?.saveData === true,
        visible: !document.hidden
      });
    update();
    query.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    connection?.addEventListener?.("change", update);
    return () => {
      query.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
      connection?.removeEventListener?.("change", update);
    };
  }, []);
  return environment;
}
