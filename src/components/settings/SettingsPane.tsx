"use client";

import { useAnimate } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useSettingsNav } from "./SettingsNav";

const PANE_FADE_DURATION = 0.28;

function pathOf(href: string) {
  return href.split("#")[0]!.split("?")[0]!;
}

/**
 * Inner settings pane. A rail click starts the fade immediately and the
 * outgoing section stays mounted until that fade finishes; the incoming
 * section swaps in at opacity 0 and fades up.
 */
export function SettingsPane({ children }: { children: ReactNode }) {
  const { pathname, pendingHref, setPendingHref } = useSettingsNav();
  const shownPathRef = useRef(pathOf(pathname));
  const incomingRef = useRef(children);
  const pathnameRef = useRef(pathOf(pathname));

  const [shown, setShown] = useState(children);
  const [leaving, setLeaving] = useState(false);
  const [scope, animate] = useAnimate();
  const runIdRef = useRef(0);

  if (!pendingHref && !leaving && shown !== children) setShown(children);

  useEffect(() => {
    incomingRef.current = children;
    pathnameRef.current = pathOf(pathname);
    if (!pendingHref && !leaving) shownPathRef.current = pathOf(pathname);
  });

  useEffect(() => {
    if (!pendingHref) return;
    const dest = pathOf(pendingHref);
    if (dest === shownPathRef.current) return;
    const runId = ++runIdRef.current;
    setLeaving(true);

    const waitFrame = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

    void (async () => {
      const outgoing = scope.current;
      if (outgoing) {
        await animate(
          outgoing,
          { opacity: 0 },
          { duration: PANE_FADE_DURATION, ease: "easeInOut" }
        );
      }
      if (runId !== runIdRef.current) return;

      const started = performance.now();
      while (runId === runIdRef.current) {
        if (pathnameRef.current === dest) break;
        if (
          typeof window !== "undefined" &&
          pathOf(window.location.pathname) === dest
        ) {
          break;
        }
        if (performance.now() - started > 4000) break;
        await waitFrame();
      }
      if (runId !== runIdRef.current) return;

      shownPathRef.current = dest;
      setShown(incomingRef.current);
      await waitFrame();
      if (runId !== runIdRef.current) return;

      const incoming = scope.current;
      if (incoming) {
        incoming.style.opacity = "0";
        await animate(
          incoming,
          { opacity: 1 },
          { duration: PANE_FADE_DURATION, ease: "easeInOut" }
        );
      }
      if (runId !== runIdRef.current) return;
      setLeaving(false);
      setPendingHref((current) =>
        current && pathOf(current) === dest ? null : current
      );
    })();
  }, [pendingHref, animate, scope, setPendingHref]);

  return (
    <div
      className="relative w-full overflow-x-hidden"
      data-settings-pane=""
      data-leaving={leaving ? "true" : "false"}
    >
      <div ref={scope}>{shown}</div>
    </div>
  );
}
