import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { Socket } from 'node:net'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { loadEnvConfig } from '@next/env'
import type { Payload } from 'payload'
import type { Pool } from 'pg'
import { preparePayment, reconcilePayment } from '@/lib/tickets/portone/server'
import { orderIdFromPaymentId } from '@/lib/tickets/portone/payment-id'
import { capturePayloadTestLifecycle } from '../support/payload-lifecycle'

// This separate gate is intentionally not enabled by ordinary --database runs.
// Provider lookups below are synthetic; the existing local Payload adapter is real.
test('PortOne payment safety on the existing local Payload adapter', {
  skip: process.env.PORTONE_PAYLOAD_DATABASE_TESTS !== '1',
  timeout: 60_000,
}, async (t) => {
  const previousHmr = process.env.DISABLE_PAYLOAD_HMR
  process.env.DISABLE_PAYLOAD_HMR = 'true'
  t.after(() => {
    if (previousHmr === undefined) delete process.env.DISABLE_PAYLOAD_HMR
    else process.env.DISABLE_PAYLOAD_HMR = previousHmr
  })
  loadEnvConfig(fileURLToPath(new URL('../../', import.meta.url)))
  const database = new URL(process.env.DATABASE_URI ?? '')
  assert.ok(['postgres:', 'postgresql:'].includes(database.protocol))
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname))
  assert.ok(database.pathname.length > 1, 'Select an explicit existing local database')

  // No payment, SMTP, OAuth, or other outbound transport is permitted, even if
  // private local configuration enables it. Only this local DB port may connect.
  let blockedOutbound = 0
  t.mock.method(globalThis, 'fetch', async () => {
    blockedOutbound++
    throw new Error('Payment adapter tests forbid outbound HTTP')
  })
  const originalConnect = Socket.prototype.connect
  t.mock.method(Socket.prototype, 'connect', function (this: Socket, ...args: Parameters<Socket['connect']>) {
    const first: unknown = Array.isArray(args[0]) ? args[0][0] : args[0]
    const options = typeof first === 'object' && first !== null ? first as Record<string, unknown> : null
    const port = Number(options ? options.port : first)
    const host = options ? String(options.host ?? 'localhost') : typeof args[1] === 'string' ? args[1] : 'localhost'
    if (options?.path || port !== Number(database.port || 5432)
      || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
      blockedOutbound++
      throw new Error('Payment adapter tests permit only the selected local database transport')
    }
    return Reflect.apply(originalConnect, this, args)
  })

  const { getPayload } = await import('@/lib/payload')
  const payload = await getPayload()
  const closePayload = capturePayloadTestLifecycle(payload)
  const pool = payload.db.pool as Pool
  const users: { id: string; email: string }[] = []
  const prepareKeys = new Set<string>()
  const legacyOrderIds = new Set<string>()
  t.after(async () => {
    const cleanupErrors: unknown[] = []
    try {
      const userIds = users.map((user) => user.id)
      for (const key of prepareKeys) {
        try { await pool.query('DELETE FROM public.orders WHERE prepare_key=$1 AND user_id=ANY($2::uuid[])', [key, userIds]) }
        catch (error) { cleanupErrors.push(error) }
      }
      for (const id of legacyOrderIds) {
        try { await pool.query('DELETE FROM public.orders WHERE id=$1 AND user_id=ANY($2::uuid[])', [id, userIds]) }
        catch (error) { cleanupErrors.push(error) }
      }
      for (const user of users) {
        try { await pool.query('DELETE FROM public.users WHERE id=$1 AND email=$2', [user.id, user.email]) }
        catch (error) { cleanupErrors.push(error) }
      }
    } finally { await closePayload() }
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Payment fixture cleanup failed')
  })

  const selected = await pool.query<{ name: string }>('SELECT current_database() AS name')
  assert.ok(selected.rows[0].name === decodeURIComponent(database.pathname.slice(1)), 'Payload must use the explicitly selected local database')
  for (let index = 0; index < 2; index++) {
    const email = `portone-safety-${randomUUID()}-${index}@fixture.invalid`
    const user = await payload.create({ collection: 'users', overrideAccess: true, data: {
      name: 'Synthetic PortOne Adapter Fixture', email, emailVerified: true,
      localePreference: 'en', membershipStatus: 'applicant',
    } })
    users.push({ id: user.id, email })
  }
  const owner = users[0].id
  const otherOwner = users[1].id
  const config = { origin: 'http://localhost:3000', storeId: 'store-adapter-fixture', channelKey: 'channel-adapter-fixture',
    apiSecret: 'unused-synthetic-adapter-secret', webhookSecret: 'unused-synthetic-adapter-webhook', localKpnTestCheckout: false }
  const catalogue = { orderName: 'Synthetic local adapter fixture', unitAmount: 12345, currency: 'KRW' as const,
    maximumQuantity: 3, saleStartsAt: '2020-01-01T00:00:00Z', saleEndsAt: '2099-01-01T00:00:00Z' }
  const nextAttempt = () => {
    const attemptId = randomUUID()
    prepareKeys.add(createHash('sha256').update(attemptId).digest('hex'))
    return attemptId
  }
  const prepare = (attemptId: string, extra: { ownerId?: string; quantity?: number } = {}) =>
    preparePayment({ payload, config, catalogue, quantity: 2, ownerId: owner, attemptId, ...extra })
  const fact = (paymentId: string) => ({ id: paymentId, status: 'PAID', storeId: config.storeId,
    channel: { key: config.channelKey, type: 'TEST' }, customer: { id: owner }, currency: 'KRW',
    amount: { total: 24690, paid: 24690, cancelled: 0 }, disputes: [] })
  const readOrder = (id: string) => payload.findByID({ collection: 'orders', id, overrideAccess: true, depth: 0 })

  await t.test('unique nullable retry index preserves legacy rows and is actually installed', async () => {
    const index = await pool.query<{ indexdef: string }>(`SELECT indexdef FROM pg_indexes
      WHERE schemaname='public' AND tablename='orders' AND indexname='orders_prepare_key_idx'`)
    assert.equal(index.rows.length, 1)
    assert.match(index.rows[0].indexdef, /CREATE UNIQUE INDEX/)
    for (let count = 0; count < 2; count++) {
      const order = await payload.create({ collection: 'orders', overrideAccess: true, data: {
        commerceVersion: 'legacy',
        user: owner, ticketQuantity: 1, totalAmount: 12345, currency: 'KRW', status: 'pending', paymentProvider: 'portone',
      } })
      legacyOrderIds.add(order.id)
      assert.equal(order.prepareKey ?? null, null)
      assert.equal(order.prepareFingerprint ?? null, null)
    }
  })

  await t.test('concurrent same-attempt prepare converges to one actual bound order', async () => {
    const attemptId = nextAttempt()
    const attempts = await Promise.allSettled([prepare(attemptId), prepare(attemptId), prepare(attemptId)])
    const results = attempts.map((result) => {
      assert.ok(result.status === 'fulfilled', 'Every concurrent prepare must recover the same durable attempt')
      return result.value
    })
    assert.equal(new Set(results.map((result) => result.paymentId)).size, 1)
    const key = createHash('sha256').update(attemptId).digest('hex')
    const rows = await pool.query<{ id: string; payment_reference: string }>(
      'SELECT id,payment_reference FROM public.orders WHERE prepare_key=$1', [key])
    assert.equal(rows.rows.length, 1)
    assert.equal(rows.rows[0].id, orderIdFromPaymentId(results[0].paymentId))
    assert.equal(rows.rows[0].payment_reference, results[0].paymentId)
    assert.equal((await readOrder(orderIdFromPaymentId(results[0].paymentId))).status, 'pending')
    assert.equal((await prepare(attemptId)).recovered, true)
  })

  await t.test('committed create response loss recovers and binds without a second order', async () => {
    const attemptId = nextAttempt()
    let createdId: string | undefined
    const interruptedCreate = (async (input: Parameters<Payload['create']>[0]) => {
      const created = await payload.create(input)
      createdId = String(created.id)
      throw new Error('Synthetic response lost after actual create commit')
    }) as Payload['create']
    const recovered = await preparePayment({ payload: { find: payload.find.bind(payload),
      findByID: payload.findByID.bind(payload), create: interruptedCreate, db: payload.db },
    config, catalogue, quantity: 2, ownerId: owner, attemptId })
    assert.equal(orderIdFromPaymentId(recovered.paymentId), createdId)
    assert.equal(recovered.recovered, true)
    assert.equal((await readOrder(orderIdFromPaymentId(recovered.paymentId))).paymentReference, recovered.paymentId)
    assert.equal((await prepare(attemptId)).paymentId, recovered.paymentId)
  })

  await t.test('same key cannot change owner, quantity or canonical charge snapshot', async () => {
    const attemptId = nextAttempt()
    const prepared = await prepare(attemptId)
    await assert.rejects(() => prepare(attemptId, { ownerId: otherOwner }))
    await assert.rejects(() => prepare(attemptId, { quantity: 1 }))
    await assert.rejects(() => preparePayment({ payload, config, catalogue: { ...catalogue, unitAmount: 12346 },
      quantity: 2, ownerId: owner, attemptId }))
    assert.equal((await readOrder(orderIdFromPaymentId(prepared.paymentId))).user, owner)
    const key = createHash('sha256').update(attemptId).digest('hex')
    const rows = await pool.query('SELECT id FROM public.orders WHERE prepare_key=$1', [key])
    assert.equal(rows.rows.length, 1)
  })

  await t.test('actual adapter CAS rejects a stale status predicate rather than writing by ID', async () => {
    const { paymentId } = await prepare(nextAttempt())
    const confirmed = await reconcilePayment({ payload, config, paymentId, ownerId: owner, getPayment: async () => fact(paymentId) })
    assert.equal(confirmed.status, 'paid')
    const stale = await payload.db.updateOne({ collection: 'orders', options: { atomic: true }, returning: true,
      where: { and: [{ id: { equals: orderIdFromPaymentId(paymentId) } }, { user: { equals: owner } }, { status: { equals: 'pending' } }] },
      data: { status: 'cancelled', updatedAt: new Date().toISOString() } })
    assert.equal(stale === null || stale === undefined, true)
    assert.equal((await readOrder(orderIdFromPaymentId(paymentId))).status, 'paid')
  })

  await t.test('partial cancellation and dispute evidence durably hold already-paid orders', async () => {
    for (const evidence of ['partial', 'dispute'] as const) {
      const { paymentId } = await prepare(nextAttempt())
      await reconcilePayment({ payload, config, paymentId, getPayment: async () => fact(paymentId) })
      const unsafe = evidence === 'partial'
        ? { ...fact(paymentId), status: 'PARTIAL_CANCELLED', amount: { total: 24690, paid: 24690, cancelled: 1000 } }
        : { ...fact(paymentId), disputes: [{ status: 'UNRESOLVED' }] }
      assert.equal((await reconcilePayment({ payload, config, paymentId, getPayment: async () => unsafe })).status, 'held')
      assert.equal((await readOrder(orderIdFromPaymentId(paymentId))).status, 'held')
      assert.equal((await reconcilePayment({ payload, config, paymentId, getPayment: async () => fact(paymentId) })).status, 'held')
      assert.equal((await readOrder(orderIdFromPaymentId(paymentId))).status, 'held')
    }
  })

  await t.test('delayed PAID lookup cannot clear a concurrent durable hold', async () => {
    const { paymentId } = await prepare(nextAttempt())
    await reconcilePayment({ payload, config, paymentId, getPayment: async () => fact(paymentId) })
    let lookupStarted!: () => void
    let releasePaid!: (payment: ReturnType<typeof fact>) => void
    const started = new Promise<void>((resolve) => { lookupStarted = resolve })
    const providerResponse = new Promise<ReturnType<typeof fact>>((resolve) => { releasePaid = resolve })
    const delayed = reconcilePayment({ payload, config, paymentId, ownerId: owner, getPayment: async () => {
      lookupStarted()
      return providerResponse
    } })
    let delayedResult: Awaited<ReturnType<typeof reconcilePayment>> | undefined
    try {
      await started
      const held = await reconcilePayment({ payload, config, paymentId, getPayment: async () => ({ ...fact(paymentId),
        status: 'PARTIAL_CANCELLED', amount: { total: 24690, paid: 24690, cancelled: 1000 } }) })
      assert.equal(held.status, 'held')
    } finally {
      releasePaid(fact(paymentId))
      delayedResult = await delayed
    }
    assert.equal(delayedResult.status, 'held')
    assert.equal((await readOrder(orderIdFromPaymentId(paymentId))).status, 'held')
  })

  assert.equal(blockedOutbound, 0, 'No provider, email or other outbound request should even be attempted')
})
