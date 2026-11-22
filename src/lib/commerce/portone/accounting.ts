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
const retainedProof = z.strictObject({ hash: z.string().regex(/^[a-f0-9]{64}$/),
  proof: z.unknown().transform(minimalPaymentRiskProof), holdOnly: z.literal(true).optional() })
export const attemptAccountingSchema = z.strictObject({ identity: reconciliationIdentitySchema, generation: count,
  ordinaryUsed: count, riskUsed: count, nextCheckAt: count, escalation: z.enum(['budget', 'lifetime', 'unresolved', 'ownership', 'review']).optional(),
  riskEvents: z.array(z.strictObject({ id: z.string().min(1).max(2048), type: z.string().max(80) })).max(16),
  seenRiskEvents: z.array(z.string().min(1).max(2048)).max(16).optional(),
  events: z.array(z.strictObject({ id: z.string().min(1).max(2048), type: z.string().min(1).max(80) })).max(64).default([]),
  riskProofs: z.array(retainedProof).max(16).default([]),
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
export const reconciliationEventScope = (transactionID: string, eventID: string) =>
  `reconciliation-event:${transactionID}:${createHash('sha256').update(eventID).digest('hex')}`
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
  risk: retainedProof.optional() })

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
async function recordCatchup(req: PayloadRequest, scope: Scope, data: { outcome?: 'completed' | 'review' | 'unknown'; risk?: z.infer<typeof retainedProof> }): Promise<'completed' | 'review' | 'unknown' | undefined> {
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
    if (marker.token !== state.active.token || marker.generation !== state.generation || !marker.risk || marker.outcome ||
        row.scope !== prefix + marker.risk.hash) throw new Error('Invalid risk catch-up marker')
    const proof = marker.risk
    if (!riskProofs.some(item => item.hash === proof.hash)) riskProofs = [...riskProofs, proof]
  }
  return attemptAccountingSchema.parse({ ...state, riskProofs })
}
export type AdmissionDecision = { decision: 'busy' | 'started' | 'join' | 'ownership-unknown' | 'budget-stop' | 'lifetime-stop' | 'review-required' | 'rate-stop' | 'cooldown';
  generation: number; nextCheckAt: number; bucket?: 'ordinary' | 'risk' }

