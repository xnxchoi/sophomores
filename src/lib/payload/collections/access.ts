import { isCmsStaff } from "@/lib/auth/access";

export type MemberPrincipal = { id?: string; collection?: string } | null | undefined;

export const staffWrite = ({ req }: { req: { user?: unknown } }) => isCmsStaff(req.user);

export const staffField = ({ req }: { req: { user?: unknown } }) => isCmsStaff(req.user);

export const publishedOrStaff = ({ req }: { req: { user?: unknown } }) => {
  if (isCmsStaff(req.user)) return true;
  return { status: { equals: "published" } };
};
