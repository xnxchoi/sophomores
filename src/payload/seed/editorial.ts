import english from "../../../messages/en.json";
import korean from "../../../messages/ko.json";
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Config,
  type Payload,
  type Plugin
} from "payload";
import { lockGlobal } from "../globals/singleton-lock";
import { isReadOnly } from "./home-page";

/**
 * First values for the editorial globals, written once at startup the way the home page is
 * (`./home-page.ts`; owner, 19 Nov: "light check on start, then a seed if not").
 *
 * - **Light check:** a global that has ever been saved (it has `updatedAt`) is left alone, always.
 * - **Values:** today's copy, so moving it out of the catalogue changes nothing on the page. English comes from
 *   `messages/en.json`; Korean from `messages/ko.json`, verbatim, and only where the Korean is non-empty, so an
 *   untranslated field keeps showing English through Payload's locale fallback.
 * - **One fenced transaction** for both globals and both locales: it takes each global's write lock
 *   (`lockGlobal`, which Admin saves take too), re-reads, and writes only a global that was never saved. A failure writes nothing and the next
 *   start tries again. A read-only database gives one warning. Without its own transaction it writes nothing.
 */
const help = (messages: typeof english) => ({
  introduction: messages.Customer.app_site_help_page.introduction,
  topics: {
    shipping: messages.Customer.app_site_help_page.shipping.description,
    account: messages.Customer.app_site_help_page.account.description,
    shop: messages.Customer.app_site_help_page.shop.description
  },
  shipping: {
    introduction: messages.Customer.app_site_help_shipping_page.introduction
  }
});

/** The marketing title and description `(site)/layout.tsx` carried in code before this global. */
export const SITE_EDITORIAL_FIRST_VALUES = {
  siteTitle: "sophomores — experienced. not finished.",
  siteDescription:
    "A private social club. A first night. Something is taking shape."
} as const;

type Seed = {
  slug: "help-content" | "site-editorial";
  en: Record<string, unknown>;
  ko: Record<string, unknown>;
};

/** Keeps only non-empty strings, so an empty Korean value never overwrites the English fallback. */
export function nonEmpty(
  value: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    if (typeof field === "string") {
      if (field.length > 0) out[key] = field;
    } else if (field && typeof field === "object") {
      const nested = nonEmpty(field as Record<string, unknown>);
      if (Object.keys(nested).length > 0) out[key] = nested;
    }
  }
  return out;
}

export function editorialSeeds(): Seed[] {
  return [
    {
      slug: "help-content",
      en: help(english),
      ko: nonEmpty(help(korean as typeof english))
    },
    { slug: "site-editorial", en: { ...SITE_EDITORIAL_FIRST_VALUES }, ko: {} }
  ];
}

export type EditorialSeedResult = "seeded" | "present" | "read-only" | "failed";

const isSaved = (doc: unknown) => Boolean((doc as { updatedAt?: unknown } | null)?.updatedAt);

export async function seedEditorialGlobals(payload: Payload): Promise<EditorialSeedResult> {
  let pending: Seed[];
  try {
    const seeds = editorialSeeds();
    const saved = await Promise.all(seeds.map((seed) =>
      payload.findGlobal({ slug: seed.slug, depth: 0, overrideAccess: true }).then(isSaved)));
    pending = seeds.filter((_, index) => !saved[index]);
  } catch (error) {
    payload.logger.error({ err: error, msg: "Editorial globals not seeded: they could not be read." });
    return "failed";
  }
  if (pending.length === 0) return "present";

  let req: Awaited<ReturnType<typeof createLocalReq>> | undefined;
  let owns = false;
  try {
    req = await createLocalReq({}, payload);
    owns = await initTransaction(req);
    if (!owns) {
      payload.logger.error("Editorial globals not seeded: no transaction of its own to fence the write.");
      return "failed";
    }
    let wrote = false;
    for (const seed of pending) {
      // The lock every writer of this global takes before Payload reads it (`lockGlobalBeforeUpdate`): an
      // Admin save that started first commits, and this re-read sees it; one that starts later waits for us.
      await lockGlobal(req, seed.slug);
      if (isSaved(await payload.findGlobal({ slug: seed.slug, depth: 0, overrideAccess: true, req }))) continue;
      const context = { disableRevalidate: true };
      await payload.updateGlobal({ slug: seed.slug, locale: "en", data: seed.en as never, req, overrideAccess: true, context });
      if (Object.keys(seed.ko).length > 0) {
        await payload.updateGlobal({ slug: seed.slug, locale: "ko", data: seed.ko as never, req, overrideAccess: true, context });
      }
      wrote = true;
    }
    await commitTransaction(req);
    return wrote ? "seeded" : "present";
  } catch (error) {
    if (owns && req) await killTransaction(req);
    if (isReadOnly(error)) {
      payload.logger.warn("Editorial globals not seeded: the database is read-only. Their sections render empty.");
      return "read-only";
    }
    payload.logger.error({ err: error, msg: "Editorial globals seed failed; their sections render empty." });
    return "failed";
  }
}

/** Runs after every existing `onInit`, outside its call stack, as `homePageEnsurePlugin` does. */
export const editorialEnsurePlugin: Plugin = (config: Config): Config => ({
  ...config,
  onInit: async (payload) => {
    await config.onInit?.(payload);
    setTimeout(() => {
      void seedEditorialGlobals(payload).catch((error: unknown) => {
        payload.logger.error({
          err: error,
          msg: "Editorial globals ensure failed; their sections render empty."
        });
      });
    }, 0);
  }
});
