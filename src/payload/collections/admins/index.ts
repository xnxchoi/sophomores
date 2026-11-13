import english from "../../../../messages/en.json";
import type { CollectionConfig } from "payload";
import { originCheckMiddleware } from "better-auth/api";
import type { getPayload } from "@/payload";
import { administratorAccess } from "@/lib/auth/access";
import { staffBetterAuthStrategy } from "@/lib/auth/staff-strategy";

export const Admins: CollectionConfig = {
  slug: "admins",
  auth: {
    disableLocalStrategy: true,
    strategies: [staffBetterAuthStrategy]
  },
  access: administratorAccess,
  hooks: {
    afterLogout: [async ({ req }) => {
      // The plugin hooks `users`, but CMS requests authenticate as `admins`.
      // Reuse canonical sign-out and its nextCookies plugin, not token parsing
      // or a second session/cookie deletion implementation.
      const payload = req.payload as Awaited<ReturnType<typeof getPayload>>;
      // Direct server APIs do not run Better Auth's HTTP-router CSRF middleware.
      const logoutContext = {
        context: await payload.betterAuth.$context,
        headers: req.headers,
        // Payload augments the incoming Web Request; its type makes cache optional.
        request: req as Request,
        path: "/sign-out",
      };
      await originCheckMiddleware(logoutContext);
      const result = await payload.betterAuth.api.signOut({ headers: req.headers });
      if (result.success !== true) throw new Error("Unable to end the staff session.");
    }],
  },
  admin: {
    useAsTitle: "email",
    group: english.Staff.schema.staffAdministration,
    description:
      english.Staff.schema.internalStaffAccountsAuthorizedToEditWebsiteCopy
  },
  fields: [
    {
      name: "email",
      type: "email",
      unique: true,
      required: true,
      index: true
    },
    {
      name: "name",
      type: "text",
      required: true
    },
    {
      name: "role",
      type: "select",
      defaultValue: "editor",
      options: [
        { label: english.Staff.schema.superAdmin, value: "admin" },
        { label: english.Staff.schema.editorialCopywriter, value: "editor" },
        { label: english.Staff.schema.eventHostDoorStaff, value: "staff" }
      ],
      required: true
    }
  ]
};
