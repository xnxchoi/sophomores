import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres";

// Snapshot reconciliation only; no schema change. 20261127_033000_product_maximum_per_person (the editions cart's
// per-person caps) sorts before main's 20261127_100000_business_info_biz_num, so the lexically newest snapshot lacked the
// cap columns and the next generated migration would add them again. This migration's snapshot is cumulative (biz_num and
// both cap columns) and chains from 100000's. Both earlier migrations keep their identity: an owner-preview database has
// already applied 033000 by name (Auth-editions / Cordy HOLD, 27 Nov).
export async function up(_args: MigrateUpArgs): Promise<void> {}

export async function down(_args: MigrateDownArgs): Promise<void> {}
