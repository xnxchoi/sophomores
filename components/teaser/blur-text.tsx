"use client";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { motion, useInView, type MotionValue } from "motion/react";
import { blurTextTokens, wordTransition } from "@/lib/teaser/blur-tokens";

export function BlurText({
  text,
  active,
  still
}: {
  text: string;
  active?: boolean | MotionValue<boolean>;
  still: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.25, once: true });
  const subscribe = useCallback(
    (notify: () => void) =>
      typeof active === "object" ? active.on("change", notify) : () => {},
    [active]
  );
  const snapshot = useCallback(
    () => (typeof active === "boolean" ? active : (active?.get() ?? false)),
    [active]
  );
  const explicitActive = useSyncExternalStore(subscribe, snapshot, () => false);
  const visible = still || (active === undefined ? inView : explicitActive);
  return (
    <span ref={ref} className="blur-text">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text
          .split(/(\s+)/)
          .filter(Boolean)
          .map((part, index) =>
            /^\s+$/.test(part) ? (
              part
            ) : (
              <motion.span
                key={index}
                className="blur-word"
                initial={still ? blurTextTokens.visible : blurTextTokens.hidden}
                animate={
                  visible ? blurTextTokens.visible : blurTextTokens.hidden
                }
                exit={blurTextTokens.hidden}
                transition={
                  still || !visible
                    ? { duration: 0 }
                    : wordTransition(Math.floor(index / 2))
                }
              >
                {part}
              </motion.span>
            )
          )}
      </span>
    </span>
  );
}
