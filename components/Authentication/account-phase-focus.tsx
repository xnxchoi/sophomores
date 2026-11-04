"use client";

import { useEffect, useLayoutEffect, useRef, type FocusEvent as ReactFocusEvent, type RefObject } from "react";
import type { AccountPhaseViewProps } from "./_shared/account-phase-types";

// Vaul/Radix FocusScope owns surface mount/trap, not phase/request ownership after
// disabled-control blur. Keep this domain-specific React behavior with its phase views.
export function useAccountPhaseFocus(
  props: AccountPhaseViewProps,
  body: RefObject<HTMLDivElement | null>,
  present: boolean
) {
  const pending = props.busy || props.feedbackPending === true;
  const wasBusy = useRef(pending);
  const focusedPhase = useRef<AccountPhaseViewProps["phase"] | null>(null);
  const pendingInitialFocus = useRef<HTMLElement | null>(null);
  const focusOwner = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!pending) return;
    const release = () => {
      focusOwner.current = null;
      pendingInitialFocus.current = null;
    };
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement && event.target !== document.body && event.target !== focusOwner.current) release();
    };
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !focusOwner.current?.contains(event.target)) release();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") release();
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pending]);
  useLayoutEffect(() => {
    if (!present || document.visibilityState === "hidden") return;
    const input = props.submitDisabled ? null : body.current?.querySelector<HTMLInputElement>("input:not(:disabled)");
    const heading = body.current?.querySelector<HTMLElement>("h3");
    if (focusedPhase.current !== props.phase) {
      focusedPhase.current = props.phase;
      pendingInitialFocus.current = !input && !props.failure && (props.busy || props.submitDisabled) ? heading ?? null : null;
      (input ?? heading)?.focus({ preventScroll: true });
    } else if (pendingInitialFocus.current) {
      if (document.activeElement !== pendingInitialFocus.current) pendingInitialFocus.current = null;
      else if (input) {
        pendingInitialFocus.current = null;
        input.focus({ preventScroll: true });
      }
    }
  }, [body, present, props.phase, props.busy, props.submitDisabled, props.failure]);
  useLayoutEffect(() => {
    const finished = wasBusy.current && !pending;
    wasBusy.current = pending;
    if (finished && present && document.visibilityState !== "hidden") {
      const input = body.current?.querySelector<HTMLInputElement>("input");
      const active = document.activeElement;
      // Disabled controls can blur to body; retain ownership only until a new interaction.
      const owner = active === document.body ? focusOwner.current : active;
      if (owner instanceof HTMLButtonElement && owner.hasAttribute("data-account-status-refresh")) {
        const retry = body.current?.querySelector<HTMLButtonElement>("[data-account-status-refresh]");
        const target = retry && !retry.disabled ? retry : !retry && input && !input.disabled && !props.submitDisabled ? input : body.current?.querySelector<HTMLElement>("h3");
        if (target && active !== target) target.focus({ preventScroll: true });
        return;
      }
      if (props.phase === "email-code" && (!props.code || props.invalid === "code" || props.failure === "invalid-code") && input && !input.disabled && (
        owner === input ||
        (owner instanceof HTMLButtonElement && owner.form === input.form && (
          owner.dataset.phaseAction === "submit" ||
          (owner.dataset.phaseAction === "retry" && !props.code && !props.failure)
        ))
      )) {
        if (active !== input) input.focus({ preventScroll: true });
        if (props.invalid === "code" || props.failure === "invalid-code") input.select();
      }
    }
  }, [
    body,
    present,
    pending,
    props.code,
    props.invalid,
    props.failure,
    props.submitDisabled,
    props.phase
  ]);

  return {
    onFocusCapture(event: ReactFocusEvent<HTMLDivElement>) {
      focusOwner.current = event.target instanceof HTMLElement ? event.target : null;
    },
    onBlurCapture(event: ReactFocusEvent<HTMLDivElement>) {
      if (!(event.target instanceof HTMLElement && event.target.matches(":disabled")) || (event.relatedTarget instanceof Element && event.relatedTarget !== document.body)) focusOwner.current = null;
    }
  };
}
