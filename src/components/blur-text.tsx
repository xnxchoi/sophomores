"use client";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { motion, type MotionValue, useInView } from "motion/react";

/** Each word starts together; later words resolve more slowly, up to 2.2s. */
export function BlurWord({
  children,
  index,
  visible
}: {
  children: string;
  index: number;
  visible: boolean;
}) {
  return (
    <motion.span
      className="blur-word inline-block"
      initial={{ opacity: 0, filter: "blur(12px)", y: 20 }}
      animate={
        visible
          ? { opacity: 1, filter: "blur(0px)", y: 0 }
          : { opacity: 0, filter: "blur(12px)", y: 20 }
      }
      exit={{ opacity: 0, filter: "blur(12px)", y: 20 }}
      transition={{
        duration: visible ? Math.min(index * 0.2, 2.2) : 0.55,
        delay: 0,
        ease: [0.42, 0, 0.58, 1]
      }}
    >
      {children}
    </motion.span>
  );
}

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
          <BlurWord key={index} index={Math.floor(index / 2)} visible={visible}>
            {part}
          </BlurWord>
        ))}
      </span>
    </span>
  );
}
