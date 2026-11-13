import type { Config } from "payload";

/** Staff auth must run before the customer Better Auth strategy, which would claim the session first. */
function withStaffAuthFirst(config: Config): Config["collections"] {
  const collections = [...(config.collections ?? [])];
  const adminIndex = collections.findIndex((collection) => collection.slug === "admins");
  if (adminIndex <= 0) return collections;
  const [admins] = collections.splice(adminIndex, 1);
  return admins ? [admins, ...collections] : collections;
}

/** Replaces the stock admin login view after payload-auth installs its own. */
export function staffCmsLoginPlugin(config: Config): Config {
  const views = config.admin?.components?.views;
  const current = views?.adminLogin;
  return {
    ...config,
    collections: withStaffAuthFirst(config),
    admin: {
      ...config.admin,
      components: {
        ...config.admin?.components,
        views: {
          ...views,
          adminLogin: {
            ...(current && typeof current === "object" ? current : {}),
            Component: "/payload/admin/staff-login#StaffLogin",
            path: "/login"
          }
        }
      }
    }
  };
}
