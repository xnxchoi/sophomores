import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import type { Payload } from 'payload'
import { getResumePayment } from '@/lib/tickets/portone/runtime'
import { createPortOneHandlers } from '@/lib/tickets/portone/http'
import { resumePayment } from '@/lib/tickets/portone/server'
const id = '019a313f-c922-7000-8000-000000000001'
const ownerId = '019a313f-c922-7000-8000-000000000002'
const attemptId = '019a313f-c922-7000-8000-000000000003'
const config = { origin: 'http://localhost:3000', storeId: 'store-test', channelKey: 'channel-test', apiSecret: 'synthetic', webhookSecret: 'synthetic' }
const catalogue = { orderName: 'Synthetic', unitAmount: 100, currency: 'KRW' as const, maximumQuantity: 4, saleStartsAt: '2020-01-01T00:00:00Z', saleEndsAt: '2099-01-01T00:00:00Z' }
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const row = { id, user: ownerId, ticketQuantity: 2, totalAmount: 200, currency: 'KRW', status: 'pending', paymentProvider: 'portone', paymentReference: id, prepareKey: hash(attemptId), prepareFingerprint: hash(JSON.stringify([ownerId, 2, config.origin, config.storeId, config.channelKey, catalogue.orderName, catalogue.unitAmount, catalogue.currency, catalogue.maximumQuantity, catalogue.saleStartsAt, catalogue.saleEndsAt])) }
const failed = { id, status: 'FAILED', storeId: config.storeId, channel: { key: config.channelKey, type: 'TEST' }, customer: { id: ownerId }, currency: 'KRW', amount: { total: 200, paid: 0, cancelled: 0 } }
function fixture(payment: unknown = { type: 'PAYMENT_NOT_FOUND' }, change: object = {}, late: object = {}) {
  let reads = 0
  const payload = { async findByID() { return { ...row, ...change, ...(reads++ ? late : {}) } } } as unknown as Pick<Payload, 'findByID'>
  return { payload, config, catalogue, ownerId, attemptId, paymentId: id, getPayment: async () => payment }
}
test('typed missing and fully verified failed return canonical same-ID request only', async () => {
  for (const payment of [{ type: 'PAYMENT_NOT_FOUND' }, failed, { ...failed, disputes: [] }]) {
    const result = await resumePayment(fixture(payment))
    assert.equal(result.outcome, 'resumable')
    if (result.outcome === 'resumable') {
      assert.equal(result.request.paymentId, id)
      assert.equal(result.request.totalAmount, 200)
      assert.equal('recovered' in result.request, false)
    }
  }
})
test('known nonfailed states, held orders and late paid/held never return a request', async () => {
  for (const status of ['READY', 'PENDING', 'PAID', 'CANCELLED', 'PARTIAL_CANCELLED']) assert.deepEqual(await resumePayment(fixture({ ...failed, status })), { outcome: 'status-only' })
  for (const status of ['paid', 'held', 'cancelled', 'refunded']) {
    assert.deepEqual(await resumePayment(fixture(undefined, { status })), { outcome: 'status-only' })
    assert.deepEqual(await resumePayment(fixture(undefined, {}, { status })), { outcome: 'status-only' })
  }
})
test('owner, attempt, fingerprint, current sale and immutable post-I/O changes reject', async () => {
  for (const change of [{ user: id }, { prepareKey: '0'.repeat(64) }, { prepareFingerprint: '0'.repeat(64) }, { paymentReference: ownerId }, { totalAmount: 201 }]) await assert.rejects(() => resumePayment(fixture(undefined, change)))
  await assert.rejects(() => resumePayment({ ...fixture(), now: new Date('2100-01-01') }))
  await assert.rejects(() => resumePayment(fixture(undefined, {}, { prepareFingerprint: '0'.repeat(64) })))
})
test('unverified failed, disputes, charged failed, generic missing and unknown fail closed', async () => {
  for (const payment of [{ type: 'OTHER' }, {}, { ...failed, status: 'FUTURE' }, { ...failed, storeId: 'other' }, { ...failed, customer: { id } }, { ...failed, channel: { key: 'other', type: 'TEST' } }, { ...failed, disputes: null }, { ...failed, disputes: {} }, { ...failed, disputes: [{}] }, { ...failed, amount: { total: 200, paid: 1, cancelled: 0 } }]) await assert.rejects(() => resumePayment(fixture(payment)))
})

