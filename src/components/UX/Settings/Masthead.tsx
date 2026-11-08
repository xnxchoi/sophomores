import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/components/core/Link/Link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Settings hub top zone — the "freedom zone" per the macOS-Apple-Account
 * pattern. Editorially weighted, top-right anchored: avatar on the LEFT,
 * type stack on the RIGHT, right-justified along a strong vertical edge.
 *
 * This is where the page's design weight lives. The rows beneath it stay
 * uniform/utilitarian so they don't compete.
 *
 * The Plaque (3D titanium membership card) eventually slots into the
 * left block, replacing the flat avatar at xl+. Until that ships, the
 * avatar is the placeholder.
 */
interface MastheadProps {
  /** Display name (auto-derived from firstName + lastName upstream). */
  displayName: string;
  /** Avatar image src. */
  imageSrc?: string | null;
  /** Public handle (without leading @). */
  handle?: string | null;
  /** Sign-in email. */
  email: string;
  /** Optional role label (e.g. "Patron", "Editor"). */
  roleLabel?: string;
  /** Optional member-since label (e.g. "Member since Mar 2026"). */
  memberSince?: string;
  /** When the user has a public handle, render the View public link. */
  publicHref?: string | null;
  /** Right-side companion slot (Plaque, status object, etc.) — rendered xl+ only. */
  companion?: ReactNode;
  className?: string;
}

export function Masthead({
  displayName,
  imageSrc,
  handle,
  email,
  roleLabel,
  memberSince,
  publicHref,
  companion,
  className
}: MastheadProps) {
  const initial = (displayName || email || "·").trim().charAt(0);

  return (
    <header
      className={cn(
        // Generous vertical room — the masthead is the hero of the
        // surface, not a header band. Top-zone padding doesn't try to
        // match Panel padding; it has its own scale.
        "relative flex flex-col gap-8 px-1 py-8 xl:px-2 xl:py-12 2xl:py-16",
        // 3-col at xl+: avatar | type-stack | companion
        // 2-col below xl: avatar | type-stack (companion drops out)
        "xl:grid xl:grid-cols-[auto_1fr_auto] xl:gap-x-12 xl:gap-y-0",
        className
      )}
    >
      {/* Avatar block — left anchor. Square'd intentionally; the Plaque
          variant will land here at xl+ as a portrait card. */}
      <div className="row-span-2 flex shrink-0 items-start">
        <Avatar className="h-24 w-24 rounded-2xl outline outline-1 -outline-offset-1 outline-foreground/20 sm:h-28 sm:w-28 xl:h-32 xl:w-32 xl:rounded-2xl">
          {imageSrc ? (
            <AvatarImage
              src={imageSrc}
              alt={displayName}
              className="object-cover"
            />
          ) : (
            <AvatarFallback className="rounded-2xl bg-foreground/[0.06] text-3xl font-light text-foreground/65 xl:text-4xl">
              {initial.toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      {/* Type stack — right-justified along a strong vertical edge. This
          is the editorial signature: text gravitates to the right, not
          to the center (macOS) or left (the obvious default). */}
      <div className="flex min-w-0 flex-col items-stretch gap-2 text-right">
        {roleLabel ? (
          <p className="text-xs font-medium tracking-tight text-foreground/65 dark:text-foreground/60">
            {roleLabel}
          </p>
        ) : null}
        <h1 className="text-4xl font-light tracking-tight text-balance sm:text-5xl xl:text-6xl">
          {displayName}
        </h1>
        <div className="flex flex-col items-end gap-0.5 text-sm text-foreground/65 dark:text-foreground/60">
          {handle ? <span>@{handle}</span> : null}
          <span className="font-sans text-xs tracking-tight text-foreground/55 tabular-nums dark:text-foreground/50">
            {email}
          </span>
        </div>
        {(memberSince || publicHref) && (
          <div className="mt-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-foreground/55 dark:text-foreground/50">
            {memberSince ? <span>{memberSince}</span> : null}
            {publicHref ? (
              <Link
                href={publicHref}
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground/85"
              >
                View public
                <ArrowUpRight size={11} />
              </Link>
            ) : null}
          </div>
        )}
      </div>

      {/* Companion slot — xl+ only. Reserved for the Plaque or other
          status objects. Empty for now; layout collapses gracefully when
          companion is undefined. */}
      {companion ? (
        <div className="hidden xl:row-span-2 xl:block">{companion}</div>
      ) : null}
    </header>
  );
}
