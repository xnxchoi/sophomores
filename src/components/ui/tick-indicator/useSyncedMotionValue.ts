import { useEffect } from "react";
import { MotionValue, useMotionValue } from "motion/react";

export function useSyncedMotionValue<T>(value: T): MotionValue<T> {
  const mv = useMotionValue(value);
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  return mv;
}
