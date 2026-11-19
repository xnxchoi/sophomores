import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload } from "payload";
import { buildDefaultLocaleData } from "@/lib/teaser/home-page-defaults";
import { serverChosenIDContext } from "../server-chosen-ids";

/**
 * Seeds the first home-page copy documents: an explicit operator step, never a visitor request or startup.
 * That follows The Hideaway (owner, 19 Nov: "the hideaway repo has seed scripts"): its seed source
 * (`src/seed/initial.ts`) runs only when an operator rebuilds the seed, never in `onInit`, which it left
 * because seeding during Payload's initialisation deadlocks (`readmes/MIGRATIONS.md`, "Seeding mechanics").
 * Here the entry is `scripts/seed-homepage-copies.ts`. GET /api/globals/home-page serves the built defaults
 * until it has run.
 *
 * - **Idempotent:** nothing happens when any home-page document exists.
 * - **Local API, one transaction:** both documents (EN create, then KO update) share one owning `req`, so a
 *   failed seed writes nothing and can simply be run again.
 * - **Concurrent-safe:** the documents have fixed, server-chosen ids (`server-chosen-ids.ts`). A second run
 *   at the same moment clashes on the primary key (the adapter reports a `ValidationError`), rolls back,
 *   re-reads the id and stands down, so there are no duplicates.
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
