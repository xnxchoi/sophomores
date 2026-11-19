"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const FOOTER_HIDDEN_PATTERNS: readonly RegExp[] = [/^\/team\/?$/];

export function BusinessFooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname && FOOTER_HIDDEN_PATTERNS.some((pattern) => pattern.test(pathname))) return null;
  return <>{children}</>;
}
