"use client";

import { Link } from "@/components/core/Link/Link";
import { useState } from "react";
import { MarkerStroke, type MarkerStrokeVariant } from "./MarkerStroke";
import s from "./MarkerLink.module.scss";

export type MarkerLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: MarkerStrokeVariant;
  color?: string;
  className?: string;
  prefetch?: boolean;
};

/**
 * Inline link with a marker scribble that draws-in on hover/focus.
 * Composed for editorial body text — replaces a normal anchor in a sentence.
 */
export function MarkerLink({
  href,
  children,
  variant = "underline",
  color,
  className,
  prefetch = false
}: MarkerLinkProps) {
  const [active, setActive] = useState(false);
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`${s.link} ${className ?? ""}`}
      data-active={active}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <span className={s.label}>{children}</span>
      <span className={s.stroke} aria-hidden>
        <MarkerStroke
          variant={variant}
          trigger={active ? "always" : "hover"}
          color={color ?? "currentColor"}
        />
      </span>
    </Link>
  );
}
