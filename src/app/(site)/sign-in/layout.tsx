import type { ReactNode } from "react";
import { segmentNamespaces } from "@/i18n/client-namespaces";
import { PrivateRoute } from "@/components/auth/private-route";
import { SegmentMessages } from "../_intl/segment-messages";

// Sign-in renders the account flow inline, with its own segment namespaces. A private page
// (src/lib/member-auth/private-pages.ts): rendered per request, guarded in the browser.
export default function SignInLayout({ children }: { children: ReactNode }) {
  return <PrivateRoute><SegmentMessages namespaces={segmentNamespaces["sign-in"]}>{children}</SegmentMessages></PrivateRoute>;
}
