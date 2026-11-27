"use client";

import type { ComponentProps } from "react";
import type { HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import { useDomCursor } from "@/components/core/cursorWrapper";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { Button as ArcButton } from "@/components/arc/button/button";
import { cn } from "@/lib/utils";

/**
 * The site's buttons with the custom cursor (owner, 27 Nov: buttons import core Button so the cursor reacts). This file
 * imports Arc's plain button and nothing from Arc that imports core back, so Arc's copy and action buttons can build on
 * it without an import cycle; core/Button/index.tsx re-exports it with the rest.
 */

/** Inert while disabled, loading or aria-disabled: no click (Arc) and no cursor reaction. */
function isInert({ disabled, loading, ariaDisabled }: { disabled?: boolean; loading?: boolean; ariaDisabled?: ComponentProps<"button">["aria-disabled"] }) {
  return Boolean(disabled || loading || ariaDisabled === true || ariaDisabled === "true");
}

/**
 * Arc's button with the cursor. A plain button by default (type="button"), so it never submits a form by accident;
 * a submit passes type="submit". Keyboard focus: ghost buttons draw the ring tight on their label (FocusShape), the
 * others on the button itself, with the same 2 px width and offset.
 */
export function Button({ variant = "primary", type = "button", onMouseEnter: doME, onMouseLeave: doML, className, children, ...rest }: ComponentProps<typeof ArcButton>) {
  const inert = isInert({ disabled: rest.disabled, loading: rest.loading, ariaDisabled: rest["aria-disabled"] });
  const { onMouseEnter, onMouseLeave } = useDomCursor<HTMLButtonElement>({
    onEnter: doME,
    enterCondition: () => (inert ? null : "FOCUS"),
    onLeave: doML
  });
  return (
    <ArcButton
      {...rest}
      type={type}
      variant={variant}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        variant === "ghost" ? "group/focus" : "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        className
      )}
    >
      {variant === "ghost" ? (
        <FocusShape className="inline-flex items-center gap-[inherit] group-focus-visible/focus:outline-current">{children}</FocusShape>
      ) : (
        children
      )}
    </ArcButton>
  );
}

/** A motion button with the cursor; it fades in on mount unless the caller sets initial / animate. */
export function MotionButton({ type = "button", onMouseEnter: doME, onMouseLeave: doML, initial, animate, ...rest }: HTMLMotionProps<"button">) {
  const inert = isInert({ disabled: rest.disabled, ariaDisabled: rest["aria-disabled"] });
  const { onMouseEnter, onMouseLeave } = useDomCursor<HTMLButtonElement>({
    onEnter: doME,
    enterCondition: () => (inert ? null : "FOCUS"),
    onLeave: doML
  });
  return (
    <m.button
      type={type}
      initial={initial || { opacity: 0 }}
      animate={animate || { opacity: 1 }}
      {...rest}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
}
