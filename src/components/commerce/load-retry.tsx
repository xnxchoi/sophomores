"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { InlineRetry } from "@/components/core/InlineRetry/InlineRetry";

/**
 * A failed server read on a commerce page, retried in place: the shared InlineRetry (its own label and busy text)
 * re-running the page's server render with router.refresh(). The pages are server components, so the router call
 * needs this client edge; the failure line stays the caller's.
 */
export function CommerceLoadRetry({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <InlineRetry pending={pending} className={className} onRetry={() => startTransition(() => router.refresh())} />;
}
