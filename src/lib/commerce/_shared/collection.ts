import english from "../../../../messages/en.json";
import type { Access, CollectionConfig, Field, NumberField } from "payload";
import { isCmsSuperAdmin, serverOwnedField } from "@/lib/auth/access";

export const commerceOperator: Access = ({ req }) => isCmsSuperAdmin(req.user);
export const commerceDeny: Access = () => false;

export function ledgerCollection(slug: string, fields: Field[]): CollectionConfig {
  return {
    slug,
    admin: { group: english.Staff.schema.commerceOperations, useAsTitle: "id" },
    access: { admin: ({ req }) => isCmsSuperAdmin(req.user), read: commerceOperator, create: commerceDeny, update: commerceDeny, delete: commerceDeny },
    fields: fields.map((field) => field.type === "ui" || field.type === "join" ? field : ({ ...field, access: { create: serverOwnedField, update: serverOwnedField, ...("access" in field ? field.access : {}) } })),
  };
}

export function relation(name: string, relationTo: string): Field {
  return { name, type: "relationship", relationTo, required: true, index: true } as Field;
}

export function numberField(name: string): NumberField {
  return { name, type: "number", min: 0, required: true, defaultValue: 0 };
}
