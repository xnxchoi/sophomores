import { randomUUID } from 'node:crypto'
import type { PayloadRequest } from 'payload'
import { nativeTransactionFixture } from '../core/native-transaction-fixture'
import { admitReconciliation, type AttemptAccounting, type ReconciliationIdentity } from '../../../src/lib/commerce/portone/accounting'

/** Inert Local API/native-control fixture. Database durability is tested separately. */
export async function admissionFixture(overrides: Partial<ReconciliationIdentity> = {}, initialNow = 1_800_000_000_000) {
  let now = initialNow
  const transactionID = randomUUID()
  const identity: ReconciliationIdentity = { transactionID, paymentID: transactionID.replaceAll('-', ''), customerID: 'fixture-customer',
    cartID: 'fixture-cart', snapshotHash: 'a'.repeat(64), startedAt: now, ...overrides }
  const rows = new Map<string, { id: string; scope: string; state: unknown }>()
  let snapshot = structuredClone(rows)
  let rejectCommit = false
  let locksAvailable: boolean | ((key: string) => boolean) = true
  const native = await nativeTransactionFixture({
    onQuery: (kind) => {
      if (kind === 'begin') snapshot = structuredClone(rows)
      if (kind === 'rollback') { rows.clear(); for (const [key, value] of snapshot) rows.set(key, value) }
      if (kind === 'commit' && rejectCommit) { rejectCommit = false; throw new Error('Synthetic native commit rejection') }
    }, queryRows: (text, values) => text.includes('reconciliation_started') ? [{ reconciliation_started: String(identity.startedAt) }]
      : text.includes('reconciliation_locked') ? [{ reconciliation_locked: typeof locksAvailable === 'function' ? locksAvailable(String(values[0])) : locksAvailable }] : text.includes('reconciliation_now') ? [{ reconciliation_now: String(now) }] : [],
  })
  const payload = { ...native.req.payload,
    find: async ({ where }: { where: { scope: { equals?: string; contains?: string } } }) => {
      const docs = [...rows.values()].filter(row => where.scope.equals ? row.scope === where.scope.equals : row.scope.includes(where.scope.contains!)).map(row => structuredClone(row))
      return { docs, totalDocs: docs.length }
    },
    create: async ({ data }: { data: { scope: string; state: unknown } }) => {
      const row = { id: randomUUID(), ...structuredClone(data) }; rows.set(row.id, row); return row
    },
    update: async ({ id, where, data }: { id?: string; where?: { and: { id?: { equals: string } }[] }; data: { state: unknown } }) => {
      const key = id ?? where!.and[0].id!.equals
      const row = { ...rows.get(key)!, ...structuredClone(data) }; rows.set(key, row); return id ? row : { docs: [row] }
    },
  } as unknown as PayloadRequest['payload']
  payload.db.updateOne = (async ({ where, data }: { where: { and: { id?: { equals: string }; 'state.generation'?: { equals: number } }[] }; data: { state: unknown } }) => {
    const id = where.and[0].id!.equals, row = rows.get(id)
    const generation = where.and.find(part => part['state.generation'])?.['state.generation']?.equals
    if (!row || generation !== undefined && (row.state as AttemptAccounting).generation !== generation) return null
    const updated = { ...row, ...structuredClone(data) }; rows.set(id, updated); return updated
  }) as unknown as typeof payload.db.updateOne
  const other = () => ({ payload, headers: new Headers(), user: { id: identity.customerID, collection: 'users' }, context: {} }) as PayloadRequest
  const req = other()
  const attempt = () => structuredClone([...rows.values()].find(row => row.scope === `reconciliation-attempt:${identity.transactionID}`)?.state) as AttemptAccounting
  const seed = (patch: Partial<AttemptAccounting>) => {
    const existing = [...rows.values()].find(row => row.scope === `reconciliation-attempt:${identity.transactionID}`)
    const base: AttemptAccounting = existing ? attempt() : { identity, generation: 0, ordinaryUsed: 0, riskUsed: 0,
      nextCheckAt: 0, riskEvents: [], events: [], riskProofs: [] }
    const state: AttemptAccounting = { ...base, ...patch }
    const row = { id: existing?.id ?? randomUUID(), scope: `reconciliation-attempt:${identity.transactionID}`, state }
    rows.set(row.id, row)
  }
  return { req, other, identity, attempt, seed, rows, queries: native.queries, advance: (ms: number) => { now += ms }, failCommit: () => { rejectCommit = true },
    setLocksAvailable: (available: typeof locksAvailable) => { locksAvailable = available } }
}

/** Existing focused business tests get an independent inert ledger, not a budget bypass. */
export async function installAccounting(req: PayloadRequest, identity: Omit<ReconciliationIdentity, 'startedAt'>) {
  const now = Date.now()
  const f = await admissionFixture({ ...identity, startedAt: now }, now)
  const find = req.payload.find
  req.payload.find = ((args: Parameters<typeof find>[0]) => args.collection === 'commerce-reconciliations'
    ? f.req.payload.find(args) : find(args)) as typeof find
  await admitReconciliation(req, f.identity, 'confirm', f.req.payload)
  return f
}

/** Endpoint tests exercise admission itself against the business fixture's native adapter. */
export function installEndpointLedger(req: PayloadRequest) {
  const rows = new Map<string, { id: string; scope: string; state: unknown }>()
  const payload = req.payload
  const find = payload.find, create = payload.create, update = payload.update
  payload.find = (async (args: Parameters<typeof find>[0]) => {
    if (args.collection !== 'commerce-reconciliations') return find(args)
    const where = args.where as { scope: { equals: string } }
    const docs = [...rows.values()].filter(row => row.scope === where.scope.equals).map(row => structuredClone(row))
    return { docs, totalDocs: docs.length }
  }) as typeof find
  payload.create = (async (args: Parameters<typeof create>[0]) => {
    if (args.collection !== 'commerce-reconciliations') return create(args)
    const row = { id: randomUUID(), ...structuredClone(args.data) } as { id: string; scope: string; state: unknown }
    rows.set(row.id, row); return row
  }) as typeof create
  payload.update = (async (args: Parameters<typeof update>[0]) => {
    if (args.collection !== 'commerce-reconciliations') return update(args)
    const id = String('id' in args && args.id ? args.id : ((args as unknown as { where: { and: { id: { equals: string } }[] } }).where).and[0].id.equals)
    const row = { ...rows.get(id)!, ...structuredClone(args.data as { state: unknown }) }
    rows.set(id, row); return 'id' in args && args.id ? row : { docs: [row] }
  }) as typeof update
  const updateOne = payload.db.updateOne
  payload.db.updateOne = (async (args: Parameters<typeof updateOne>[0]) => {
    if (args.collection !== 'commerce-reconciliations') return updateOne(args)
    const where = args.where as { and: { id: { equals: string } }[] }
    const id = where.and[0].id.equals
    const row = { ...rows.get(id)!, ...structuredClone(args.data) }
    rows.set(id, row); return row
  }) as typeof updateOne
  return rows
}
