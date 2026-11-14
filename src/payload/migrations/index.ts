import * as migration_20261026_071140 from './20261026_071140';
import * as migration_20261027_124500_auth_integrity from './20261027_124500_auth_integrity';
import * as migration_20261101_000000_canonical_members from './20261101_000000_canonical_members';
import * as migration_20261101_081527_canonical_auth_schema from './20261101_081527_canonical_auth_schema';
import * as migration_20261102_000000_recovery_intake from './20261102_000000_recovery_intake';
import * as migration_20261103_070710_content_collections from './20261103_070710_content_collections';
import * as migration_20261106_000000_payment_safety from './20261106_000000_payment_safety';
import * as migration_20261109_142834_payload_commerce from './20261109_142834_payload_commerce';
import * as migration_20261109_150000_commerce_resolution_conflicts from './20261109_150000_commerce_resolution_conflicts';
import * as migration_20261110_052422_setlists_collaborative_tracks from './20261110_052422_setlists_collaborative_tracks';
import * as migration_20261114_000000_commerce_reconciliation from './20261114_000000_commerce_reconciliation';

export const migrations = [
  {
    up: migration_20261026_071140.up,
    down: migration_20261026_071140.down,
    name: '20261026_071140',
  },
  {
    up: migration_20261027_124500_auth_integrity.up,
    down: migration_20261027_124500_auth_integrity.down,
    name: '20261027_124500_auth_integrity',
  },
  {
    up: migration_20261101_000000_canonical_members.up,
    down: migration_20261101_000000_canonical_members.down,
    name: '20261101_000000_canonical_members',
  },
  {
    up: migration_20261101_081527_canonical_auth_schema.up,
    down: migration_20261101_081527_canonical_auth_schema.down,
    name: '20261101_081527_canonical_auth_schema',
  },
  {
    up: migration_20261102_000000_recovery_intake.up,
    down: migration_20261102_000000_recovery_intake.down,
    name: '20261102_000000_recovery_intake',
  },
  {
    up: migration_20261103_070710_content_collections.up,
    down: migration_20261103_070710_content_collections.down,
    name: '20261103_070710_content_collections',
  },
  {
    up: migration_20261106_000000_payment_safety.up,
    down: migration_20261106_000000_payment_safety.down,
    name: '20261106_000000_payment_safety',
  },
  {
    up: migration_20261109_142834_payload_commerce.up,
    down: migration_20261109_142834_payload_commerce.down,
    name: '20261109_142834_payload_commerce',
  },
  {
    up: migration_20261109_150000_commerce_resolution_conflicts.up,
    down: migration_20261109_150000_commerce_resolution_conflicts.down,
    name: '20261109_150000_commerce_resolution_conflicts',
  },
  {
    up: migration_20261110_052422_setlists_collaborative_tracks.up,
    down: migration_20261110_052422_setlists_collaborative_tracks.down,
    name: '20261110_052422_setlists_collaborative_tracks'
  },
  {
    up: migration_20261114_000000_commerce_reconciliation.up,
    down: migration_20261114_000000_commerce_reconciliation.down,
    name: '20261114_000000_commerce_reconciliation',
  },
];
