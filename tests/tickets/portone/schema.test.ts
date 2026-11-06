import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Orders } from '../../../lib/payload/collections/Orders'

const migrationName = '20261106_000000_payment_safety'
const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')

test('Orders keeps durable retry fields nullable, unique where needed, and server-owned', () => {
  for (const name of ['prepareKey', 'prepareFingerprint']) {
    const field = Orders.fields.find((candidate) => 'name' in candidate && candidate.name === name)
    assert.ok(field && field.type === 'text', `${name} is a persisted text field`)
    assert.notEqual(field.required, true, 'legacy orders remain nullable without fabricated retry identity')
    assert.equal(field.unique === true, name === 'prepareKey')
    assert.equal(field.access?.create?.({} as never), false)
    assert.equal(field.access?.update?.({} as never), false)
  }
  const status = Orders.fields.find((field) => 'name' in field && field.name === 'status')
  assert.ok(status && status.type === 'select')
  assert.ok(status.options.some((option) => typeof option === 'object' && option.value === 'held'))
  assert.equal(status.access?.create?.({} as never), false)
  assert.equal(status.access?.update?.({} as never), false)
})

test('generated schema and types retain durable fields, unique index and held status', () => {
  const schema = read('payload-generated-schema.ts')
  assert.match(schema, /prepareKey:\s*varchar\("prepare_key"\)/)
  assert.match(schema, /prepareFingerprint:\s*varchar\("prepare_fingerprint"\)/)
  assert.match(schema, /uniqueIndex\("orders_prepare_key_idx"\)\.on\(columns\.prepareKey\)/)
  assert.match(schema, /enum_orders_status[\s\S]{0,200}"held"/)
  const types = read('lib/payload/payload-types.ts')
  assert.match(types, /prepareKey\?: string \| null/)
  assert.match(types, /prepareFingerprint\?: string \| null/)
  assert.match(types, /status: 'pending' \| 'paid' \| 'cancelled' \| 'refunded' \| 'held'/)
  const selection = types.slice(types.indexOf('export interface OrdersSelect'))
  assert.match(selection, /prepareKey\?: T/)
  assert.match(selection, /prepareFingerprint\?: T/)
})

test('payment snapshot chains previous history and changes only Orders retry storage and enum', () => {
  const previous = JSON.parse(read('migrations/20261103_070710_content_collections.json'))
  const snapshot = JSON.parse(read(`migrations/${migrationName}.json`))
  assert.equal(snapshot.prevId, previous.id)
  assert.notEqual(snapshot.id, previous.id)
  for (const [name, table] of Object.entries(previous.tables)) {
    if (name !== 'public.orders') assert.deepEqual(snapshot.tables[name], table, name)
  }
  const orders = structuredClone(snapshot.tables['public.orders'])
  for (const column of ['prepare_key', 'prepare_fingerprint']) {
    assert.deepEqual(orders.columns[column], { name: column, type: 'varchar', primaryKey: false, notNull: false })
    delete orders.columns[column]
  }
  assert.equal(orders.indexes.orders_prepare_key_idx.isUnique, true)
  assert.deepEqual(orders.indexes.orders_prepare_key_idx.columns.map((column: { expression: string }) => column.expression), ['prepare_key'])
  delete orders.indexes.orders_prepare_key_idx
  assert.deepEqual(orders, previous.tables['public.orders'])
  const enums = structuredClone(snapshot.enums)
  assert.deepEqual(enums['public.enum_orders_status'].values, [...previous.enums['public.enum_orders_status'].values, 'held'])
  enums['public.enum_orders_status'] = previous.enums['public.enum_orders_status']
  assert.deepEqual(enums, previous.enums)
  for (const section of ['schemas', 'sequences', 'roles', 'policies', 'views', '_meta']) assert.deepEqual(snapshot[section], previous[section])
})

test('registered additive migration never backfills retry authority and refuses unsafe down', () => {
  const index = read('migrations/index.ts')
  assert.match(index, new RegExp(`import \\* as migration_${migrationName} from './${migrationName}'`))
  assert.match(index, new RegExp(`name: '${migrationName}'`))
  const source = read(`migrations/${migrationName}.ts`)
  const up = source.slice(source.indexOf('export async function up'), source.indexOf('export async function down'))
  const down = source.slice(source.indexOf('export async function down'))
  assert.match(up, /ALTER TYPE (?:public\.)?enum_orders_status ADD VALUE 'held'/)
  assert.match(up, /ADD COLUMN prepare_key varchar/)
  assert.match(up, /ADD COLUMN prepare_fingerprint varchar/)
  assert.match(up, /CREATE UNIQUE INDEX orders_prepare_key_idx ON public\.orders\s*\(prepare_key\)/)
  assert.doesNotMatch(up, /\bUPDATE\b|\bDELETE\b|\bDROP\b/)
  assert.match(down, /LOCK TABLE public\.orders IN ACCESS EXCLUSIVE MODE/)
  assert.match(down, /status\s*=\s*'held'/)
  assert.match(down, /prepare_key IS NOT NULL/)
  assert.match(down, /prepare_fingerprint IS NOT NULL/)
  assert.ok(down.indexOf('RAISE EXCEPTION') < down.indexOf('DROP INDEX'), 'refusal precedes evidence removal')
  assert.doesNotMatch(down, /\bUPDATE\b|CASE WHEN/)
  assert.doesNotMatch(source, /(?:ALTER|DROP|UPDATE|DELETE FROM) (?:TABLE )?(?:public\.)?(?:users|accounts|sessions|phone_bindings)\b/i)
})
