import * as migration_20261026_071140 from './20261026_071140';
import * as migration_20261027_124500_auth_integrity from './20261027_124500_auth_integrity';
import * as migration_20261101_000000_canonical_members from './20261101_000000_canonical_members';
import * as migration_20261101_081527_canonical_auth_schema from './20261101_081527_canonical_auth_schema';
import * as migration_20261102_000000_recovery_intake from './20261102_000000_recovery_intake';

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
    name: '20261101_081527_canonical_auth_schema'
  },
  {
    up: migration_20261102_000000_recovery_intake.up,
    down: migration_20261102_000000_recovery_intake.down,
    name: '20261102_000000_recovery_intake',
  },
];
