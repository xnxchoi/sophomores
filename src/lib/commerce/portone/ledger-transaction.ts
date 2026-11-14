import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

const pools = new WeakMap<object, { bind: (client: unknown) => PostgresAdapter['drizzle']; pool: PostgresAdapter['pool'] }>()

export class KnownLedgerRejection extends Error {
  constructor(cause: unknown, readonly busy = false) { super('Ledger operation rejected without uncertain effects', { cause }) }
}

export class LedgerLockBusy extends Error {}

/** Reuse the installed adapter's exact Drizzle version, schema and native driver. */
function ledgerDatabase(adapter: PostgresAdapter, reportError: () => void) {
  const existing = pools.get(adapter)
  if (existing) return existing
  const fromAdapter = createRequire(createRequire(import.meta.url).resolve('@payloadcms/db-postgres'))
  const { drizzle } = fromAdapter('drizzle-orm/node-postgres') as {
    drizzle: (args: { client: unknown; schema: PostgresAdapter['schema'] }) => PostgresAdapter['drizzle']
  }
  const pool = new adapter.pg.Pool({ ...adapter.poolOptions, max: 2, connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 1000, allowExitOnIdle: true, statement_timeout: 5000, idle_in_transaction_session_timeout: 5000 })
  pool.on('error', reportError)
  const attached = new WeakSet<object>()
  pool.on('connect', client => {
    if (!attached.has(client)) { attached.add(client); client.on('error', reportError) }
  })
  const entry = { bind: (client: unknown) => drizzle({ client, schema: adapter.schema }), pool }
  pools.set(adapter, entry)
  return entry
}

export function getReconciliationPool(payload: PayloadRequest['payload']) {
  return ledgerDatabase(payload.db as unknown as PostgresAdapter, () => { payload.logger?.error({ msg: 'Reconciliation storage unavailable' }) }).pool
}

export async function closeReconciliationPool(payload: PayloadRequest['payload']): Promise<void> {
  const adapter = payload.db as unknown as PostgresAdapter
  const entry = pools.get(adapter)
  if (entry) { pools.delete(adapter); await entry.pool.end() }
}

/** Ledger Local API uses the real adapter's session registry, but never its settlement pool. */
export async function inLedgerTransaction<T>(req: PayloadRequest, work: () => Promise<T>): Promise<T> {
  const adapter = req.payload.db as unknown as PostgresAdapter
  // Inert test adapters have no actual pool. Production always uses the dedicated one.
  if (!adapter.pool) {
    const { inPaymentTransaction, paymentTransactionOutcome } = await import('../_shared/transaction')
    try { return await inPaymentTransaction(req, work) }
    catch (error) {
      if (paymentTransactionOutcome(req) === 'rolled-back') throw new KnownLedgerRejection(error, error instanceof LedgerLockBusy)
      throw error
    }
  }
  const entry = ledgerDatabase(adapter, () => { req.payload.logger?.error({ msg: 'Reconciliation storage unavailable' }) })
  const client = await entry.pool.connect().catch(error => { throw new KnownLedgerRejection(error, true) }) // No BEGIN or effects.
  const id = randomUUID(), sentinel = new Error('Ledger rollback'), completion = {}
  let rejection: unknown, rejected = false, entered = false, destroy = false
  try {
    const result = await entry.bind(client).transaction(async transaction => {
      entered = true
      adapter.sessions[id] = { db: transaction, resolve: async () => { throw new Error('Ledger owner only') }, reject: async () => { throw new Error('Ledger owner only') } }
      req.transactionID = id
      try { return { value: await work(), completion } }
      catch (error) { rejection = error; rejected = true; throw sentinel }
      finally { delete req.transactionID; delete adapter.sessions[id] }
    }).catch(error => {
      if (error === sentinel && rejected) throw new KnownLedgerRejection(rejection, rejection instanceof LedgerLockBusy)
      // No application callback ran: even an uncertain BEGIN has no ledger effects.
      destroy = true
      if (!entered) throw new KnownLedgerRejection(error)
      throw error
    })
    if (result.completion !== completion) { destroy = true; throw new Error('Ledger acknowledgement unavailable') }
    return result.value
  } finally { client.release(destroy) }
}