/** Whole-operation budget and shared capacity are committed before any GET. */
export async function admitReconciliation(req: PayloadRequest, raw: ReconciliationIdentity, kind: ReconciliationKind,
  ledgerPayload: PayloadRequest['payload'] = req.payload, options: { automatic?: boolean; boundedRecheck?: boolean; quarantineOnly?: boolean } = {}): Promise<AdmissionDecision> {
  if (await req.transactionID || owners.has(req)) throw new Error('Reconciliation requires its own operation')
  const identity = reconciliationIdentitySchema.parse(raw)
  if (identity.paymentID !== identity.transactionID.replaceAll('-', '') || req.user?.collection !== 'users' || String(req.user.id) !== identity.customerID) throw new Error('Reconciliation owner mismatch')
  const { verifiedCommerceEvent } = await import('./endpoints')
  const event = verifiedCommerceEvent(req)
  const paid = kind === 'confirm' && event?.type === 'Transaction.Paid' ? event : undefined
  if (options.quarantineOnly && !paid) throw new Error('Signed Paid required for review admission')
  const token = randomUUID()
  let result: AdmissionDecision
  try { result = await atomic(req, ledgerPayload, [attemptKey(identity.transactionID), globalKey,
    ...(kind === 'resume' || kind === 'retire' ? [paidReviewCustomerLock(identity.customerID)] : [])], async (local, now) => {
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
    if ((kind === 'retire' || kind === 'resume') &&
        (state.riskProofs.some(item => item.holdOnly) || await hasPaidReviewCase(local, identity))) {
      return decision('review-required', { ...state, escalation: 'review' })
    }
    if (options.automatic && now >= identity.startedAt + policy.escalationMs && !risk) return decision('review-required', { ...state, escalation: 'unresolved' })
    if (options.automatic && state.escalation && !risk) return decision('review-required')
    if ((options.automatic || options.boundedRecheck) && state.nextCheckAt > now && !risk) return decision('cooldown')
    const ordinaryNeeded = kind === 'confirm' && !options.quarantineOnly ? 2 : 1
    const paidReserve = paid && !(state.seenRiskEvents ?? state.riskEvents.map(event => event.id)).includes(paid.id)
    const bucket = state.ordinaryUsed + ordinaryNeeded <= policy.ordinaryGets ? 'ordinary'
      : ((risk && kind === 'risk') || paidReserve) && state.riskUsed < policy.riskGets ? 'risk' : undefined
    if (!bucket) return decision('budget-stop', { ...state, escalation: 'budget' })
    const needed = bucket === 'risk' ? 1 : ordinaryNeeded
    const reserveEvent = risk ?? (bucket === 'risk' && paidReserve ? paid : undefined)
    const gateRow = await read(local, globalKey)
    const gate = cleanGate(gateRow ? gateSchema.parse(gateRow.state) : { dispatchedAt: [], reservations: [] }, now)
    if (gate.reservations.some(slot => slot.customerID === identity.customerID)) return decision('rate-stop')
    if (gate.dispatchedAt.length + gate.reservations.reduce((sum, slot) => sum + slot.remaining, 0) + needed > policy.globalGetsPerSecond) return decision('rate-stop')
    const generation = state.generation + 1
    const leaseMs = options.boundedRecheck ? policy.foregroundWaitMs : (needed + 1) * policy.providerDeadlineMs + 60_000
    const expiresAt = Math.min(now + leaseMs, identity.startedAt + policy.lifetimeMs)
    await save(local, globalKey, gateRow, { ...gate, reservations: [...gate.reservations, { token, customerID: identity.customerID, remaining: needed, expiresAt }] })
    return decision('started', { ...state,
      seenRiskEvents: reserveEvent ? [...(state.seenRiskEvents ?? state.riskEvents.map(event => event.id)), reserveEvent.id].slice(-16) : state.seenRiskEvents,
      riskEvents: bucket === 'risk' && reserveEvent ? [...state.riskEvents, reserveEvent].slice(-16) : state.riskEvents, generation,
      active: { token, generation, kind, bucket, remaining: needed, dispatched: 0, expiresAt, state: 'running' } })
  }) } catch (error) {
    if (error instanceof KnownLedgerRejection) return { decision: error.busy ? 'busy' : 'review-required', generation: 0, nextCheckAt: 0 }
    throw error
  }
  if (result.decision === 'started') owners.set(req, { identity, token, generation: result.generation, payload: ledgerPayload, poisoned: false, riskOnly: result.bucket === 'risk' || options.quarantineOnly === true })
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
export async function retainReconciliationRisk(req: PayloadRequest, evidence: unknown, holdOnly = false): Promise<void> {
  const scope = owner(req)
  const proof = minimalPaymentRiskProof(evidence)
  if (proof.id !== scope.identity.paymentID || proof.customer.id !== scope.identity.customerID) throw new Error('Risk journal identity mismatch')
  const hash = createHash('sha256').update(JSON.stringify(holdOnly ? [proof, 'hold-only'] : proof)).digest('hex')
  const entry = { hash, proof, ...(holdOnly ? { holdOnly: true as const } : {}) }
  try { await retryCompletionBusy(() => atomic(req, scope.payload, [attemptKey(scope.identity.transactionID)], async (local) => {
    const row = await read(local, attemptKey(scope.identity.transactionID))
    const state = attemptAccountingSchema.parse(row?.state)
    exact(state, scope.identity)
    if (!state.active || state.active.token !== scope.token || state.active.generation !== scope.generation) throw new Error('Stale risk journal writer')
    if (state.riskProofs.some(item => item.hash === hash)) return
    if (state.riskProofs.length >= policy.ordinaryGets + policy.riskGets) throw new Error('Risk journal capacity exhausted')
    await save(local, attemptKey(scope.identity.transactionID), row, { ...state, riskProofs: [...state.riskProofs, entry] })
  })) } catch (error) {
    if (!(error instanceof KnownLedgerRejection) || !error.busy) throw error
    await recordCatchup(req, scope, { risk: entry })
  }
}

export async function readUnresolvedSettlementProof(req: PayloadRequest) {
  const scope = owner(req)
  return atomic(req, scope.payload, [], async (local, now) => {
    const state = attemptAccountingSchema.parse((await read(local, attemptKey(scope.identity.transactionID)))?.state)
    fence(state, scope, now)
    return state.riskProofs.find(item => item.holdOnly)?.proof
  })
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
      if (state.active.kind === 'confirm') {
        // last is a coordination cursor; keep the acknowledged result separately.
        const key = `reconciliation-completion:${scope.identity.transactionID}:${scope.token}`
        await withCommerceWrite(local, () => local.payload.create({ collection: 'commerce-reconciliations', req: local,
          overrideAccess: true, data: { scope: key, state: reconciliationCatchupSchema.parse({
            identity: scope.identity, token: scope.token, generation: scope.generation,
            recordedAt: now, outcome: unknown ? 'unknown' : outcome,
          }) } }))
      }
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
export async function recordReconciliationEvent(req: PayloadRequest, identity: ReconciliationIdentity, event: { id: string; type: string }, openPaidCase = false): Promise<void> {
  const { verifiedCommerceEvent } = await import('./endpoints')
  const verified = verifiedCommerceEvent(req)
  if (verified?.id !== event.id || verified.type !== event.type ||
      (openPaidCase && event.type !== 'Transaction.Paid')) throw new Error('Authenticated event required')
  const write = () => atomic(req, req.payload, [attemptKey(identity.transactionID),
    ...(openPaidCase ? [paidReviewCustomerLock(identity.customerID)] : [])], async (local, now) => {
    const row = await read(local, attemptKey(identity.transactionID))
    const state = row ? attemptAccountingSchema.parse(row.state) : freshAttempt(identity)
    exact(state, identity)
    if (openPaidCase) await savePaidReviewCase(local, identity, event.id, 'signed-paid-pending', now)
    const historical = state.events.find(item => item.id === event.id)
    if (historical) {
      if (historical.type !== event.type) throw new Error('Webhook identity mismatch')
      return
    }
    const eventScope = reconciliationEventScope(identity.transactionID, event.id)
    const existing = await read(local, eventScope)
    if (existing) {
      const saved = reconciliationEventSchema.parse(existing.state)
      if (JSON.stringify(saved.identity) !== JSON.stringify(identity) || saved.event.id !== event.id ||
          saved.event.type !== event.type) throw new Error('Webhook identity mismatch')
      return
    }
    if (event.type === 'Transaction.Paid' || state.events.length >= 64) {
      // Preserve existing evidence without evicting any historical entries.
      await withCommerceWrite(local, () => local.payload.create({ collection: 'commerce-reconciliations', req: local,
        overrideAccess: true, data: { scope: eventScope, state: reconciliationEventSchema.parse({ identity, event }) } }))
      return
    }
    await save(local, attemptKey(identity.transactionID), row, { ...state, events: [...state.events, event] })
  })
  // Only replay a known lock rejection; ambiguous ingress commits remain errors.
  await (openPaidCase ? retryCompletionBusy(write) : write())
}

export const settlementObservationSchema = z.strictObject({
  identity: reconciliationIdentitySchema, token: z.uuid(), generation: count,
  sequence: z.int().min(1).max(2), recordedAt: count,
  observation: z.enum(['provider-paid', 'verified-failure', 'provider-ready', 'provider-not-found',
    'provider-unsupported', 'review-required', 'integrity-stop', 'completion-unknown']),
})

export async function appendSettlementObservation(req: PayloadRequest,
  observation: z.infer<typeof settlementObservationSchema>['observation']): Promise<void> {
  const scope = owners.get(req)
  if (!scope || scope.riskOnly || req.user?.collection !== 'users' ||
      String(req.user.id) !== scope.identity.customerID) throw new Error('Ordinary reconciliation required')
  await retryCompletionBusy(() => atomic(req, scope.payload, [attemptKey(scope.identity.transactionID)], async (local, now) => {
    const row = await read(local, attemptKey(scope.identity.transactionID))
    const state = attemptAccountingSchema.parse(row?.state)
    fence(state, scope, now)
    const sequence = state.active!.dispatched
    if (state.active!.kind !== 'confirm' || !sequence) throw new Error('Observation dispatch mismatch')
    const key = `reconciliation-observation:${scope.identity.transactionID}:${scope.token}:${sequence}`
    const evidence = settlementObservationSchema.parse({ identity: scope.identity, token: scope.token,
      generation: scope.generation, sequence, recordedAt: now, observation })
    await withCommerceWrite(local, () => local.payload.create({ collection: 'commerce-reconciliations', req: local,
      overrideAccess: true, data: { scope: key, state: evidence } }))
  }))
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

// One immutable operator case per attempt. A signed signal is not charge proof
// and cannot move funds or displace an unknown native owner.
export const paidReviewCaseSchema = z.strictObject({
  identity: reconciliationIdentitySchema,
  eventID: z.string().min(1).max(2048),
  reason: z.enum(['budget-stop', 'lifetime-stop', 'ownership-unknown', 'review-required', 'signed-paid-pending']),
  recordedAt: count,
})
export const paidReviewScope = (transactionID: string) => `reconciliation-paid-review:${transactionID}`

// The verified terminal disposition of an attempt. Each distinct verified full
// cancellation appends one immutable record with the next sequence, written in
// the cancellation's own transaction under the attempt lock that signed-Paid
// ingress also takes. The Paid case itself is never edited.
const PAID_DISPOSITION_LIMIT = 64
const PAID_EVENT_LIMIT = 256
export const paidDispositionSchema = z.strictObject({
  identity: reconciliationIdentitySchema.omit({ startedAt: true }),
  sequence: z.int().min(1).max(PAID_DISPOSITION_LIMIT),
  disposition: z.literal('verified-full-cancellation'),
  evidenceID: z.string().min(1).max(2048),
  // A resolution conflict already present is settled by this cancellation; a later one is not.
  conflictAtCancellation: z.boolean(),
  // Signed Paid events recorded before this cancellation; any other Paid is a fresh contradiction.
  paidEventsAtCancellation: z.array(z.string().min(1).max(2048)).max(PAID_EVENT_LIMIT),
  // Contradiction records before this cancellation; a later one reopens the case.
  contradictionsAtCancellation: count,
  recordedAt: count,
})
export const paidDispositionScope = (transactionID: string, sequence: number) => `reconciliation-paid-disposition:${transactionID}:${sequence}`

// Authoritative evidence that contradicts a terminal attempt (the write that raises a
// resolution conflict), kept apart from the sticky conflict flag so that a contradiction
// observed after a verified cancellation is visible even when the flag was already set.
const PAYMENT_CONTRADICTION_LIMIT = 64
export const paymentContradictionSchema = z.strictObject({
  identity: reconciliationIdentitySchema.omit({ startedAt: true }),
  sequence: z.int().min(1).max(PAYMENT_CONTRADICTION_LIMIT),
  evidenceID: z.string().min(1).max(2048),
  // The same evidence observed again after a newer cancellation is a new contradiction.
  afterDispositions: count,
  recordedAt: count,
})
export const paymentContradictionScope = (transactionID: string, sequence: number) => `reconciliation-paid-contradiction:${transactionID}:${sequence}`

export async function recordPaidReviewCase(req: PayloadRequest, identity: ReconciliationIdentity,
  eventID: string, reason: z.infer<typeof paidReviewCaseSchema>['reason']): Promise<void> {
  const { verifiedCommerceEvent } = await import('./endpoints')
  const event = verifiedCommerceEvent(req)
  if (event?.type !== 'Transaction.Paid' || event.id !== eventID || req.user?.collection !== 'users' || String(req.user.id) !== identity.customerID) {
    throw new Error('Verified Paid case required')
  }
  await retryCompletionBusy(() => atomic(req, req.payload, [paidReviewCustomerLock(identity.customerID)],
    (local, now) => savePaidReviewCase(local, identity, eventID, reason, now)))
}

// Sorts before the reconciliation attempt lock; use this order in financial transactions too.
export const paidReviewCustomerLock = (customerID: string) => `paid-review-customer:${customerID}`

async function savePaidReviewCase(req: PayloadRequest, identity: ReconciliationIdentity,
  eventID: string, reason: z.infer<typeof paidReviewCaseSchema>['reason'], now: number): Promise<void> {
  const scope = paidReviewScope(identity.transactionID)
  const existing = await read(req, scope)
  if (existing) {
    if (JSON.stringify(paidReviewCaseSchema.parse(existing.state).identity) !== JSON.stringify(identity)) throw new Error('Paid review identity mismatch')
    return
  }
  const state = paidReviewCaseSchema.parse({ identity, eventID, reason, recordedAt: now })
  await withCommerceWrite(req, () => req.payload.create({ collection: 'commerce-reconciliations', req,
    overrideAccess: true, data: { scope, state } }))
}

/** A short read/decision transaction after the provider call; never holds locks over transport. */
export async function withPaidReviewDecision<T>(req: PayloadRequest, customerID: string, decide: (local: PayloadRequest) => Promise<T>): Promise<T> {
  return atomic(req, req.payload, [paidReviewCustomerLock(customerID)], decide)
}

export const PAID_REVIEW_LIMIT = 100

/** Read at most one extra to detect overflow rather than hiding old cases. */
export async function listPaidReviewCases(req: PayloadRequest, customerID: string) {
  const result = await req.payload.find({ collection: 'commerce-reconciliations', req, overrideAccess: true, depth: 0,
    limit: PAID_REVIEW_LIMIT + 1, where: { and: [
      { scope: { contains: 'reconciliation-paid-review:' } }, { 'state.identity.customerID': { equals: customerID } },
    ] } })
  if (result.docs.length > PAID_REVIEW_LIMIT || (result.totalDocs ?? result.docs.length) !== result.docs.length) {
    throw new Error('Paid review queue exceeds the recovery bound')
  }
  return result.docs.map(row => {
    const { identity } = paidReviewCaseSchema.parse(row.state)
    if (row.scope !== paidReviewScope(identity.transactionID) || identity.customerID !== customerID ||
        identity.paymentID !== identity.transactionID.replaceAll('-', '')) throw new Error('Paid review identity mismatch')
    return identity
  })
}

type ResultIdentity = Omit<ReconciliationIdentity, 'startedAt'>

export function assertResultIdentity(identity: ResultIdentity, expected: ResultIdentity): void {
  if (identity.transactionID !== expected.transactionID || identity.paymentID !== expected.paymentID ||
      identity.customerID !== expected.customerID || identity.cartID !== expected.cartID ||
      identity.snapshotHash !== expected.snapshotHash) throw new Error('Payment review identity mismatch')
}

// Read committed evidence without taking ownership, merging a catch-up row, or
// interpreting uncertain rollback as authority to touch the financial tables.
export async function hasRetainedSettlementRisk(req: PayloadRequest, expected: ResultIdentity): Promise<boolean> {
  const row = await read(req, attemptKey(expected.transactionID))
  if (!row) return false
  const state = attemptAccountingSchema.parse(row.state)
  assertResultIdentity(state.identity, expected)
  const evidence = await catchupRisk(req, state)
  const held = evidence.riskProofs.filter(item => item.holdOnly)
  for (const { proof, hash } of held) {
    if (proof.id !== expected.paymentID || proof.customer.id !== expected.customerID ||
        hash !== createHash('sha256').update(JSON.stringify([proof, 'hold-only'])).digest('hex')) {
      throw new Error('Retained settlement proof mismatch')
    }
  }
  return held.length > 0
}

async function listPaidDispositions(req: PayloadRequest, identity: ResultIdentity) {
  const found = await req.payload.find({ collection: 'commerce-reconciliations', req, overrideAccess: true, depth: 0,
    limit: PAID_DISPOSITION_LIMIT + 1, where: { scope: { contains: `reconciliation-paid-disposition:${identity.transactionID}:` } } })
  if (found.docs.length > PAID_DISPOSITION_LIMIT || found.totalDocs !== found.docs.length) throw new Error('Payment dispositions exceed the bound')
  const dispositions = found.docs.map(row => {
    const disposition = paidDispositionSchema.parse(row.state)
    assertResultIdentity(disposition.identity, identity)
    if (row.scope !== paidDispositionScope(identity.transactionID, disposition.sequence)) throw new Error('Payment disposition scope mismatch')
    return disposition
  }).sort((a, b) => a.sequence - b.sequence)
  if (dispositions.some((disposition, index) => disposition.sequence !== index + 1)) throw new Error('Payment disposition sequence gap')
  return dispositions
}

async function listPaymentContradictions(req: PayloadRequest, identity: ResultIdentity) {
  const found = await req.payload.find({ collection: 'commerce-reconciliations', req, overrideAccess: true, depth: 0,
    limit: PAYMENT_CONTRADICTION_LIMIT + 1, where: { scope: { contains: `reconciliation-paid-contradiction:${identity.transactionID}:` } } })
  if (found.docs.length > PAYMENT_CONTRADICTION_LIMIT || found.totalDocs !== found.docs.length) throw new Error('Payment contradictions exceed the bound')
  const contradictions = found.docs.map(row => {
    const contradiction = paymentContradictionSchema.parse(row.state)
    assertResultIdentity(contradiction.identity, identity)
    if (row.scope !== paymentContradictionScope(identity.transactionID, contradiction.sequence)) throw new Error('Payment contradiction scope mismatch')
    return contradiction
  }).sort((a, b) => a.sequence - b.sequence)
  if (contradictions.some((contradiction, index) => contradiction.sequence !== index + 1)) throw new Error('Payment contradiction sequence gap')
  return contradictions
}

const CUSTOMER_CONTRADICTION_LIMIT = 100

/**
 * Attempts of this customer with any recorded contradiction, as identities, one per
 * attempt. A contradiction can be recorded with no Paid case at all (for example a
 * PAID read after a cancellation with no signed Paid before it), so the purchase
 * fence reads these as well as Paid cases. Reads one extra row to fail closed on overflow.
 */
export async function listContradictedAttempts(req: PayloadRequest, customerID: string): Promise<ResultIdentity[]> {
  const found = await req.payload.find({ collection: 'commerce-reconciliations', req, overrideAccess: true, depth: 0,
    limit: CUSTOMER_CONTRADICTION_LIMIT + 1, where: { and: [
      { scope: { contains: 'reconciliation-paid-contradiction:' } }, { 'state.identity.customerID': { equals: customerID } },
    ] } })
  if (found.docs.length > CUSTOMER_CONTRADICTION_LIMIT || (found.totalDocs ?? found.docs.length) !== found.docs.length) {
    throw new Error('Payment contradictions exceed the recovery bound')
  }
  const byAttempt = new Map<string, ResultIdentity>()
  for (const row of found.docs) {
    const { identity, sequence } = paymentContradictionSchema.parse(row.state)
    if (row.scope !== paymentContradictionScope(identity.transactionID, sequence) || identity.customerID !== customerID
      || identity.paymentID !== identity.transactionID.replaceAll('-', '')) throw new Error('Payment contradiction identity mismatch')
    const known = byAttempt.get(identity.transactionID)
    if (known) assertResultIdentity(identity, known)
    else byAttempt.set(identity.transactionID, identity)
  }
  return [...byAttempt.values()]
}

/**
 * Call in the same review transaction that raises the resolution conflict, after the
 * customer lock and then the reservation lock. The customer lock is taken again here
 * (advisory transaction locks are re-entrant): a caller that skipped it would otherwise
 * race initiate's account check; taken late it can only deadlock and roll back.
 */
export async function recordPaymentContradiction(req: PayloadRequest, identity: ResultIdentity, evidenceID: string): Promise<void> {
  await lockCommerce(req, [paidReviewCustomerLock(identity.customerID)])
  await lockCommerce(req, [attemptKey(identity.transactionID)])
  const afterDispositions = (await listPaidDispositions(req, identity)).length
  const contradictions = await listPaymentContradictions(req, identity)
  if (contradictions.some(item => item.evidenceID === evidenceID && item.afterDispositions === afterDispositions)) return
  const sequence = contradictions.length + 1
  const state = paymentContradictionSchema.parse({ identity, sequence, evidenceID, afterDispositions, recordedAt: Date.now() })
  await withCommerceWrite(req, () => req.payload.create({ collection: 'commerce-reconciliations', req,
    overrideAccess: true, data: { scope: paymentContradictionScope(identity.transactionID, sequence), state } }))
}

async function listPaidEventIDs(req: PayloadRequest, identity: ResultIdentity): Promise<string[]> {
  const found = await req.payload.find({ collection: 'commerce-reconciliations', req, overrideAccess: true, depth: 0,
    limit: PAID_EVENT_LIMIT + 1, where: { and: [{ scope: { contains: `reconciliation-event:${identity.transactionID}:` } },
      { 'state.event.type': { equals: 'Transaction.Paid' } }] } })
  if (found.docs.length > PAID_EVENT_LIMIT || found.totalDocs !== found.docs.length) throw new Error('Paid events exceed the bound')
  return found.docs.map(row => {
    const saved = reconciliationEventSchema.parse(row.state)
    assertResultIdentity(saved.identity, identity)
    if (saved.event.type !== 'Transaction.Paid' || row.scope !== reconciliationEventScope(identity.transactionID, saved.event.id)) throw new Error('Paid event mismatch')
    return saved.event.id
  })
}

/** Call inside the verified-cancellation transaction, after the attempt's reservation lock. */
export async function recordVerifiedCancellation(req: PayloadRequest, identity: ResultIdentity, evidenceID: string,
  conflictAtCancellation: boolean): Promise<void> {
  // Re-entrant here; signed-Paid ingress try-locks the same key, so the Paid set
  // read below is exactly the Paid events recorded before this cancellation.
  await lockCommerce(req, [attemptKey(identity.transactionID)])
  const dispositions = await listPaidDispositions(req, identity)
  // A replay of evidence already recorded neither clears nor reopens anything.
  if (dispositions.some(disposition => disposition.evidenceID === evidenceID)) return
  const sequence = dispositions.length + 1
  const state = paidDispositionSchema.parse({ identity, sequence, disposition: 'verified-full-cancellation', evidenceID,
    conflictAtCancellation, paidEventsAtCancellation: await listPaidEventIDs(req, identity),
    contradictionsAtCancellation: (await listPaymentContradictions(req, identity)).length, recordedAt: Date.now() })
  await withCommerceWrite(req, () => req.payload.create({ collection: 'commerce-reconciliations', req,
    overrideAccess: true, data: { scope: paidDispositionScope(identity.transactionID, sequence), state } }))
}

/**
 * A Paid case is closed by the latest verified full cancellation of its attempt
 * unless a contradiction followed it: a resolution conflict raised afterwards, a
 * recorded contradiction it did not account for, or a signed Paid it did not account for.
 */
export async function isClosedByVerifiedCancellation(req: PayloadRequest, expected: ResultIdentity, resolutionConflict: boolean): Promise<boolean> {
  const latest = (await listPaidDispositions(req, expected)).at(-1)
  if (!latest) return false
  if (resolutionConflict && !latest.conflictAtCancellation) return false
  if ((await listPaymentContradictions(req, expected)).length > latest.contradictionsAtCancellation) return false
  const accounted = new Set(latest.paidEventsAtCancellation)
  return (await listPaidEventIDs(req, expected)).every(id => accounted.has(id))
}

/** True only for a redelivered signed Paid that the latest verified full cancellation already accounted for. */
export async function isPaidReplayBeforeCancellation(req: PayloadRequest, identity: ResultIdentity, eventID: string): Promise<boolean> {
  const latest = (await listPaidDispositions(req, identity)).at(-1)
  return latest?.paidEventsAtCancellation.includes(eventID) === true
}

// This case reports a verified signal needing investigation, never charge proof.
export async function hasPaidReviewCase(req: PayloadRequest, expected: ResultIdentity): Promise<boolean> {
  const row = await read(req, paidReviewScope(expected.transactionID))
  if (!row) return false
  assertResultIdentity(paidReviewCaseSchema.parse(row.state).identity, expected)
  return true
}
