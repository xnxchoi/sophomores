import { CurContext, useCursor } from "@/providers/RP_Pro";
import { useIsMobile } from "@/utilities/getBreakpoints";
import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useContext, useEffect, useMemo } from "react";
import type { ComponentProps, MouseEventHandler, MouseEvent } from "react";
import { useShallow } from "zustand/shallow";

type DOMMouseEventHandler<T> = (event: MouseEvent<T>) => void;
type ThreePointerEventHandler = (event: ThreeEvent<PointerEvent>) => void;

interface UseCursorHandlersOptions<T = HTMLElement> {
  onEnter?: DOMMouseEventHandler<T> | ThreePointerEventHandler;
  onLeave?: DOMMouseEventHandler<T> | ThreePointerEventHandler;
}

type SomeDivProps = ComponentProps<"div"> & {
  customStuff1?: string;
  customStuff2?: number;
};

interface CursorHandlers<T = HTMLElement> {
  onMouseEnter: DOMMouseEventHandler<T>;
  onMouseLeave: DOMMouseEventHandler<T>;
  onPointerOver: ThreePointerEventHandler;
  onPointerOut: ThreePointerEventHandler;
}

type EventType = "dom" | "three";

type EventHandlers<T extends EventType, E> = T extends "dom"
  ? {
      onMouseEnter: (e: MouseEvent<E>) => void;
      onMouseLeave: (e: MouseEvent<E>) => void;
    }
  : {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
      onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
    };
export type MarqueeState = ["MARQUEE", string];
export type TextCursorState = "HOVER" | "DRAG" | "CLOSE" | string;
export type CursorState = "FOCUS" | null;
export type CursorStatus = TextCursorState | CursorState;
type CursorHandlersOptions<T extends EventType, E> = Partial<{
  onEnter: T extends "dom"
    ? (e: MouseEvent<E>) => void
    : (e: ThreeEvent<PointerEvent>) => void;
  onLeave: T extends "dom"
    ? (e: MouseEvent<E>) => void
    : (e: ThreeEvent<PointerEvent>) => void;
  overrides?: {
    onEnter?: {
      condition: (
        e?: T extends "dom" ? MouseEvent<E> : ThreeEvent<PointerEvent>
      ) => CursorStatus;
    };
    onLeave?: {
      condition: (
        e?: T extends "dom" ? MouseEvent<E> : ThreeEvent<PointerEvent>
      ) => CursorState;
    };
  };
}>;
export type DomCursorOptions<E extends HTMLElement> = Partial<{
  onEnter: MouseEventHandler<E>;
  onLeave: MouseEventHandler<E>;
  marquee?: {
    enter?: (e: MouseEvent<E>) => boolean;
    leave?: (e: MouseEvent<E>) => boolean;
  };
  enterCondition?: (e: MouseEvent<E>) => CursorStatus;
  leaveCondition?: (e: MouseEvent<E>) => CursorStatus;
}>;
type DomHandlers<E extends HTMLElement> = {
  onMouseEnter: MouseEventHandler<E>;
  onMouseLeave: MouseEventHandler<E>;
};

export function useDomCursor<E extends HTMLElement = HTMLElement>({
  onEnter,
  onLeave,
  enterCondition,
  leaveCondition,
  marquee = {
    enter: undefined,
    leave: undefined
  }
}: DomCursorOptions<E>): DomHandlers<E> {
  const { enter, leave } = marquee;
  const { isMobile } = useIsMobile();
  const setCur = useCursor(useShallow((l) => l.setCursorState));
  const setMarquee = useCursor(useShallow((l) => l.setMarquee));
  const onEnterMarquee = useMemo<((e: MouseEvent<E>) => boolean) | undefined>(
    () => enter,
    [enter]
  );
  const onLeaveMarquee = useMemo<((e: MouseEvent<E>) => boolean) | undefined>(
    () => leave,
    [leave]
  );
  const onMouseEnter: DomHandlers<E>["onMouseEnter"] = useCallback(
    (e) => {
      const disabled =
        "disabled" in e.currentTarget
          ? e.currentTarget.disabled
          : "dataset" in e.currentTarget &&
              "disabled" in e.currentTarget.dataset
            ? e.currentTarget.dataset.disabled === "true"
            : false;
      const active =
        "dataset" in e.currentTarget && "active" in e.currentTarget.dataset
          ? e.currentTarget.dataset.active === "true"
          : false;
      const nullCondition = Boolean(disabled) || Boolean(active);
      const onEnterState: CursorStatus = enterCondition
        ? enterCondition(e)
        : nullCondition
          ? null
          : "FOCUS";
      setCur(onEnterState);
      onEnter?.(e);
      if (onEnterMarquee) {
        const result = onEnterMarquee(e);
        setMarquee(result);
      } else {
        setMarquee(false);
      }
    },
    [enterCondition, setCur, onEnter, onEnterMarquee, setMarquee]
  );
  const onMouseLeave: DomHandlers<E>["onMouseLeave"] = useCallback(
    (e) => {
      if (isMobile) return;
      const onLeaveState: CursorStatus = leaveCondition
        ? leaveCondition(e)
        : null;
      setCur(onLeaveState);
      onLeave?.(e);
      if (onLeaveMarquee) {
        const result = onLeaveMarquee(e);
        setMarquee(result);
      } else {
        setMarquee(false);
      }
    },
    [isMobile, leaveCondition, setCur, onLeave, onLeaveMarquee, setMarquee]
  );
  return {
    onMouseEnter,
    onMouseLeave
  };
}

