"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** A foreground timeout is only a recovery hint, never proof that Messages opened. */
function observeComposeAttempt(reveal: () => void, hide: () => void) {
  let active = true;
  const cleanup = () => {
    active = false;
    window.clearTimeout(timer);
    window.removeEventListener("blur", interrupt);
    document.removeEventListener("visibilitychange", visibility);
  };
  const interrupt = () => {
    cleanup();
    hide();
  };
  const visibility = () => {
    if (document.visibilityState === "hidden") interrupt();
  };
  window.addEventListener("blur", interrupt);
  document.addEventListener("visibilitychange", visibility);
  const timer = window.setTimeout(() => {
    if (active && document.visibilityState !== "hidden") reveal();
  }, 3000);
  return cleanup;
}

/** Called only by an explicit compose-link click; never navigates or sends a message. */
export function useComposeFallback(challengeId: string | null) {
  // A restored receiver must not resurrect recovery from an earlier launch.
  const scope = useMemo(() => ({ challengeId }), [challengeId]);
  const [recoveryScope, setRecoveryScope] = useState<typeof scope | null>(null);
  const cancel = useRef<(() => void) | null>(null);
  useEffect(() => () => cancel.current?.(), [scope]);
  const onCompose = useCallback(() => {
    cancel.current?.();
    setRecoveryScope(null);
    if (!challengeId || document.visibilityState === "hidden") return;
    cancel.current = observeComposeAttempt(
      () => setRecoveryScope(scope),
      () => setRecoveryScope(null)
    );
  }, [challengeId, scope]);
  return {
    showFallback: Boolean(challengeId && recoveryScope === scope),
    onCompose
  };
}
