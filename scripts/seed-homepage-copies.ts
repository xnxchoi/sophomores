import { loadEnvConfig } from "@next/env";
import { HOME_PAGE_SEED_IDS, seedInitialHomePage } from "@/payload/seed/home-page";

loadEnvConfig(process.cwd());

// The explicit home-page seed (src/payload/seed/home-page.ts): the only way the first copies are written.
// Without --force it is idempotent and leaves existing copies alone. --force deletes every copy first.
async function main() {
  const force = process.argv.includes("--force");
  const { getPayload } = await import("@/payload");
  const payload = await getPayload();

  const existing = await payload.find({
    collection: "home-page",
    draft: true,
    limit: 100,
    overrideAccess: true,
  });

  if (existing.totalDocs > 0 && !force) {
    console.log(
      `Found ${existing.totalDocs} existing home-page copies. Pass --force to replace them.`
    );
    await payload.db?.destroy?.();
    return;
  }

  if (existing.totalDocs > 0 && force) {
    for (const doc of existing.docs) {
      await payload.delete({
        collection: "home-page",
        id: doc.id,
        overrideAccess: true,
      });
    }
    console.log(`Deleted ${existing.totalDocs} existing home-page copies.`);
  }

  const result = await seedInitialHomePage(payload);
  if (result === "read-only" || result === "failed") {
    await payload.db?.destroy?.();
    throw new Error(`Home-page copies not seeded (${result}).`);
  }
  console.log(`Home-page copies ${result === "seeded" ? "created" : "already present"}:`, HOME_PAGE_SEED_IDS);
  console.log("Seeding completed successfully.");
  await payload.db?.destroy?.();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
