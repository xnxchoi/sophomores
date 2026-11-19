import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Config, type Payload, type Plugin } from "payload";
import { buildDefaultLocaleData } from "@/lib/teaser/home-page-defaults";
import { serverChosenIDContext } from "../server-chosen-ids";

/**
 * Makes sure the first home-page copy documents exist, as The Hideaway makes sure its required rows exist
 * (owner, 19 Nov: "the hideaway DOES have automatic hooks to ensure some things alwyas exist - light check on
 * start, then a seed if not"):
 *
 * - **At startup** (`homePageEnsurePlugin`): like The Hideaway's `onInit` (`src/payload.config.ts:144-185`
 *   there), the ensure is scheduled with `setTimeout(0)` and never awaited inside `onInit`, because creating
 *   documents while Payload is still initialising deadlocks (field hooks call `getPayload()` on the
 *   unfinished instance). Like its `ensureUncategorized` (`src/seed/initial.ts:151`), it checks first and
 *   creates only what's missing. Errors are logged and never reach boot.
 * - **By hand:** `scripts/seed-homepage-copies.ts` runs the same seed (`--force` replaces every copy).
 *
 * GET /api/globals/home-page never writes; it serves the built defaults until the copies exist.
 *
 * - **Light check:** one draft find, limit 1, depth 0. Nothing more happens when any copy exists.
 * - **Local API, one transaction:** both documents (EN create, then KO update) share one owning `req`, so a
 *   failed seed writes nothing and the next start or run tries again.
 * - **Concurrent-safe:** the documents have fixed, server-chosen ids (`server-chosen-ids.ts`). Two processes
 *   starting together clash on the primary key (the adapter reports a `ValidationError`); the loser rolls
 *   back, re-reads the id and stands down, so there are no duplicates.
 * - **Read-only database:** PostgreSQL refuses the write (SQLSTATE 25006): one warning, no throw.
 */
export const HOME_PAGE_SEED_IDS = {
  fallback: "0193f1d0-5eed-7000-8000-000000000001",
  published: "0193f1d0-5eed-7000-8000-000000000002",
} as const;

const SPECS = [
  { id: HOME_PAGE_SEED_IDS.fallback, name: "Effective Fallback Copy", isFallback: true, status: "draft" as const },
  { id: HOME_PAGE_SEED_IDS.published, name: "Published Webpage Copy", isFallback: false, status: "published" as const },
];

const codeOf = (error: unknown): string | undefined => {
  for (let current: unknown = error, depth = 0; current && depth < 4; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
};
/** SQLSTATE 25006: read_only_sql_transaction. The adapter rethrows it with the driver error as `cause`. */
export const isReadOnly = (error: unknown) => codeOf(error) === "25006";

export type HomePageSeedResult = "seeded" | "present" | "read-only" | "failed";

export async function seedInitialHomePage(payload: Payload): Promise<HomePageSeedResult> {
  try {
    const existing = await payload.find({ collection: "home-page", draft: true, limit: 1, depth: 0, overrideAccess: true });
    if (existing.totalDocs > 0) return "present";
  } catch (error) {
    payload.logger.error({ err: error, msg: "Home-page copy seed skipped: the copy could not be read." });
    return "failed";
  }

  const en = buildDefaultLocaleData("en");
  const ko = buildDefaultLocaleData("ko");
  const req = await createLocalReq({}, payload);
  const owns = await initTransaction(req);
  try {
    for (const spec of SPECS) {
      const created = await payload.create({
        collection: "home-page",
        req,
        locale: "en",
        overrideAccess: true,
        draft: spec.status === "draft",
        data: { id: spec.id, ...en, name: spec.name, isFallback: spec.isFallback, _status: spec.status } as never,
        context: { internalFallbackOp: true, ...serverChosenIDContext(spec.id) },
      });
      await payload.update({
        collection: "home-page",
        id: created.id,
        req,
        locale: "ko",
        overrideAccess: true,
        draft: spec.status === "draft",
        data: {
          ...ko,
          name: spec.name,
          isFallback: spec.isFallback,
          _status: spec.status,
          stories: ko.stories.map((story, index) => ({ id: created.stories?.[index]?.id, ...story })),
          messages: ko.messages.map((message, index) => ({ id: created.messages?.[index]?.id, ...message })),
        } as never,
        context: { internalFallbackOp: true },
      });
    }
    if (owns) await commitTransaction(req);
    return "seeded";
  } catch (error) {
    if (owns) await killTransaction(req);
    if (isReadOnly(error)) {
      payload.logger.warn("Home-page copy not seeded: the database is read-only. The route serves the built defaults.");
      return "read-only";
    }
    // Another process committed the same ids first: its seed is the one that counts.
    const winner = await payload.findByID({ collection: "home-page", id: HOME_PAGE_SEED_IDS.fallback, draft: true, depth: 0, overrideAccess: true, disableErrors: true }).catch(() => null);
    if (winner) return "present";
    payload.logger.error({ err: error, msg: "Home-page copy seed failed; the route serves the built defaults." });
    return "failed";
  }
}

/**
 * Adds the startup ensure after every `onInit` already in the config (the inline driver listeners, Better
 * Auth), scheduled outside `onInit`'s call stack as The Hideaway does. A plugin keeps the inline hook in
 * `payload.config.ts` self-contained (its tests run it in isolation).
 */
export const homePageEnsurePlugin: Plugin = (config: Config): Config => ({
  ...config,
  onInit: async (payload) => {
    await config.onInit?.(payload);
    setTimeout(() => {
      void seedInitialHomePage(payload).catch((error: unknown) => {
        payload.logger.error({ err: error, msg: "Home-page copy ensure failed; the route serves the built defaults." });
      });
    }, 0);
  },
});
