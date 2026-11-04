"use client";

import { authClient } from "@/lib/auth/client";
import type { ReactNode } from "react";

export function SignedIn({ children }: { children: ReactNode }) {
  const { data } = authClient.useSession();
  return data ? children : null;
}
