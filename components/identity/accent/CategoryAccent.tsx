import type { CSSProperties, ElementType, ReactNode } from "react";
import { createElement } from "react";
import { cn } from "@/lib/utils";
import { type AccentIdentity, DEFAULT_IDENTITY } from "./types";

interface CategoryAccentProps {
  identity?: AccentIdentity;
  /** Override angle in degrees. Default 135 (top-left → bottom-right). */
  angle?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  [key: string]: unknown;
}

/**
 * Sets accent CSS custom properties + data attributes on a container, so any
 * descendant can consume `var(--accent-from / --accent-to / --accent-solid /
 * --accent-gradient)`.
 *
 * When identity.accent is "none" the component still renders but supplies no
 * accent vars — descendants that fall back to monochrome keep their default
 * look. That's the "only where deserved" lever.
 */
export function CategoryAccent({
  as,
  identity = DEFAULT_IDENTITY,
  angle,
  className,
  style,
  children,
  ...rest
}: CategoryAccentProps) {
  const Tag: ElementType = as ?? "div";
  const accentStyle: CSSProperties =
    angle !== undefined
      ? { ...style, ["--accent-angle" as string]: `${angle}deg` }
      : (style ?? {});

  return createElement(
    Tag,
    {
      ...rest,
      "data-accent": identity.accent,
      "data-layout": identity.layout,
      className: cn(className),
      style: accentStyle
    },
    children
  );
}
