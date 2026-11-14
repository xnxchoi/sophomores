import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig, createLocalReq, getPayload, type PayloadRequest, type CollectionConfig } from 'payload'
import { commercePlugin } from '../../../src/lib/commerce/ecommerce'
import { commerceDomainPlugin } from '../../../src/lib/commerce/domain'
import { CommercePublication } from '../../../src/lib/commerce/catalogue'
import { up } from '../../../src/payload/migrations/20261114_000000_commerce_reconciliation'
import { capturePayloadTestLifecycle } from '../../support/payload-lifecycle'
import { payloadOnInit } from '../core/payload-on-init-fixture'
import type { ReconciliationIdentity } from '../../../src/lib/commerce/portone/accounting'
import type { Attempt } from '../core/payment-postgres-fixture'

export const target = { name: 'sphmrs-i2-c4-20261114-86c655af', volume: 'sphmrs-i2-c4-20261114-86c655af-data',
  port: 55491, database: 'i2_proof', url: 'postgres://postgres@127.0.0.1:55491/i2_proof' }

/** Real Payload/PG only, fixed isolated target, no application config or env loader. */
export async function openReconciliationDatabase(prepare = false) {
  const inspected = JSON.parse(execFileSync('docker', ['inspect', target.name], { encoding: 'utf8', maxBuffer: 65536 }))
  const c = inspected[0]
  assert.equal(c.Name, '/' + target.name)
  assert.equal(c.State.Running, true)
  assert.equal(c.Config.Env.includes('POSTGRES_DB=' + target.database), true)
  assert.deepEqual(c.HostConfig.PortBindings, { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: String(target.port) }] })
  assert.equal(c.HostConfig.Memory, 384 * 1024 * 1024)
  assert.equal(c.Mounts.some((m: { Name?: string; Destination: string }) => m.Name === target.volume && m.Destination === '/var/lib/postgresql/data'), true)
  const config = await buildConfig({ secret: randomUUID(), telemetry: false,
    admin: { user: 'admins', disable: true }, typescript: { autoGenerate: false }, onInit: payloadOnInit(),
    db: postgresAdapter({ pool: { connectionString: target.url, max: 5, connectionTimeoutMillis: 5000,
      options: '-c statement_timeout=15000 -c idle_in_transaction_session_timeout=15000' },
      idType: 'uuid', push: prepare, migrationDir: 'tests/commerce/portone' }),
    collections: [{ slug: 'admins', auth: true, fields: [] },
      { slug: 'users', fields: [{ name: 'email', type: 'email' }, { name: 'name', type: 'text' }] },
      { slug: 'media', upload: { disableLocalStorage: true }, fields: [] }],
    globals: [CommercePublication], plugins: [commercePlugin, commerceDomainPlugin,
      ...(prepare ? [(config: import('payload').Config) => ({ ...config,
        collections: config.collections?.filter((collection: CollectionConfig) => collection.slug !== 'commerce-reconciliations'),
      })] : [])],
  })
  const payload = await getPayload({ config, key: randomUUID() })
  const closePayload = capturePayloadTestLifecycle(payload)
  const close = async () => {
    const { closeReconciliationPool } = await import('../../../src/lib/commerce/portone/ledger-transaction')
    await closeReconciliationPool(payload); await closePayload()
  }
  if (prepare) {
    // Apply the shipped additive migration to the pre-I2 plugin schema, not hand-written seed DDL.
    await up({ db: payload.db.drizzle, payload, req: await createLocalReq({}, payload) })
  }
  return { payload, close }
}

export async function identityFor(req: PayloadRequest, f: Attempt): Promise<ReconciliationIdentity> {
  const { readReconciliationStart } = await import('../../../src/lib/commerce/portone/accounting')
  const { commerceSnapshotHash } = await import('../../../src/lib/commerce/snapshot-hash')
  return { transactionID: f.transactionID, paymentID: f.transactionID.replaceAll('-', ''), customerID: f.customerID,
    cartID: f.cartID, snapshotHash: commerceSnapshotHash(f.snapshot), startedAt: await readReconciliationStart(req, f.transactionID) }
}
