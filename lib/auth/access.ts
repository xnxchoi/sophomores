import type { Access, CollectionConfig, Field, FieldAccess } from "payload";

// Payload's generic role helpers do not distinguish the customer collection from
// our separate verified staff strategy. Keep this cross-collection boundary here.
export function isCmsStaff(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  const principal = user as Record<string, unknown>;
  return (
    principal.collection === "admins" &&
    principal._strategy === "staff-better-auth" &&
    ["staff", "editor", "admin"].includes(String(principal.role))
  );
}

export function isCmsSuperAdmin(user: unknown): boolean {
  return isCmsStaff(user) && (user as Record<string, unknown>).role === "admin";
}

export const serverOwnedField: FieldAccess = () => false;
export const cmsStaffField: FieldAccess = ({ req }) => isCmsStaff(req.user);
const deny: Access = () => false;
const superAdmin: Access = ({ req }) => isCmsSuperAdmin(req.user);

export const customerAccess: NonNullable<CollectionConfig["access"]> = {
  admin: () => false,
  create: deny,
  delete: superAdmin,
  read: ({ req }) => {
    if (isCmsStaff(req.user)) return true;
    if (req.user?.collection !== "users") return false;
    return { id: { equals: req.user.id } };
  },
  update: ({ req, data }) => {
    if (isCmsSuperAdmin(req.user)) {
      return (
        !!data &&
        Object.keys(data).every((key) =>
          ["name", "localePreference", "notes"].includes(key)
        )
      );
    }
    if (
      req.user?.collection !== "users" ||
      !data ||
      !Object.keys(data).every((key) =>
        ["name", "localePreference"].includes(key)
      )
    )
      return false;
    return { id: { equals: req.user.id } };
  }
};

export const administratorAccess: NonNullable<CollectionConfig["access"]> = {
  admin: ({ req }) => isCmsStaff(req.user),
  create: superAdmin,
  update: superAdmin,
  delete: superAdmin,
  read: ({ req }) => {
    if (isCmsSuperAdmin(req.user)) return true;
    return isCmsStaff(req.user) ? { id: { equals: req.user!.id } } : false;
  }
};

export const orderAccess: NonNullable<CollectionConfig["access"]> = {
  create: deny,
  update: deny,
  delete: deny,
  read: ({ req }) => {
    if (isCmsStaff(req.user)) return true;
    if (req.user?.collection !== "users") return false;
    return { user: { equals: req.user.id } };
  }
};

const protectedCustomerFields = new Set([
  "email",
  "emailVerified",
  "role",
  "membershipStatus",
  "ticketTier",
  "phone",
  "phoneNumber",
  "phoneNumberVerified",
  "verified",
  "banned",
  "banReason",
  "banExpires"
]);

/** Applied after payload-auth generates fields so its own defaults cannot reopen writes. */
export function protectCustomerFields(fields: Field[]): Field[] {
  return fields.map((field) => {
    if (
      field.type !== "ui" &&
      field.type !== "join" &&
      "name" in field &&
      protectedCustomerFields.has(field.name)
    ) {
      return {
        ...field,
        access: {
          ...field.access,
          create: serverOwnedField,
          update: serverOwnedField
        }
      };
    }
    return field;
  });
}
