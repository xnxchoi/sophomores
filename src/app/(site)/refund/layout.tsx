import type { ReactNode } from "react";
import { segmentNamespaces } from "@/i18n/client-namespaces";
import { SegmentMessages } from "../_intl/segment-messages";

// The refund pages' client components receive their own namespaces only (src/i18n/client-namespaces.ts).
export default function RefundLayout({ children }: { children: ReactNode }) {
  return <SegmentMessages namespaces={segmentNamespaces.refund}>{children}</SegmentMessages>;
}
