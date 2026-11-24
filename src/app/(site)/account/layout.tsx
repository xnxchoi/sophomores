import type { ReactNode } from "react";
import { segmentNamespaces } from "@/i18n/client-namespaces";
import { PrivateRoute } from "@/components/auth/private-route";
import { SegmentMessages } from "../_intl/segment-messages";

// The account pages' client components receive their own namespaces only (src/i18n/client-namespaces.ts).
// A member's own pages (src/lib/member-auth/private-pages.ts): rendered per request, guarded in the browser.
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <PrivateRoute><SegmentMessages namespaces={segmentNamespaces.account}>{children}</SegmentMessages></PrivateRoute>;
}
