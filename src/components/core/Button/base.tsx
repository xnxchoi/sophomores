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

type ArcButtonProps = ComponentProps<typeof ArcButton>;
export type ButtonProps = Omit<ArcButtonProps, "variant"> & {
  /** Arc's variants, or "bare": a native button with no Arc styling or motion, for controls that draw themselves. */
  variant?: ArcButtonProps["variant"] | "bare";
};

/**
 * The site's button with the cursor. A plain button by default (type="button"), so it never submits a form by accident;
 * a submit passes type="submit". Arc's button for the Arc variants; "bare" is a native button the caller styles.
 */
export function Button({ variant = "primary", ...props }: ButtonProps) {
  return variant === "bare" ? <BareButton {...props} /> : <ArcBackedButton variant={variant} {...props} />;
}

/**
 * Keyboard focus: ghost buttons draw the ring tight on their label (FocusShape), the others on the button itself, with
 * the same 2 px width and offset.
 */
function ArcBackedButton({ variant, type = "button", onMouseEnter: doME, onMouseLeave: doML, className, children, ...rest }: ArcButtonProps) {
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

/**
 * A native button with the cursor and nothing else: no Arc CSS, no press motion, so a raw button moves onto it without
 * changing how it looks. The keyboard ring is the filled buttons' (2 px, 2 px out, current colour) unless the caller
 * draws its own on its content (group/focus with a FocusShape inside).
 */
function BareButton({ type = "button", loading, size: _size, onMouseEnter: doME, onMouseLeave: doML, className, ...rest }: Omit<ButtonProps, "variant">) {
  const inert = isInert({ disabled: rest.disabled, loading, ariaDisabled: rest["aria-disabled"] });
  const { onMouseEnter, onMouseLeave } = useDomCursor<HTMLButtonElement>({
    onEnter: doME,
    enterCondition: () => (inert ? null : "FOCUS"),
    onLeave: doML
  });
  const ownRing = className?.includes("group/focus");
  return (
    <button
      {...rest}
      type={type}
      aria-busy={loading || undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(!ownRing && "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current", className)}
    />
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
