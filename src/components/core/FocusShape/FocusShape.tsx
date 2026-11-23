import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * The keyboard focus ring of a control whose hit box is larger than what it draws (a text link, an icon or a pill
 * inside a 44-48 px target). The control keeps its hit box, drops its own ring and gets `group/focus`; this span
 * wraps the visible content and draws the ring on it, for keyboard focus only (owner, 23 Nov: "the focus ring
 * reveals that we have a larger hit area ... if we don't reveal that, it's fine"). Callers pass the colour or offset
 * the replaced ring used through `className`. Never nest two `group/focus` controls: the named group matches any
 * focused ancestor of that name.
 * Checked first: no installed package draws a ring on a descendant of the focused control (no react-aria,
 * focus-visible or what-input package); Tailwind's named-group variant does it with no script.
 */
export function FocusShape({ className, ...props }: ComponentProps<"span">) {
  return <span {...props} className={cn("rounded-sm outline-offset-2 group-focus-visible/focus:outline-2", className)} />;
}
