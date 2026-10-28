import * as migration_20261026_071140 from './20261026_071140';
import * as migration_20261027_124500_auth_integrity from './20261027_124500_auth_integrity';

export const migrations = [
  {
    up: migration_20261026_071140.up,
    down: migration_20261026_071140.down,
    name: '20261026_071140'
  },
  {
    up: migration_20261027_124500_auth_integrity.up,
    down: migration_20261027_124500_auth_integrity.down,
    name: '20261027_124500_auth_integrity'
  }
];