export function useCursorHandlers<T extends EventType, E = HTMLElement>(
  type: T,
  { onEnter, onLeave }: CursorHandlersOptions<T, E> = {}
): EventHandlers<T, E> {
  const { isMobile } = useIsMobile();
  const setCur = useCursor((l) => l.setCursorState);
  const handleEnter = useCallback(
    (e: any) => {
      setCur("FOCUS");
      onEnter?.(e);
    },
    [onEnter, setCur]
  );

  const handleLeave = useCallback(
    (e: any) => {
      setCur(null);
      onLeave?.(e);
    },
    [onLeave, setCur]
  );

  const handlers = useMemo(
    () =>
      type === "dom"
        ? ({
            onMouseEnter: handleEnter,
            onMouseLeave: handleLeave
          } as EventHandlers<T, E>)
        : ({
            onPointerOver: handleEnter,
            onPointerOut: handleLeave
          } as EventHandlers<T, E>),
    [handleEnter, handleLeave, type]
  );
  return handlers;
}

/** One document owner also covers controls mounted later in Vaul portals. */
export function useInteractiveCursorHover(enabled: boolean) {
  const store = useContext(CurContext);
  useEffect(() => {
    if (!enabled || !store) return;
    // Motion 14.6 hover() binds resolved elements, not late portal controls.
    // Keep delegation and removal cleanup with this document cursor owner.
    let hovered: Element | null = null;
    let ownsFocus = false;
    const unavailable = (control: Element) =>
      control.matches(
        ":disabled, [disabled], [data-disabled]:not([data-disabled='false'])"
      ) ||
      Boolean(
        control.closest("[inert], [aria-disabled='true'], [aria-busy='true']")
      );
    const releaseFocus = () => {
      if (ownsFocus && store.getState().cursorState === "FOCUS") {
        store.getState().setCursorState(null);
      }
      ownsFocus = false;
    };
    const clear = () => {
      releaseFocus();
      hovered = null;
    };
    const updateFocus = () => {
      if (!hovered || unavailable(hovered)) {
        releaseFocus();
        return;
      }
      // Availability can change beneath a stationary pointer; explicit labels win.
      if (
        store.getState().cursorState === null ||
        store.getState().cursorState === "FOCUS"
      ) {
        store.getState().setCursorState("FOCUS");
        ownsFocus = true;
      }
    };
    const over = (event: PointerEvent) => {
      if (
        event.pointerType === "touch" ||
        window.matchMedia?.("(hover: none), (pointer: coarse)").matches
      ) {
        clear();
        return;
      }
      const control =
        event.target instanceof Element
          ? event.target.closest(
              "button, a[href], area[href], [role='button'], [role='link']"
            )
          : null;
      if (control === hovered) return;
      clear();
      hovered = control;
      updateFocus();
    };
    const out = (event: PointerEvent) => {
      if (
        hovered &&
        event.relatedTarget instanceof Node &&
        hovered.contains(event.relatedTarget)
      )
        return;
      clear();
    };
    const observer = new MutationObserver(() => {
      if (
        hovered &&
        (!hovered.isConnected ||
          !hovered.matches(
            "button, a[href], area[href], [role='button'], [role='link']"
          ))
      )
        clear();
      else updateFocus();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "disabled",
        "aria-disabled",
        "data-disabled",
        "aria-busy",
        "inert",
        "href",
        "role"
      ]
    });
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    window.addEventListener("blur", clear);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, [enabled, store]);
}
