import { loadEnvConfig } from "@next/env";
import type { Payload } from "payload";
import { HOME_PAGE_SEED_IDS, seedInitialHomePage } from "@/payload/seed/home-page";

// The home-page seed by hand (src/payload/seed/home-page.ts; startup runs the same ensure). Without --force it
// is idempotent and leaves existing copies alone. --force deletes every copy first.

type Run = {
  getPayload: () => Promise<Payload>;
  force: boolean;
  log?: (message: string) => void;
};

/** Seeds, then closes the database connections. Returns the exit code; throws nothing. */
export async function runHomePageSeed({ getPayload, force, log = console.log }: Run): Promise<0 | 1> {
  let payload: Payload | undefined;
  try {
    payload = await getPayload();
    const existing = await payload.find({ collection: "home-page", draft: true, limit: 100, overrideAccess: true });
    if (existing.totalDocs > 0 && !force) {
      log(`Found ${existing.totalDocs} existing home-page copies. Pass --force to replace them.`);
      return 0;
    }
    if (existing.totalDocs > 0) {
      for (const doc of existing.docs) await payload.delete({ collection: "home-page", id: doc.id, overrideAccess: true });
      log(`Deleted ${existing.totalDocs} existing home-page copies.`);
    }
    const result = await seedInitialHomePage(payload);
    if (result === "read-only" || result === "failed") {
      log(`Home-page copies not seeded (${result}).`);
      return 1;
    }
    log(`Home-page copies ${result === "seeded" ? "created" : "already present"}: ${JSON.stringify(HOME_PAGE_SEED_IDS)}`);
    return 0;
  } catch (error) {
    console.error("Seeding failed:", error);
    return 1;
  } finally {
    // As Payload's own CLI does after a script (payload/dist/bin/index.js: "close database connections ... so
    // process can exit cleanly"): destroy, then exit. The adapter's destroy alone leaves the pool's handles open.
    try { await payload?.destroy(); } catch { /* the exit below still ends the process */ }
  }
}

// Run directly (node --import tsx scripts/seed-homepage-copies.ts); importing it (the tests) runs nothing.
if (process.argv[1]?.endsWith("seed-homepage-copies.ts")) {
  loadEnvConfig(process.cwd());
  void runHomePageSeed({
    getPayload: async () => (await import("@/payload")).getPayload(),
    force: process.argv.includes("--force")
  }).then((code) => process.exit(code));
}
