"use client";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { motion, type MotionValue, useInView } from "motion/react";
import { blurTextTokens, blurWordTransition } from "@/lib/teaser/blur-tokens";

export function BlurText({
  text,
  active
}: {
  text: string;
  active?: boolean | MotionValue<boolean>;
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
  const textString = useMemo(() => text.split(/(\s+)/).filter(Boolean), [text]);
  const explicitActive = useSyncExternalStore(subscribe, snapshot, () => false);
  const visible = active === undefined ? inView : explicitActive;
  return (
    <span ref={ref} className="whitespace-pre-line">
      <span className="sr-only [clip-path:inset(50%)]">{text}</span>
      <span aria-hidden="true">
        {textString.map((part, index) => part.trim() === "" ? part : (
          <motion.span
            key={index}
            className="blur-word inline-block"
            initial={blurTextTokens.hidden}
            animate={visible ? blurTextTokens.visible : blurTextTokens.hidden}
            exit={blurTextTokens.hidden}
            transition={blurWordTransition(Math.floor(index / 2), visible)}
          >
            {part}
          </motion.span>
        ))}
      </span>
    </span>
  );
}
