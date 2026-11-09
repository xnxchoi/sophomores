"use client";

import { Link } from "@/hideaway/components/core/Link/Link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import type {
  TableOfContentsProps,
  TableOfContentsRouteProps,
  TableOfContentsAnchorProps,
  TocLabelStyle
} from "./types";
import { useActiveSection } from "./useActiveSection";

/**
 * Vertical, gradient-led table of contents.
 *
 * Used for:
 *  - Long-form documents (`/terms`, `/privacy`) — `mode="anchor"`
 *  - Settings rail (`/me/settings/*`) — `mode="route"`
 *
 * Visual signature, ported from the original SettingsRail:
 *  - Hairline left border at `border-border/20`
 *  - Active rule: 1px-wide vertical gradient pill that fades in/out
 *  - Active sheen: a wide horizontal gradient fading to the right
 *
 * Label face defaults by mode:
 *  - `mode="route"`  — sans (admin / settings tone, per CLAUDE.md)
 *  - `mode="anchor"` — mono caps (editorial / document tone)
 *
 * Override with `labelStyle` if a surface needs the other face.
 */
export function TableOfContents(props: TableOfContentsProps) {
  return props.mode === "route" ? (
    <RouteToc {...props} />
  ) : (
    <AnchorToc {...props} />
  );
}

function RouteToc({
  items,
  ariaLabel = "Contents",
  className,
  labelStyle = "sans",
  isActive: customIsActive
}: TableOfContentsRouteProps) {
  const pathname = usePathname();

  const defaultIsActive = (pathname: string, href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const checkActive = customIsActive ?? defaultIsActive;

  return (
    <TocShell ariaLabel={ariaLabel} className={className}>
      {items.map((item, index) => {
        const active = checkActive(pathname, item.href);
        return (
          <TocItemLink
            key={item.href}
            href={item.href}
            label={item.label}
            number={item.number ?? formatOrdinal(index)}
            active={active}
            asAnchor={false}
            labelStyle={labelStyle}
          />
        );
      })}
    </TocShell>
  );
}

function AnchorToc({
  items,
  ariaLabel = "Contents",
  className,
  labelStyle = "mono",
  scrollOffsetTop = 96
}: TableOfContentsAnchorProps) {
  // Memoize ids so the effect inside useActiveSection doesn't tear down
  // on every render of the parent.
  const ids = useMemo(() => items.map((i) => i.id), [items]);

  const activeId = useActiveSection(ids, scrollOffsetTop);

  return (
    <TocShell ariaLabel={ariaLabel} className={className}>
      {items.map((item, index) => {
        const active = item.id === activeId;
        return (
          <TocItemLink
            key={item.id}
            href={`#${item.id}`}
            label={item.label}
            number={item.number ?? formatOrdinal(index)}
            active={active}
            asAnchor={true}
            labelStyle={labelStyle}
          />
        );
      })}
    </TocShell>
  );
}

function TocShell({
  ariaLabel,
  className,
  children
}: {
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "relative flex flex-col items-start justify-around gap-1 border-l border-border/20",
        className
      )}
    >
      {children}
    </nav>
  );
}

interface TocItemLinkProps {
  href: string;
  label: string;
  number: string;
  active: boolean;
  /** Use a plain <a> for in-page anchors so the browser handles the hash scroll. */
  asAnchor: boolean;
  labelStyle: TocLabelStyle;
}

function TocItemLink({
  href,
  label,
  number,
  active,
  asAnchor,
  labelStyle
}: TocItemLinkProps) {
  const className = cn(
    "group relative flex items-baseline gap-4 py-3.5 pr-4 pl-5 transition-all ease-out-power2 duration-200",
    // Active rule: vertical gradient pill on the left edge
    "before:absolute before:inset-y-1 before:transition-[opacity,border,background] before:ease-out-power2 before:duration-150 before: before:-left-px before:w-px before:bg-gradient-to-b before:from-transparent before:via-foreground/80 before:to-transparent dark:before:via-foreground",
    active ? "before:opacity-100" : "before:opacity-0 hover:before:opacity-40",
    // Active sheen: wide horizontal gradient fading right
    "after:pointer-events-none after:absolute after:inset-y-0 after:-left-px after:w-32 after:bg-gradient-to-r after:from-foreground/[0.05] after:to-transparent after:transition-opacity dark:after:from-foreground/[0.07]",
    active ? "after:opacity-100" : "after:opacity-0",
    // Keyboard focus
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  );

  const numberClass = cn(
    "relative z-10 font-sans text-[10px] tracking-widest tabular-nums transition-colors",
    active ? "text-foreground/85" : "text-foreground/55 dark:text-foreground/50"
  );

  const labelClass =
    labelStyle === "mono"
      ? cn(
          "relative z-10 font-sans text-[11px] tracking-[0.18em] uppercase transition-colors xl:text-xs ease-out-power2 duration-150",
          active
            ? "text-foreground"
            : "text-foreground/60 group-hover:text-foreground/85 dark:text-foreground/55"
        )
      : cn(
          "relative z-10 text-sm tracking-tight transition-colors ease-out-power2 duration-150",
          active
            ? "font-medium text-foreground"
            : "font-normal text-foreground/65 group-hover:text-foreground/90 dark:text-foreground/60"
        );

  const content = (
    <>
      <span aria-hidden="true" className={numberClass}>
        {number}
      </span>
      <span className={labelClass}>{label}</span>
    </>
  );

  if (asAnchor) {
    // Use a plain <a> so the browser handles hash navigation & focus.
    return (
      <a
        href={href}
        className={className}
        aria-current={active ? "location" : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </Link>
  );
}

function formatOrdinal(index: number): string {
  return String(index + 1).padStart(2, "0");
}
