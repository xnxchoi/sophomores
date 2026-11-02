import { createContext, useContext } from "react";
export { Button } from "@payloadcms/ui/elements/Button";
export { FieldLabel } from "@payloadcms/ui/fields/FieldLabel";
export { ReactSelect } from "@payloadcms/ui/elements/ReactSelect";
export { TextareaInput } from "@payloadcms/ui/fields/Textarea";

// Test-only document context. All controls above are installed native Payload
// implementations; no RootProvider, staff identity, session or permission exists.
export const ReviewPreviewDocument = createContext<{
  id?: string;
  data: { revision?: number };
}>({ data: {} });
export function useDocumentInfo() {
  return useContext(ReviewPreviewDocument);
}
