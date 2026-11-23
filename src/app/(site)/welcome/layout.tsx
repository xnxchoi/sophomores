import type { ReactNode } from "react";
import { segmentNamespaces } from "@/i18n/client-namespaces";
import { PrivateRoute } from "@/components/auth/private-route";
import { SegmentMessages } from "../_intl/segment-messages";

// The welcome pages' client components receive their own namespaces only (src/i18n/client-namespaces.ts).
// A member's own page (src/lib/member-auth/private-pages.ts): rendered per request, guarded in the browser.
export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return <PrivateRoute><SegmentMessages namespaces={segmentNamespaces.welcome}>{children}</SegmentMessages></PrivateRoute>;
}
