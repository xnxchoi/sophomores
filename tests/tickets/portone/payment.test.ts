import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadPortOneConfig, reviewedTestChannel } from '../../../lib/tickets/portone/config'
import { preparePayment, reconcilePayment } from '../../../lib/tickets/portone/server'
import type { Payload } from 'payload'
import { readFileSync } from 'node:fs'

const id = '019a313f-c922-7000-8000-000000000001'
const owner = '019a313f-c922-7000-8000-000000000002'
const attemptId = '019a313f-c922-7000-8000-000000000003'
const config = { origin: 'http://localhost:3000', storeId: 'store-test', channelKey: 'channel-test', apiSecret: 'test-api-secret', webhookSecret: `whsec_${Buffer.from('synthetic-webhook-secret-32-bytes!').toString('base64')}` }
const order = { id, user: owner, ticketQuantity: 2, totalAmount: 12345, currency: 'KRW', status: 'pending', paymentProvider: 'portone', paymentReference: id }
const payment = { id, status: 'PAID', storeId: config.storeId, channel: { key: config.channelKey, type: 'TEST' }, amount: { total: order.totalAmount, paid: order.totalAmount, cancelled: 0 }, currency: order.currency, customer: { id: owner }, disputes: [] }

function fixture(overrides: { order?: unknown; payment?: unknown } = {}) {
  const calls: unknown[] = []
  let stored = overrides.order ?? order
  const payload = {
    async findByID(input: unknown) { calls.push(['read', input]); return structuredClone(stored) },
    db: { async updateOne(input: unknown) { calls.push(['write', input]); stored = { ...order, ...(input as { data: object }).data }; return structuredClone(stored) } },
  }
  return { calls, payload: payload as unknown as Pick<Payload, 'findByID' | 'db'>,
    getPayment: async (input: unknown) => { calls.push(['lookup', input]); return overrides.payment ?? payment } }
}

test('configuration is disabled by default and rejects partial, live, malformed, or insecure settings', () => {
  assert.equal(loadPortOneConfig({}), null)
  assert.equal(reviewedTestChannel, null, 'no actual console-reviewed channel has been approved')
  assert.equal(loadPortOneConfig({ PORTONE_PAYMENT_MODE: 'disabled' }), null)
  for (const env of [{ PORTONE_PAYMENT_MODE: 'live' }, { PORTONE_PAYMENT_MODE: 'sandbox' }]) {
    assert.throws(() => loadPortOneConfig(env), /PortOne configuration unavailable/)
  }
  const env = { PORTONE_PAYMENT_MODE: 'sandbox', PORTONE_ORIGIN: config.origin, PORTONE_STORE_ID: config.storeId, PORTONE_CHANNEL_KEY: config.channelKey, PORTONE_API_SECRET: config.apiSecret, PORTONE_WEBHOOK_SECRET: config.webhookSecret }
  assert.deepEqual(loadPortOneConfig(env), config)
  for (const extra of [{ PORTONE_ORIGIN: 'http://public.example' }, { PORTONE_ORIGIN: 'https://example.com/path' }, { PORTONE_API_SECRET: ' ' }, { PORTONE_WEBHOOK_SECRET: config.apiSecret }, { PORTONE_WEBHOOK_SECRET: 'plain-not-base64' }]) {
    assert.throws(() => loadPortOneConfig({ ...env, ...extra }), /PortOne configuration unavailable/)
  }
})

test('prepare creates only a trusted pending order and returns no credentials or price authority', async () => {
  const calls: unknown[] = []
  let created: Record<string, unknown> = {}
  const payload = {
    async find() { return { docs: [] } },
    async create(input: unknown) { calls.push(['create', input]); created = { ...(input as { data: object }).data, id, paymentReference: null }; return created },
    db: { async updateOne(input: unknown) { calls.push(['bind', input]); return { ...created, ...(input as { data: object }).data } } },
  } as unknown as Payload
  const catalogue = { orderName: 'Synthetic admission', unitAmount: 12345, currency: 'KRW' as const,
    maximumQuantity: 4, saleStartsAt: '2020-01-01T00:00:00Z', saleEndsAt: '2099-01-01T00:00:00Z' }
  const result = await preparePayment({ payload, config, catalogue, quantity: 2, ownerId: owner, attemptId,
    customer: { email: 'verified@example.test', fullName: 'Test Member' } })
  assert.match(result.paymentId, /^[0-9a-f-]{36}$/)
  assert.equal(result.totalAmount, 24690)
  assert.equal(result.redirectUrl, `${config.origin}/tickets/payment`)
  assert.deepEqual(result.customer, { customerId: owner, email: 'verified@example.test', fullName: 'Test Member' })
  assert.doesNotMatch(JSON.stringify(result), /test-api-secret|test-webhook-secret/)
  assert.equal(result.paymentId, id, 'use actual Payload-generated id, not an ignored custom id')
  const create = (calls[0] as [string, { overrideAccess: boolean; data: Record<string, unknown> }])[1]
  assert.equal(create.overrideAccess, true)
  assert.deepEqual(create.data, { user: owner, ticketQuantity: 2,
    totalAmount: 24690, currency: 'KRW', status: 'pending', paymentProvider: 'portone',
    prepareKey: create.data.prepareKey, prepareFingerprint: create.data.prepareFingerprint })
  assert.match(String(create.data.prepareKey), /^[a-f0-9]{64}$/)
  assert.match(String(create.data.prepareFingerprint), /^[a-f0-9]{64}$/)
  assert.equal(result.recovered, false)
  const bind = (calls[1] as [string, { options: unknown; data: unknown; where: unknown }])[1]
  assert.deepEqual(bind.options, { atomic: true })
  assert.equal((bind.data as Record<string, unknown>).paymentReference, id)
  assert.ok(Number.isFinite(Date.parse((bind.data as Record<string, string>).updatedAt)))
  assert.match(JSON.stringify(bind.where), /exists.*false/)
  for (const extra of [{ quantity: 5 }, { ownerId: 'invalid' }, { now: new Date('2100-01-01') }, { now: new Date(NaN) }]) {
    await assert.rejects(() => preparePayment({ payload, config, catalogue, quantity: 2, ownerId: owner, attemptId, ...extra }))
  }
  assert.equal(calls.length, 2)
})

