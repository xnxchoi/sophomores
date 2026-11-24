import type { ReactNode } from "react";
import { PrivateRoute } from "@/components/auth/private-route";

// A member's own page (src/lib/member-auth/private-pages.ts): rendered per request, guarded in the browser.
export default function PrivatePageLayout({ children }: { children: ReactNode }) {
  return <PrivateRoute>{children}</PrivateRoute>;
}
