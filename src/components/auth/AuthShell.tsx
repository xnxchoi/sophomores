import { Logo } from "@/components/core/Logo";
import { RPage } from "@/components/UX/Transition";
import { DevAuthLabMount } from "@/lib/auth/dev/lab/DevAuthLabMount";
import { cn } from "@/lib/utils";
import { Suspense, type ReactNode } from "react";

export function AuthShell({
  children,
  footer,
  slug,
  width = "sm",
  backdrop
}: {
  children: ReactNode;
  footer?: ReactNode;
  slug: string[];
  width?: "sm" | "md";
  backdrop?: ReactNode;
}) {
  return (
    <RPage type="account" slug={slug}>
      <div className="relative z-[100] flex min-h-svh flex-col items-center justify-center px-6 py-12 md:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-6 rounded-[28px] bg-opaque-background/50 backdrop-blur-xl md:inset-9"
        />
        <div
          className={cn(
            "relative z-10 flex w-full flex-col gap-8",
            width === "md" ? "max-w-[420px]" : "max-w-[384px]"
          )}
        >
          <a
            href="/public"
            className="flex items-center gap-3 self-center font-medium text-foreground"
          >
            <Logo className="size-9" />
            The Hideaway.
          </a>
          <Suspense fallback={<AuthCardFallback />}>{children}</Suspense>
          {footer}
          {process.env.NODE_ENV !== "production" ? (
            <Suspense fallback={null}>
              <DevAuthLabMount />
            </Suspense>
          ) : null}
        </div>
        {backdrop}
      </div>
    </RPage>
  );
}

function AuthCardFallback() {
  return (
    <div
      aria-hidden
      className="rounded-xl bg-faded-background/50 px-6 py-10"
    >
      <div className="mx-auto h-10 w-36 bg-foreground/[0.06]" />
      <div className="mx-auto mt-3 h-3 w-52 bg-foreground/[0.04]" />
      <div className="mt-10 h-10 w-full border-b border-border/20" />
      <div className="mt-6 h-10 w-full border-b border-border/20" />
      <div className="mt-8 h-14 w-full rounded-md border border-faded-foreground/25" />
    </div>
  );
}
