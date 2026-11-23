import type { ReactNode } from "react";
import { segmentNamespaces } from "@/i18n/client-namespaces";
import { SegmentMessages } from "../_intl/segment-messages";

// The welcome pages' client components receive their own namespaces only (src/i18n/client-namespaces.ts).
export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return <SegmentMessages namespaces={segmentNamespaces.welcome}>{children}</SegmentMessages>;
}
