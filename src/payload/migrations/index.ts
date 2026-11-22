import * as migration_20261121_011000_key_grant_hardening from './20261121_011000_key_grant_hardening';
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
import * as migration_20261114_085802_business_info from './20261114_085802_business_info';
import * as migration_20261114_210340_key_grant_intents from './20261114_210340_key_grant_intents';
import * as migration_20261118_091841_ds05_native_edition_display from './20261118_091841_ds05_native_edition_display';
import * as migration_20261119_123904_team_members from './20261119_123904_team_members';
import * as migration_20261119_190000_commerce_order_payment_unique from './20261119_190000_commerce_order_payment_unique';
import * as migration_20261120_021117_editorial_globals from './20261120_021117_editorial_globals';
import * as migration_20261120_062810_policy_locales from './20261120_062810_policy_locales';
import * as migration_20261122_061613_setlist_curator_grant from './20261122_061613_setlist_curator_grant';
import * as migration_20261122_065037_wallet_catch_up from './20261122_065037_wallet_catch_up';
import * as migration_20261122_153000_nfc_storage from './20261122_153000_nfc_storage';
import * as migration_20261122_160000_setlist_entries_running_order from './20261122_160000_setlist_entries_running_order';
import * as migration_20261122_160100_native_edition_settlement from './20261122_160100_native_edition_settlement';

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
    name: '20261110_052422_setlists_collaborative_tracks',
  },
  {
    up: migration_20261114_000000_commerce_reconciliation.up,
    down: migration_20261114_000000_commerce_reconciliation.down,
    name: '20261114_000000_commerce_reconciliation',
  },
  {
    up: migration_20261114_085802_business_info.up,
    down: migration_20261114_085802_business_info.down,
    name: '20261114_085802_business_info',
  },
  {
    up: migration_20261114_210340_key_grant_intents.up,
    down: migration_20261114_210340_key_grant_intents.down,
    name: '20261114_210340_key_grant_intents',
  },
  {
    up: migration_20261118_091841_ds05_native_edition_display.up,
    down: migration_20261118_091841_ds05_native_edition_display.down,
    name: '20261118_091841_ds05_native_edition_display',
  },
  {
    up: migration_20261119_123904_team_members.up,
    down: migration_20261119_123904_team_members.down,
    name: '20261119_123904_team_members',
  },
  {
    up: migration_20261119_190000_commerce_order_payment_unique.up,
    down: migration_20261119_190000_commerce_order_payment_unique.down,
    name: '20261119_190000_commerce_order_payment_unique',
  },
  {
    up: migration_20261120_021117_editorial_globals.up,
    down: migration_20261120_021117_editorial_globals.down,
    name: '20261120_021117_editorial_globals',
  },
  {
    up: migration_20261120_062810_policy_locales.up,
    down: migration_20261120_062810_policy_locales.down,
    name: '20261120_062810_policy_locales'
  },
  {
    up: migration_20261121_011000_key_grant_hardening.up,
    down: migration_20261121_011000_key_grant_hardening.down,
    name: '20261121_011000_key_grant_hardening',
  },
  {
    up: migration_20261122_061613_setlist_curator_grant.up,
    down: migration_20261122_061613_setlist_curator_grant.down,
    name: '20261122_061613_setlist_curator_grant',
  },
  {
    up: migration_20261122_065037_wallet_catch_up.up,
    down: migration_20261122_065037_wallet_catch_up.down,
    name: '20261122_065037_wallet_catch_up',
  },
  {
    up: migration_20261122_153000_nfc_storage.up,
    down: migration_20261122_153000_nfc_storage.down,
    name: '20261122_153000_nfc_storage',
  },
  {
    up: migration_20261122_160000_setlist_entries_running_order.up,
    down: migration_20261122_160000_setlist_entries_running_order.down,
    name: '20261122_160000_setlist_entries_running_order',
  },
  {
    up: migration_20261122_160100_native_edition_settlement.up,
    down: migration_20261122_160100_native_edition_settlement.down,
    name: '20261122_160100_native_edition_settlement',
  },
];
