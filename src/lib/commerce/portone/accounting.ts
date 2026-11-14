import { createHash, randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'
import { z } from 'zod'
import { lockCommerce } from '../_shared/transaction'
import { withCommerceWrite } from '../access'
import { reconciliationPolicy as policy } from './policy'
import { minimalPaymentRiskProof } from './proof'
import { CompletedProviderResponse } from '../../tickets/portone/runtime'
import { inLedgerTransaction, KnownLedgerRejection, LedgerLockBusy } from './ledger-transaction'

const count = z.int().nonnegative()
export const reconciliationIdentitySchema = z.strictObject({ transactionID: z.uuid(), paymentID: z.string().regex(/^[a-f0-9]{32}$/),
  customerID: z.string().min(1), cartID: z.string().min(1), snapshotHash: z.string().regex(/^[a-f0-9]{64}$/), startedAt: count })
export type ReconciliationIdentity = z.infer<typeof reconciliationIdentitySchema>
export type ReconciliationKind = 'confirm' | 'resume' | 'retire' | 'risk'
const activeSchema = z.strictObject({ token: z.uuid(), generation: count, kind: z.enum(['confirm', 'resume', 'retire', 'risk']),
  bucket: z.enum(['ordinary', 'risk']), remaining: count, dispatched: count, expiresAt: count, state: z.enum(['running', 'unknown']) })
export const attemptAccountingSchema = z.strictObject({ identity: reconciliationIdentitySchema, generation: count,
  ordinaryUsed: count, riskUsed: count, nextCheckAt: count, escalation: z.enum(['budget', 'lifetime', 'unresolved', 'ownership', 'review']).optional(),
  riskEvents: z.array(z.strictObject({ id: z.string().min(1).max(2048), type: z.string().max(80) })).max(16),
  seenRiskEvents: z.array(z.string().min(1).max(2048)).max(16).optional(),
  events: z.array(z.strictObject({ id: z.string().min(1).max(2048), type: z.string().min(1).max(80) })).max(64).default([]),
  riskProofs: z.array(z.strictObject({ hash: z.string().regex(/^[a-f0-9]{64}$/), proof: z.unknown().transform(minimalPaymentRiskProof) })).max(16).default([]),
  active: activeSchema.optional(), last: z.strictObject({ generation: count, outcome: z.enum(['completed', 'review', 'unknown']) }).optional() })
export type AttemptAccounting = z.infer<typeof attemptAccountingSchema>
export const gateSchema = z.strictObject({ dispatchedAt: z.array(count), reservations: z.array(z.strictObject({ token: z.uuid(), customerID: z.string().min(1), remaining: count, expiresAt: count })) })
type Gate = z.infer<typeof gateSchema>
type Scope = { identity: ReconciliationIdentity; token: string; generation: number; payload: PayloadRequest['payload']; poisoned: boolean; riskOnly: boolean }
const owners = new WeakMap<PayloadRequest, Scope>()
// Only the verified-webhook dispatcher calls this server boundary. No body/context flag is read.
const riskCapabilities = new WeakMap<PayloadRequest, { id: string; type: string }>()
export async function withSignedRiskEvidence<T>(req: PayloadRequest, event: { id: string; type: string }, work: () => Promise<T>): Promise<T> {
  const { isVerifiedCommerceWebhook } = await import('./endpoints')
  if (!isVerifiedCommerceWebhook(req) || !['Transaction.Cancelled', 'Transaction.PartialCancelled', 'Transaction.DisputeCreated', 'Transaction.DisputeResolved'].includes(event.type)) {
    throw new Error('Authenticated risk event required')
  }
  const evidence = z.object({ id: z.string().min(1).max(2048), type: z.string().max(80) }).parse(event)
  riskCapabilities.set(req, evidence)
  try { return await work() } finally { riskCapabilities.delete(req) }
}

const attemptKey = (id: string) => `reconciliation-attempt:${id}`
const globalKey = 'reconciliation-provider-global'
type LedgerRow = { id: string; state: unknown }
async function read(req: PayloadRequest, scope: string): Promise<LedgerRow | undefined> {
  const found = await req.payload.find({ collection: 'commerce-reconciliations', req, overrideAccess: true, depth: 0, limit: 2,
    where: { scope: { equals: scope } } })
  if (found.docs.length > 1 || (found.totalDocs !== undefined && found.totalDocs !== found.docs.length)) throw new Error('Ambiguous reconciliation ledger')
  return found.docs[0] as LedgerRow | undefined
}
async function save(req: PayloadRequest, scope: string, row: LedgerRow | undefined, state: unknown): Promise<void> {
  await withCommerceWrite(req, async () => {
    if (row) {
      const generation = scope.startsWith('reconciliation-attempt:') ? attemptAccountingSchema.parse(row.state).generation : undefined
      // Payload Local API bulk update selects by WHERE, then writes by id only.
      // The installed native adapter's atomic option preserves the generation on UPDATE.
      const validated = generation === undefined ? gateSchema.parse(state) : attemptAccountingSchema.parse(state)
      const result = await req.payload.db.updateOne({ collection: 'commerce-reconciliations', req,
        where: { and: [{ id: { equals: row.id } }, ...(generation === undefined ? [] : [{ 'state.generation': { equals: generation } }])] },
        options: { atomic: true }, data: { state: validated, updatedAt: new Date().toISOString() } })
      if (!result) throw new Error('Reconciliation generation changed')
    }
    else await req.payload.create({ collection: 'commerce-reconciliations', req, overrideAccess: true, data: { scope, state: state as never } })
  })
}

/** Short Local API/native transactions; never borrow a settlement's session or lock. */
async function atomic<T>(req: PayloadRequest, payload: PayloadRequest['payload'], keys: string[], work: (local: PayloadRequest, now: number) => Promise<T>): Promise<T> {
  // A capability projection, not a clone of native Request internals or caller context.
  const local = { payload, user: req.user, headers: req.headers, i18n: req.i18n, locale: req.locale, context: {} } as PayloadRequest
  return inLedgerTransaction(local, async () => {
    const adapter = local.payload.db as unknown as PostgresAdapter
    const session = adapter.sessions[String(await local.transactionID)]
    for (const key of [...new Set(keys)].sort()) {
      const locked = await session.db.execute(sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${`commerce:${key}`}, 0)) AS reconciliation_locked`)
      if (locked.rows[0]?.reconciliation_locked !== true) throw new LedgerLockBusy('Reconciliation busy')
    }
    const result = await session.db.execute(sql`SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::text AS reconciliation_now`)
    const now = count.parse(Number(result.rows[0]?.reconciliation_now))
    return work(local, now)
  })
}
const cleanGate = (gate: Gate, now: number): Gate => ({ dispatchedAt: gate.dispatchedAt.filter(at => at > now - 1000),
  reservations: gate.reservations.filter(slot => slot.expiresAt > now && slot.remaining > 0) })
const freshAttempt = (identity: ReconciliationIdentity): AttemptAccounting => ({ identity, generation: 0, ordinaryUsed: 0,
  riskUsed: 0, nextCheckAt: 0, riskEvents: [], events: [], riskProofs: [] })
function exact(state: AttemptAccounting, identity: ReconciliationIdentity): void {
  if (JSON.stringify(state.identity) !== JSON.stringify(identity)) throw new Error('Reconciliation identity changed')
}

export const reconciliationCatchupSchema = z.strictObject({ identity: reconciliationIdentitySchema, token: z.uuid(), generation: count,
  recordedAt: count, outcome: z.enum(['completed', 'review', 'unknown']).optional(),
  risk: z.strictObject({ hash: z.string().regex(/^[a-f0-9]{64}$/), proof: z.unknown().transform(minimalPaymentRiskProof) }).optional() })

// Feature-local retry: native timers, no installed retry utility or equivalent ledger helper.
// Only failed try-locks retry; connection failures and uncertain acknowledgements do not.
async function retryCompletionBusy<T>(work: () => Promise<T>): Promise<T> {
  const backoff = [25, 50, 100, 150, 200, 250, 300, 400]
  const deadline = performance.now() + 2000
  for (let attempt = 0; ; attempt++) {
    try { return await work() } catch (error) {
      if (!(error instanceof KnownLedgerRejection) || !(error.cause instanceof LedgerLockBusy) || attempt >= backoff.length
        || performance.now() + backoff[attempt] > deadline) throw error
      await delay(backoff[attempt])
    }
  }
}

/** Immutable per-token evidence writes need neither the attempt nor the global lock. */
async function recordCatchup(req: PayloadRequest, scope: Scope, data: { outcome?: 'completed' | 'review' | 'unknown'; risk?: { hash: string; proof: unknown } }): Promise<'completed' | 'review' | 'unknown' | undefined> {
  return atomic(req, scope.payload, [], async (local, now) => {
    const row = await read(local, attemptKey(scope.identity.transactionID))
    const state = attemptAccountingSchema.parse(row?.state)
    exact(state, scope.identity)
    if (!state.active || state.active.token !== scope.token || state.active.generation !== scope.generation) throw new Error('Stale catch-up writer')
    const outcome = data.outcome && (scope.poisoned || state.active.state === 'unknown' || now >= state.active.expiresAt ? 'unknown' : data.outcome)
    const key = data.risk ? `reconciliation-risk:${scope.identity.transactionID}:${scope.token}:${data.risk.hash}`
      : `reconciliation-completion:${scope.identity.transactionID}:${scope.token}`
    if (!await read(local, key)) await withCommerceWrite(local, () => local.payload.create({ collection: 'commerce-reconciliations', req: local,
      overrideAccess: true, data: { scope: key, state: reconciliationCatchupSchema.parse({ identity: scope.identity,
        token: scope.token, generation: scope.generation, recordedAt: now, ...data, outcome }) as never } }))
    return outcome
  })
}

async function catchupRisk(local: PayloadRequest, state: AttemptAccounting): Promise<AttemptAccounting> {
  if (!state.active) return state
  const prefix = `reconciliation-risk:${state.identity.transactionID}:${state.active.token}:`
  const found = await local.payload.find({ collection: 'commerce-reconciliations', req: local, overrideAccess: true, depth: 0,
    limit: 17, where: { scope: { contains: prefix } } })
  let riskProofs = state.riskProofs
  if (found.docs.length > 16 || (found.totalDocs ?? 0) > 16) throw new Error('Risk catch-up capacity exceeded')
  for (const row of found.docs) {
    const marker = reconciliationCatchupSchema.parse(row.state)
    exact(state, marker.identity)
    if (marker.token !== state.active.token || marker.generation !== state.generation || !marker.risk) throw new Error('Invalid risk catch-up marker')
    if (!riskProofs.some(item => item.hash === marker.risk!.hash)) riskProofs = [...riskProofs, marker.risk]
  }
  return attemptAccountingSchema.parse({ ...state, riskProofs })
}
export type AdmissionDecision = { decision: 'busy' | 'started' | 'join' | 'ownership-unknown' | 'budget-stop' | 'lifetime-stop' | 'review-required' | 'rate-stop' | 'cooldown';
  generation: number; nextCheckAt: number; bucket?: 'ordinary' | 'risk' }

/** Whole-operation budget and shared capacity are committed before any GET. */
export async function admitReconciliation(req: PayloadRequest, raw: ReconciliationIdentity, kind: ReconciliationKind,
  ledgerPayload: PayloadRequest['payload'] = req.payload, options: { automatic?: boolean } = {}): Promise<AdmissionDecision> {
  if (await req.transactionID || owners.has(req)) throw new Error('Reconciliation requires its own operation')
  const identity = reconciliationIdentitySchema.parse(raw)
  if (identity.paymentID !== identity.transactionID.replaceAll('-', '') || req.user?.collection !== 'users' || String(req.user.id) !== identity.customerID) throw new Error('Reconciliation owner mismatch')
  const token = randomUUID()
  let result: AdmissionDecision
  try { result = await atomic(req, ledgerPayload, [attemptKey(identity.transactionID), globalKey], async (local, now) => {
    const row = await read(local, attemptKey(identity.transactionID))
    let state = row ? attemptAccountingSchema.parse(row.state) : freshAttempt(identity)
    exact(state, identity)
    const signed = riskCapabilities.get(req)
    const risk = signed && !(state.seenRiskEvents ?? state.riskEvents.map(event => event.id)).includes(signed.id) ? signed : undefined
    const decision = async (value: AdmissionDecision['decision'], updated = state) => {
      await save(local, attemptKey(identity.transactionID), row, updated)
      return { decision: value, generation: updated.generation, nextCheckAt: updated.nextCheckAt, bucket: updated.active?.bucket }
    }
    if (state.active) {
      state = await catchupRisk(local, state)
      const completion = await read(local, `reconciliation-completion:${identity.transactionID}:${state.active!.token}`)
      if (completion) {
        const marker = reconciliationCatchupSchema.parse(completion.state)
        exact(state, marker.identity)
        if (marker.token !== state.active!.token || marker.generation !== state.generation || !marker.outcome) throw new Error('Invalid completion marker')
        if (marker.outcome === 'unknown') state = { ...state, active: { ...state.active!, state: 'unknown' }, escalation: 'ownership' }
        if (marker.outcome !== 'unknown' && marker.recordedAt < state.active!.expiresAt) {
          const gateRow = await read(local, globalKey)
          const gate = cleanGate(gateSchema.parse(gateRow?.state), now)
          await save(local, globalKey, gateRow, { ...gate, reservations: gate.reservations.filter(slot => slot.token !== marker.token) })
          state = { ...state, active: undefined, last: { generation: marker.generation, outcome: marker.outcome },
            nextCheckAt: marker.recordedAt + policy.recheckDelaysMs[Math.min(state.generation - 1, policy.recheckDelaysMs.length - 1)],
            escalation: marker.outcome === 'review' ? 'review' : state.ordinaryUsed >= policy.ordinaryGets ? 'budget'
              : state.escalation === 'ownership' ? undefined : state.escalation }
        }
      }
    }
    if (state.active) {
      if (state.active.state === 'unknown' || now >= state.active.expiresAt) return decision('ownership-unknown',
        { ...state, active: { ...state.active, state: 'unknown' }, escalation: 'ownership' })
      return decision('join')
    }
    if (now >= identity.startedAt + policy.lifetimeMs) return decision('lifetime-stop', { ...state, escalation: 'lifetime' })
    if (options.automatic && now >= identity.startedAt + policy.escalationMs && !risk) return decision('review-required', { ...state, escalation: 'unresolved' })
    if (options.automatic && state.escalation && !risk) return decision('review-required')
    if (options.automatic && state.nextCheckAt > now && !risk) return decision('cooldown')
    const needed = kind === 'confirm' ? 2 : 1
    const bucket = state.ordinaryUsed + needed <= policy.ordinaryGets ? 'ordinary' : risk && kind === 'risk' && state.riskUsed + needed <= policy.riskGets ? 'risk' : undefined
    if (!bucket) return decision('budget-stop', { ...state, escalation: 'budget' })
    const gateRow = await read(local, globalKey)
    const gate = cleanGate(gateRow ? gateSchema.parse(gateRow.state) : { dispatchedAt: [], reservations: [] }, now)
    if (gate.reservations.some(slot => slot.customerID === identity.customerID)) return decision('rate-stop')
    if (gate.dispatchedAt.length + gate.reservations.reduce((sum, slot) => sum + slot.remaining, 0) + needed > policy.globalGetsPerSecond) return decision('rate-stop')
    const generation = state.generation + 1
    const expiresAt = Math.min(now + (needed + 1) * policy.providerDeadlineMs + 60_000, identity.startedAt + policy.lifetimeMs)
    await save(local, globalKey, gateRow, { ...gate, reservations: [...gate.reservations, { token, customerID: identity.customerID, remaining: needed, expiresAt }] })
    return decision('started', { ...state,
      seenRiskEvents: risk ? [...(state.seenRiskEvents ?? state.riskEvents.map(event => event.id)), risk.id].slice(-16) : state.seenRiskEvents,
      riskEvents: bucket === 'risk' && risk ? [...state.riskEvents, risk].slice(-16) : state.riskEvents, generation,
      active: { token, generation, kind, bucket, remaining: needed, dispatched: 0, expiresAt, state: 'running' } })
  }) } catch (error) {
    if (error instanceof KnownLedgerRejection) return { decision: error.busy ? 'busy' : 'review-required', generation: 0, nextCheckAt: 0 }
    throw error
  }
  if (result.decision === 'started') owners.set(req, { identity, token, generation: result.generation, payload: ledgerPayload, poisoned: false, riskOnly: result.bucket === 'risk' })
  return result
}

export const hasReconciliationOwner = (req: PayloadRequest): boolean => owners.has(req)

/** A timed-out transport may still be running. Its operation remains fenced/unknown. */
export async function accountedProviderGet(req: PayloadRequest, paymentID: string, get: () => Promise<unknown>): Promise<unknown> {
  await debitProviderGet(req, paymentID)
  const scope = owner(req)
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([Promise.resolve().then(get), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Provider GET outcome unknown')), policy.providerDeadlineMs)
    })])
  } catch (error) { if (!(error instanceof CompletedProviderResponse)) scope.poisoned = true; throw error }
  finally { if (timer) clearTimeout(timer) }
}

function owner(req: PayloadRequest): Scope {
  const scope = owners.get(req)
  if (!scope || scope.poisoned) throw new Error('Reconciliation ownership unavailable')
  if (req.user?.collection !== 'users' || String(req.user.id) !== scope.identity.customerID) throw new Error('Reconciliation owner changed')
  return scope
}
function fence(state: AttemptAccounting, scope: Scope, now: number): void {
  exact(state, scope.identity)
  if (!state.active || state.active.token !== scope.token || state.active.generation !== scope.generation || state.active.state !== 'running'
    || now >= state.active.expiresAt || now >= state.identity.startedAt + policy.lifetimeMs) throw new Error('Reconciliation fence rejected')
}

/** Each GET has its own durable debit; only unacknowledged debits poison ownership. */
export async function debitProviderGet(req: PayloadRequest, paymentID: string): Promise<void> {
  const scope = owner(req)
  if (paymentID !== scope.identity.paymentID) throw new Error('Reconciliation payment mismatch')
  try {
    await atomic(req, scope.payload, [attemptKey(scope.identity.transactionID), globalKey], async (local, now) => {
      const row = await read(local, attemptKey(scope.identity.transactionID))
      const state = attemptAccountingSchema.parse(row?.state)
      fence(state, scope, now)
      const active = state.active!
      if (!active.remaining) throw new Error('Operation GET reservation exhausted')
      const gateRow = await read(local, globalKey)
      const gate = cleanGate(gateSchema.parse(gateRow?.state), now)
      const reservation = gate.reservations.find(slot => slot.token === scope.token)
      if (!reservation?.remaining || gate.dispatchedAt.length >= policy.globalGetsPerSecond) throw new Error('Global GET ceiling')
      await save(local, globalKey, gateRow, { ...gate, dispatchedAt: [...gate.dispatchedAt, now],
        reservations: gate.reservations.map(slot => slot.token === scope.token ? { ...slot, remaining: slot.remaining - 1 } : slot) })
      await save(local, attemptKey(scope.identity.transactionID), row, { ...state,
        ordinaryUsed: state.ordinaryUsed + (active.bucket === 'ordinary' ? 1 : 0), riskUsed: state.riskUsed + (active.bucket === 'risk' ? 1 : 0),
        active: { ...active, remaining: active.remaining - 1, dispatched: active.dispatched + 1 } })
    })
  } catch (error) { if (!(error instanceof KnownLedgerRejection)) scope.poisoned = true; throw error }
}

/** Validated risk outlives settlement/quarantine rollback, without cards or raw disputes. */
export async function retainReconciliationRisk(req: PayloadRequest, evidence: unknown): Promise<void> {
  const scope = owner(req)
  const proof = minimalPaymentRiskProof(evidence)
  if (proof.id !== scope.identity.paymentID || proof.customer.id !== scope.identity.customerID) throw new Error('Risk journal identity mismatch')
  const hash = createHash('sha256').update(JSON.stringify(proof)).digest('hex')
  try { await retryCompletionBusy(() => atomic(req, scope.payload, [attemptKey(scope.identity.transactionID)], async (local) => {
    const row = await read(local, attemptKey(scope.identity.transactionID))
    const state = attemptAccountingSchema.parse(row?.state)
    exact(state, scope.identity)
    if (!state.active || state.active.token !== scope.token || state.active.generation !== scope.generation) throw new Error('Stale risk journal writer')
    if (state.riskProofs.some(item => item.hash === hash)) return
    if (state.riskProofs.length >= policy.ordinaryGets + policy.riskGets) throw new Error('Risk journal capacity exhausted')
    await save(local, attemptKey(scope.identity.transactionID), row, { ...state, riskProofs: [...state.riskProofs, { hash, proof }] })
  })) } catch (error) {
    if (!(error instanceof KnownLedgerRejection) || !error.busy) throw error
    await recordCatchup(req, scope, { risk: { hash, proof } })
  }
}

/** Use the financial session for effect fencing; no independent lock is held over it. */
export async function assertReconciliationFence(req: PayloadRequest): Promise<void> {
  const scope = owner(req)
  const validate = async (local: PayloadRequest, now: number) => {
    const row = await read(local, attemptKey(scope.identity.transactionID))
    fence(attemptAccountingSchema.parse(row?.state), scope, now)
  }
  if (await req.transactionID) {
    await lockCommerce(req, [attemptKey(scope.identity.transactionID)])
    const adapter = req.payload.db as unknown as PostgresAdapter
    const result = await adapter.sessions[String(await req.transactionID)].db.execute(sql`SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::text AS reconciliation_now`)
    await validate(req, count.parse(Number(result.rows[0]?.reconciliation_now)))
  } else await atomic(req, scope.payload, [attemptKey(scope.identity.transactionID)], validate)
}

/** Only an acknowledged caller end may release remaining capacity; unknown never does. */
export async function endReconciliation(req: PayloadRequest, outcome: 'completed' | 'review' | 'unknown'): Promise<'completed' | 'review' | 'unknown'> {
  const scope = owners.get(req)
  if (!scope || await req.transactionID) throw new Error('Reconciliation completion unavailable')
  try {
    return await retryCompletionBusy(() => atomic(req, scope.payload, [attemptKey(scope.identity.transactionID), globalKey], async (local, now) => {
      const row = await read(local, attemptKey(scope.identity.transactionID))
      const state = await catchupRisk(local, attemptAccountingSchema.parse(row?.state))
      exact(state, scope.identity)
      if (!state.active || state.active.token !== scope.token || state.active.generation !== scope.generation) throw new Error('Stale reconciliation completion')
      const unknown = outcome === 'unknown' || scope.poisoned || now >= state.active.expiresAt || state.active.state === 'unknown'
      if (unknown) {
        await save(local, attemptKey(scope.identity.transactionID), row, { ...state, active: { ...state.active, state: 'unknown' }, escalation: 'ownership', last: { generation: scope.generation, outcome: 'unknown' } })
        return 'unknown' as const
      }
      const gateRow = await read(local, globalKey)
      const gate = cleanGate(gateSchema.parse(gateRow?.state), now)
      await save(local, globalKey, gateRow, { ...gate, reservations: gate.reservations.filter(slot => slot.token !== scope.token) })
      const exhausted = state.ordinaryUsed >= policy.ordinaryGets
      await save(local, attemptKey(scope.identity.transactionID), row, { ...state, active: undefined,
        nextCheckAt: now + (policy.recheckDelaysMs[Math.min(state.generation - 1, policy.recheckDelaysMs.length - 1)]),
        escalation: outcome === 'review' ? 'review' : exhausted ? 'budget' : state.escalation,
        last: { generation: scope.generation, outcome } })
      return outcome
    }))
  } catch (error) {
    if (error instanceof KnownLedgerRejection && error.busy) {
      return (await recordCatchup(req, scope, { outcome }))!
    }
    if (error instanceof KnownLedgerRejection) throw error
    // A failed ledger acknowledgement must itself leave a durable catch-up marker.
    try {
      await atomic(req, scope.payload, [attemptKey(scope.identity.transactionID)], async local => {
        const row = await read(local, attemptKey(scope.identity.transactionID))
        const state = attemptAccountingSchema.parse(row?.state)
        if (state.generation !== scope.generation) throw new Error('Stale completion recovery')
        await save(local, attemptKey(scope.identity.transactionID), row, { ...state, escalation: 'ownership',
          active: state.active ? { ...state.active, state: 'unknown' } : undefined })
      })
    } catch { req.payload.logger?.error({ msg: 'Reconciliation ownership requires catch-up', cause: 'ledger-recovery-unavailable' }) }
    throw error
  } finally { owners.delete(req) }
}

/** Authenticated ingress is independent of GET admission; risk evidence is never pruned. */
export async function recordReconciliationEvent(req: PayloadRequest, identity: ReconciliationIdentity, event: { id: string; type: string }): Promise<void> {
  const { isVerifiedCommerceWebhook } = await import('./endpoints')
  if (!isVerifiedCommerceWebhook(req)) throw new Error('Authenticated event required')
  await atomic(req, req.payload, [attemptKey(identity.transactionID)], async local => {
    const row = await read(local, attemptKey(identity.transactionID))
    const state = row ? attemptAccountingSchema.parse(row.state) : freshAttempt(identity)
    exact(state, identity)
    if (state.events.some(item => item.id === event.id)) return
    const oldestPaid = state.events.findIndex(item => item.type === 'Transaction.Paid')
    if (state.events.length >= 64 && oldestPaid < 0) {
      // Preserve an all-risk inline journal; roll further ingress into immutable rows.
      const scope = `reconciliation-event:${identity.transactionID}:${createHash('sha256').update(event.id).digest('hex')}`
      if (!await read(local, scope)) await withCommerceWrite(local, () => local.payload.create({ collection: 'commerce-reconciliations',
        req: local, overrideAccess: true, data: { scope, state: { identity, event } } }))
      return
    }
    const events = state.events.length < 64 ? state.events : state.events.filter((_, index) => index !== oldestPaid)
    await save(local, attemptKey(identity.transactionID), row, { ...state, events: [...events, event] })
  })
}

export function assertOrdinaryReconciliation(req: PayloadRequest): void {
  const scope = owner(req)
  if (scope.riskOnly) throw new Error('Risk reserve cannot authorize ordinary settlement')
}

/** Both timestamps originate in PostgreSQL, not an application-clock projection. */
export async function readReconciliationStart(req: PayloadRequest, transactionID: string): Promise<number> {
  return atomic(req, req.payload, [], async local => {
    const adapter = local.payload.db as unknown as PostgresAdapter
    const result = await adapter.sessions[String(await local.transactionID)].db.execute(sql`
      SELECT floor(extract(epoch FROM created_at) * 1000)::text AS reconciliation_started
      FROM transactions WHERE id = ${transactionID}::uuid`)
    return count.parse(Number(result.rows[0]?.reconciliation_started))
  })
}

export const reconciliationEventSchema = z.strictObject({ identity: reconciliationIdentitySchema,
  event: z.strictObject({ id: z.string().min(1).max(2048), type: z.enum(['Transaction.Paid', 'Transaction.Cancelled', 'Transaction.PartialCancelled', 'Transaction.DisputeCreated', 'Transaction.DisputeResolved']) }) })