test('re-fetches authoritative payment and only atomically sets status on the trusted existing order', async () => {
  const f = fixture()
  assert.deepEqual(await reconcilePayment({ ...f, config, paymentId: id, ownerId: owner }), { orderId: id, status: 'paid' })
  const write = f.calls.find((call) => (call as unknown[])[0] === 'write') as [string, Record<string, unknown>]
  assert.equal((write[1].data as Record<string, unknown>).status, 'paid')
  assert.deepEqual(Object.keys(write[1].data as object).sort(), ['status', 'updatedAt'])
  assert.deepEqual(write[1].options, { atomic: true })
  assert.equal('id' in write[1], false, 'passing id bypasses atomic where guard')
  assert.match(JSON.stringify(write[1].where), /pending/)
  assert.match(JSON.stringify(write[1].where), /12345/)
})

test('duplicates re-fetch provider but do not write a paid order twice', async () => {
  const f = fixture({ order: { ...order, status: 'paid' } })
  assert.equal((await reconcilePayment({ ...f, config, paymentId: id, ownerId: owner })).status, 'paid')
  assert.equal(f.calls.some((call) => (call as unknown[])[0] === 'write'), false)
})

test('rejects owner, reference, provider, stored amount, currency, cancelled and refunded mismatches without writing', async () => {
  for (const extra of [{ user: 'other' }, { paymentReference: 'other' }, { paymentProvider: 'stripe' }, { totalAmount: 123 }, { totalAmount: -1 }, { totalAmount: 1.5 }, { currency: 'USD' }, { status: 'cancelled' }, { status: 'refunded' }]) {
    const f = fixture({ order: { ...order, ...extra } })
    await assert.rejects(() => reconcilePayment({ ...f, config, paymentId: id, ownerId: owner }))
    assert.equal(f.calls.some((call) => (call as unknown[])[0] === 'write'), false)
  }
})

test('provider total, paid/cancelled balance, identity, channel, store, currency, and state are mandatory', async () => {
  for (const extra of [{ id: 'other' }, { storeId: 'other' }, { channel: { key: 'other', type: 'TEST' } }, { channel: { key: config.channelKey, type: 'LIVE' } }, { amount: { total: 1, paid: 1, cancelled: 0 } }, { currency: 'USD' }, { customer: { id: 'other' } }, { status: 'READY' }]) {
    const f = fixture({ payment: { ...payment, ...extra } })
    await assert.rejects(() => reconcilePayment({ ...f, config, paymentId: id, ownerId: owner }))
    assert.equal(f.calls.some((call) => (call as unknown[])[0] === 'write'), false)
  }
})

test('concurrent browser and webhook confirmation converge on the identical paid order', async () => {
  const f = fixture()
  let storedStatus = 'pending'
  f.payload.findByID = (async () => ({ ...order, status: storedStatus })) as Payload['findByID']
  let writeCount = 0
  f.payload.db.updateOne = async () => {
    writeCount++
    if (storedStatus !== 'pending') return null as never
    storedStatus = 'paid'
    return { ...order, status: storedStatus }
  }
  const results = await Promise.all([
    reconcilePayment({ ...f, config, paymentId: id, ownerId: owner }),
    reconcilePayment({ ...f, config, paymentId: id }),
  ])
  assert.deepEqual(results, [{ orderId: id, status: 'paid' }, { orderId: id, status: 'paid' }])
  assert.equal(writeCount, 2, 'one guarded transition and one losing CAS converge through a fresh read')
})

