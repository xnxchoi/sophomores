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
    find: async ({ where, limit }: { where: { scope?: { equals?: string; contains?: string };
      and?: { scope?: { equals?: string; contains?: string }; 'state.identity.customerID'?: { equals: string } }[] }; limit?: number }) => {
      const scope = where.scope ?? where.and?.find(part => part.scope)?.scope
      const customer = where.and?.find(part => part['state.identity.customerID'])?.['state.identity.customerID']?.equals
      const docs = [...rows.values()].filter(row =>
        (scope?.equals ? row.scope === scope.equals : row.scope.includes(scope?.contains ?? '')) &&
        (!customer || (row.state as { identity?: ReconciliationIdentity }).identity?.customerID === customer))
      return { docs: docs.slice(0, limit).map(row => structuredClone(row)), totalDocs: docs.length }
    },
    create: async ({ data }: { data: { scope: string; state: unknown } }) => {
      const row = { id: randomUUID(), ...structuredClone(data) }; rows.set(row.id, row); return row
    },
    update: async ({ collection, id, where, data }: { collection?: string; id?: string; where?: { and: { id?: { equals: string } }[] }; data: { state: unknown } }) => {
      // Only ledger rows live here; other collections' updates (such as the transaction) are not ledger rows.
      if (collection && collection !== 'commerce-reconciliations') return { id, ...structuredClone(data) }
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
