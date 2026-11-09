import { createContext, useContext } from "react";
export { Button } from "@payloadcms/ui/elements/Button";
export { FieldLabel } from "@payloadcms/ui/fields/FieldLabel";
export { ReactSelect } from "@payloadcms/ui/elements/ReactSelect";
export { TextInput } from "@payloadcms/ui/fields/Text";
export { CheckboxInput } from "@payloadcms/ui/fields/Checkbox";

// Synthetic test-only contexts; native installed Payload controls remain real.
export const OperatorDocument = createContext<{
  id?: string;
  data: Record<string, unknown>;
  setData: (data: Record<string, unknown>) => void;
}>({ data: {}, setData() {} });
export const OperatorModified = createContext(false);
export const OperatorConfig = createContext({ config: { routes: { api: "/api", admin: "/admin" }, serverURL: "", admin: {} } });
export function useDocumentInfo() { return useContext(OperatorDocument); }
export function useFormModified() { return useContext(OperatorModified); }
export function useConfig() { return useContext(OperatorConfig); }
