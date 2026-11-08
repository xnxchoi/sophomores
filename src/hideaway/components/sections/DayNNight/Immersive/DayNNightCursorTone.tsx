"use client";

import { useEffect } from "react";
import { useCursor } from "@/hideaway/providers/RP_Pro";
import { useDayNNightScene } from "../store";
import type { HA_CURSOR } from "@/hideaway/stores/Cursor/CursorStore";

type CursorTone = HA_CURSOR["cursorTheme"];

function resolveCursorTone(progress: number): CursorTone {
  if (progress >= 0.58 && progress < 0.94) return "light";
  return "dark";
}

export function DayNNightCursorTone() {
  const tone = useDayNNightScene((r) => resolveCursorTone(r.progress));
  const setCursorTheme = useCursor((r) => r.setCursorTheme);
  const resetCursorTheme = useCursor((r) => r.resetCursorTheme);

  useEffect(() => {
    setCursorTheme(tone);
  }, [setCursorTheme, tone]);

  useEffect(() => {
    return () => resetCursorTheme();
  }, [resetCursorTheme]);

  return null;
}
