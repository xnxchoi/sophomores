"use client";

import { applyTheme, nextTheme } from "@/lib/content/theme";
import { useLayoutEffect } from "react";

/** Applies the saved or system theme, and toggles it with ⌘H. */
export function SiteTheme() {
  useLayoutEffect(() => {
    const saved = localStorage.getItem("sophomores-theme");
    const theme = saved === "light" || saved === "dark"
      ? saved
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(theme);
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "h") return;
      event.preventDefault();
      applyTheme(nextTheme(document.documentElement.getAttribute("data-theme")));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