test('lost atomic guard fails closed; no fallback unconditional update', async () => {
  const f = fixture()
  f.payload.db.updateOne = async (input) => { f.calls.push(['write', input]); return null as never }
  await assert.rejects(() => reconcilePayment({ ...f, config, paymentId: id, ownerId: owner }))
  const writes = f.calls.filter((call) => (call as unknown[])[0] === 'write') as [string, Record<string, unknown>][]
  assert.equal(writes.length, 2, 'bounded convergence permits at most two guarded attempts')
  for (const [, write] of writes) {
    assert.equal('id' in write, false, 'never bypass the where predicate with an id update')
    assert.deepEqual(write.options, { atomic: true })
    assert.deepEqual(write.where, { and: [
      { id: { equals: id } }, { user: { equals: owner } },
      { ticketQuantity: { equals: order.ticketQuantity } }, { totalAmount: { equals: order.totalAmount } },
      { currency: { equals: order.currency } }, { paymentProvider: { equals: 'portone' } },
      { paymentReference: { equals: id } }, { status: { equals: 'pending' } },
    ] })
    assert.deepEqual(Object.keys(write.data as object).sort(), ['status', 'updatedAt'])
    assert.equal((write.data as Record<string, unknown>).status, 'paid')
  }
})

test('authoritative full cancellation revokes only into truthful existing terminal statuses', async () => {
  for (const previous of ['pending', 'paid', 'cancelled', 'refunded']) {
    const f = fixture({ order: { ...order, status: previous }, payment: { ...payment, status: 'CANCELLED',
      amount: { ...payment.amount, cancelled: order.totalAmount } } })
    const expected = ['paid', 'refunded'].includes(previous) ? 'refunded' : 'cancelled'
    f.payload.db.updateOne = async (input) => { f.calls.push(['write', input]); return { ...order, status: expected } }
    assert.deepEqual(await reconcilePayment({ ...f, config, paymentId: id }), { orderId: id, status: expected })
    const writes = f.calls.filter((call) => (call as unknown[])[0] === 'write') as [string, { data: unknown; where: unknown }][]
    assert.equal(writes.length, previous === expected ? 0 : 1)
    if (writes.length) {
      assert.equal((writes[0][1].data as Record<string, unknown>).status, expected)
      assert.ok(Number.isFinite(Date.parse((writes[0][1].data as Record<string, string>).updatedAt)))
      assert.match(JSON.stringify(writes[0][1].where), new RegExp(previous))
    }
  }
})

test('source-only transport contract fixes provider host and encodes ids with native abort deadline', () => {
  // No network is made here. Actual provider/transport acceptance remains gated.
  const source = readFileSync(new URL('../../../lib/tickets/portone/runtime.ts', import.meta.url), 'utf8')
  assert.match(source, /https:\/\/api\.portone\.io\/payments\//)
  assert.match(source, /encodeURIComponent\(input\.paymentId\)/)
  assert.match(source, /signal: AbortSignal\.timeout\(5000\)/)
  assert.match(source, /redirect: 'error'/)
  assert.match(source, /Authorization: `PortOne \$\{config\.apiSecret\}`/)
  assert.match(source, /publicationReady: \(\) => publishedCommerceDisclosureSchema\.safeParse\(commerceDisclosure\)\.success/)
  assert.match(source, /reviewedTestChannel !== null/)
  assert.match(source, /reviewedTestChannel\.storeId === config\.storeId/)
  assert.match(source, /reviewedTestChannel\.channelKey === config\.channelKey/)
  assert.doesNotMatch(source, /console\.(log|warn|error).*apiSecret/)
})

test('partial cancellation and missing, unknown, or unresolved dispute snapshots are held, never paid', async () => {
  for (const extra of [{ disputes: undefined }, { disputes: [{ status: 'UNRESOLVED' }] },
    { disputes: [{ status: 'FUTURE_STATE' }] }, { status: 'PARTIAL_CANCELLED', amount: { ...payment.amount, cancelled: 1 } },
    { status: 'CANCELLED', amount: { ...payment.amount, cancelled: 1 } }]) {
    const f = fixture({ payment: { ...payment, ...extra } })
    assert.equal((await reconcilePayment({ ...f, config, paymentId: id })).status, 'held')
    assert.equal(f.calls.some((call) => (call as unknown[])[0] === 'write'), true)
  }
})

test('actual atomic transitions emit sanitized success audit events, duplicates do not', async () => {
  const logs: unknown[][] = []
  const original = console.info
  console.info = (...args: unknown[]) => { logs.push(args) }
  try {
    const paid = fixture()
    await reconcilePayment({ ...paid, config, paymentId: id, ownerId: owner })
    const duplicate = fixture({ order: { ...order, status: 'paid' } })
    await reconcilePayment({ ...duplicate, config, paymentId: id, ownerId: owner })
    assert.equal(logs.length, 1)
    assert.deepEqual(logs[0], ['PortOne order transition.', {
      orderId: id, paymentId: id, previousStatus: 'pending', status: 'paid',
    }])
    assert.doesNotMatch(JSON.stringify(logs), new RegExp(owner))
    assert.doesNotMatch(JSON.stringify(logs), /email|fullName|apiSecret|webhookSecret|customer/)
  } finally { console.info = original }
})
