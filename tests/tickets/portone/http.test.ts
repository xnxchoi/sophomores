import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPortOneHandlers } from '@/lib/tickets/portone/http'

const id = '019a313f-c922-7000-8000-000000000001'
const providerId = id.replaceAll('-', '')
const owner = '019a313f-c922-7000-8000-000000000002'
const attemptId = '019a313f-c922-7000-8000-000000000003'
const config = { mode: "test" as const, localKpnTestCheckout: false, origin: 'http://localhost:3000', storeId: 'store-test', channelKey: 'channel-test', apiSecret: 'secret-api', webhookSecret: 'secret-webhook' }
const catalogue = { orderName: 'Synthetic test admission', unitAmount: 12345, currency: 'KRW' as const, maximumQuantity: 4, saleStartsAt: '2020-01-01T00:00:00Z', saleEndsAt: '2099-01-01T00:00:00Z' }
function request(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${config.origin}/api/payments/portone/${path}`, { method: 'POST', headers: { origin: config.origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
}
function fixture() {
  const calls: unknown[] = []
  const deps = {
    config, catalogue,
    publicationReady: () => true,
    verifyTestChannel: async () => true,
    async eligibleOwner() { return owner as string | null },
    async prepare(quantity: number, ownerId: string, _request: Request, attempt: string) { calls.push(['prepare', quantity, ownerId, attempt]); return { paymentId: providerId } },
    async complete(paymentId: string, ownerId?: string) { calls.push(['complete', paymentId, ownerId]); return { orderId: id, status: 'paid' as const } },
    async verifyWebhook(body: string, headers: Record<string, string>) { calls.push(['verify', body, headers]); return { type: 'Transaction.Paid', data: { paymentId: providerId, storeId: config.storeId } } as unknown },
  }
  return { deps, calls }
}
test('prepare accepts quantity and retry identity after canonical eligibility and refuses client authority fields', async () => {
  const f = fixture(); const handlers = createPortOneHandlers(f.deps)
  assert.equal((await handlers.prepare(request('prepare', { quantity: 2, attemptId }))).status, 200)
  assert.deepEqual(f.calls[0], ['prepare', 2, owner, attemptId])
  for (const extra of [{ totalAmount: 1 }, { ownerId: owner }, { currency: 'USD' }, { status: 'paid' }]) {
    assert.equal((await handlers.prepare(request('prepare', { quantity: 2, attemptId, ...extra }))).status, 400)
  }
})
test('same-origin, authenticated email+phone, content type, body bounds and quantity are required', async () => {
  const f = fixture(); const handlers = createPortOneHandlers(f.deps)
  assert.equal((await handlers.prepare(request('prepare', { quantity: 1, attemptId }, { origin: 'https://evil.test' }))).status, 403)
  assert.equal((await handlers.prepare(request('prepare', { quantity: 1, attemptId }, { 'content-type': 'text/plain' }))).status, 415)
  assert.equal((await handlers.prepare(request('prepare', { junk: 'x'.repeat(4096) }))).status, 413)
  for (const quantity of [0, -1, 1.5, '2', 7]) assert.equal((await handlers.prepare(request('prepare', { quantity, attemptId }))).status, 400)
  f.deps.eligibleOwner = async () => null
  assert.equal((await handlers.prepare(request('prepare', { quantity: 1, attemptId }))).status, 403)
  assert.equal(f.calls.length, 0)
})
test('prepare requires an opaque UUID attempt but never accepts a caller-selected owner or amount', async () => {
  for (const body of [{ quantity: 1 }, { quantity: 1, attemptId: 'invalid' }, { quantity: 1, attemptId, ownerId: owner }]) {
    const f = fixture()
    assert.equal((await createPortOneHandlers(f.deps).prepare(request('prepare', body))).status, 400)
    assert.equal(f.calls.length, 0)
  }
})
test('completion trusts only paymentId; owner always comes from canonical server eligibility', async () => {
  const f = fixture(); const handlers = createPortOneHandlers(f.deps)
  assert.equal((await handlers.complete(request('complete', { paymentId: providerId }))).status, 200)
  assert.deepEqual(f.calls[0], ['complete', providerId, owner])
  assert.equal((await handlers.complete(request('complete', { paymentId: providerId, amount: 1 }))).status, 400)
})
test('signed raw webhook re-fetches payment and ignores untrusted amount/owner fields', async () => {
  const f = fixture(); const handlers = createPortOneHandlers(f.deps)
  const req = request('webhook', { type: 'Transaction.Paid', amount: 1, user: 'evil' }, { 'webhook-id': 'evt-test', 'webhook-timestamp': '123', 'webhook-signature': 'v1,test' })
  assert.equal((await handlers.webhook(req)).status, 200)
  assert.deepEqual(f.calls[1], ['complete', providerId, undefined])
  assert.match((f.calls[0] as string[])[1], /"amount":1/)
})
test('signed cancellation webhook also re-fetches authoritative state rather than trusting event amounts', async () => {
  const f = fixture()
  f.deps.verifyWebhook = async () => ({ type: 'Transaction.Cancelled', data: { paymentId: providerId, storeId: config.storeId } })
  const response = await createPortOneHandlers(f.deps).webhook(request('webhook', { amount: 1 }, {
    'webhook-id': 'evt-test', 'webhook-timestamp': '123', 'webhook-signature': 'v1,test' }))
  assert.equal(response.status, 200)
  assert.deepEqual(f.calls[0], ['complete', providerId, undefined])
})
test('signed dispute creation and resolution re-fetch payment instead of trusting event dispute fields', async () => {
  for (const type of ['Transaction.DisputeCreated', 'Transaction.DisputeResolved']) {
    const f = fixture()
    f.deps.verifyWebhook = async () => ({ type, data: { paymentId: providerId, storeId: config.storeId } })
    assert.equal((await createPortOneHandlers(f.deps).webhook(request('webhook', { disputes: [] }, {
      'webhook-id': 'evt-test', 'webhook-timestamp': '123', 'webhook-signature': 'v1,test' }))).status, 200)
    assert.deepEqual(f.calls[0], ['complete', providerId, undefined])
  }
})
test('bad signatures, store mismatches, wrong event types and missing signature headers never reconcile', async () => {
  for (const invalid of ['signature', 'store', 'type', 'header']) {
    const f = fixture()
    if (invalid === 'signature') f.deps.verifyWebhook = async () => { throw new Error('secret provider detail') }
    if (invalid === 'store') f.deps.verifyWebhook = async () => ({ type: 'Transaction.Paid', data: { paymentId: providerId, storeId: 'evil' } })
    if (invalid === 'type') f.deps.verifyWebhook = async () => ({ type: 'BillingKey.Issued', data: { paymentId: providerId, storeId: config.storeId } })
    const response = await createPortOneHandlers(f.deps).webhook(request('webhook', {}, invalid === 'header' ? {} : { 'webhook-id': 'evt-test', 'webhook-timestamp': '123', 'webhook-signature': 'v1,test' }))
    assert.ok(response.status >= 400)
    assert.equal(f.calls.some((call) => (call as unknown[])[0] === 'complete'), false)
    assert.doesNotMatch(await response.text(), /secret|provider detail/)
  }
})
test('process-local account rate limits are bounded and return Retry-After', async () => {
  const f = fixture(); const handlers = createPortOneHandlers(f.deps)
  let response: Response | undefined
  for (let i = 0; i < 12; i++) response = await handlers.complete(request('complete', { paymentId: providerId }))
  assert.equal(response?.status, 429)
  assert.equal(response?.headers.get('Retry-After'), '60')
})
test('disabled config/catalogue and unexpected failures expose no configuration or provider detail', async () => {
  const f = fixture()
  const disabled = createPortOneHandlers({ ...f.deps, config: null })
  assert.equal((await disabled.prepare(request('prepare', { quantity: 1, attemptId }))).status, 503)
  const missing = createPortOneHandlers({ ...f.deps, catalogue: null })
  assert.equal((await missing.prepare(request('prepare', { quantity: 1, attemptId }))).status, 503)
  f.deps.complete = async () => { throw new Error('secret-api provider failure') }
  const response = await createPortOneHandlers(f.deps).complete(request('complete', { paymentId: providerId }))
  assert.equal(response.status, 503)
  assert.doesNotMatch(await response.text(), /secret-api|provider failure/)
})

test('unpublished merchant disclosures and unverified channel block prepare without blocking recovery', async () => {
  for (const gate of ['publication', 'channel']) {
    const f = fixture()
    if (gate === 'publication') f.deps.publicationReady = () => false
    else f.deps.verifyTestChannel = async () => false
    const handlers = createPortOneHandlers(f.deps)
    assert.equal((await handlers.prepare(request('prepare', { quantity: 1, attemptId }))).status, 503)
    assert.equal(f.calls.some((call) => (call as unknown[])[0] === 'prepare'), false)
    assert.equal((await handlers.complete(request('complete', { paymentId: providerId }))).status, 200)
    assert.equal((await handlers.webhook(request('webhook', {}, {
      'webhook-id': 'evt-test', 'webhook-timestamp': '123', 'webhook-signature': 'v1,test' }))).status, 200)
  }
})