test('resume HTTP strictly validates body and retains purchase and owner gates', async () => {
  const calls: unknown[] = []
  const deps = { config, catalogue, publicationReady: () => true, verifyTestChannel: async () => true,
    eligibleOwner: async () => ownerId, prepare: async () => ({}), complete: async () => ({}), verifyWebhook: async () => ({}),
    resume: async (...args: unknown[]) => { calls.push(args); return { outcome: 'status-only' } } }
  const request = (body: unknown) => new Request(`${config.origin}/api/payments/portone/resume`, {
    method: 'POST', headers: { origin: config.origin, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const handler = createPortOneHandlers(deps)
  const response = await handler.resume(request({ paymentId: id, attemptId }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { success: true, data: { outcome: 'status-only' } })
  assert.equal(calls.length, 1)
  for (const body of [{ paymentId: id }, { paymentId: id, attemptId, quantity: 2 }, { paymentId: 'invalid', attemptId }]) assert.equal((await handler.resume(request(body))).status, 400)
  for (const overrides of [{ catalogue: null }, { publicationReady: () => false }, { verifyTestChannel: async () => false }, { resume: undefined }]) assert.equal((await createPortOneHandlers({ ...deps, ...overrides }).resume(request({ paymentId: id, attemptId }))).status, 503)
  assert.equal((await createPortOneHandlers({ ...deps, eligibleOwner: async () => null }).resume(request({ paymentId: id, attemptId }))).status, 403)
  assert.equal(calls.length, 1)
})

test('native transport authorizes absence only on exact scoped typed 404', async () => {
  const original = globalThis.fetch
  try {
    for (const [status, body, accepted] of [[404, { type: 'PAYMENT_NOT_FOUND' }, true], [200, { type: 'PAYMENT_NOT_FOUND' }, false], [404, { type: 'OTHER' }, false], [404, {}, false], [503, { type: 'PAYMENT_NOT_FOUND' }, false], [200, failed, true]] as const) {
      globalThis.fetch = async (url, init) => {
        assert.equal(new URL(String(url)).searchParams.get('storeId'), config.storeId)
        assert.equal(init?.redirect, 'error')
        assert.ok(init?.signal)
        return Response.json(body, { status })
      }
      if (accepted) await getResumePayment(config, { paymentId: id, storeId: config.storeId })
      else await assert.rejects(() => getResumePayment(config, { paymentId: id, storeId: config.storeId }))
    }
    globalThis.fetch = async () => new Response('not-json', { status: 404 })
    await assert.rejects(() => getResumePayment(config, { paymentId: id, storeId: config.storeId }))
    globalThis.fetch = async () => { throw new DOMException('Timed out', 'TimeoutError') }
    await assert.rejects(() => getResumePayment(config, { paymentId: id, storeId: config.storeId }))
  } finally { globalThis.fetch = original }
})

test('sale expiry while provider I/O is outstanding never returns a launch request', async () => {
  let reads = 0
  const clock = { getTime: () => Date.parse(reads++ ? '2100-01-01T00:00:00Z' : '2026-01-01T00:00:00Z') } as Date
  await assert.rejects(() => resumePayment({ ...fixture(), now: clock }))
})
test('already held rows never call the provider or mutate an order', async () => {
  await resumePayment({ ...fixture(undefined, { status: 'held' }), getPayment: async () => { assert.fail('provider must not be called') } })
})
