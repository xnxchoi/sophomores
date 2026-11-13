import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { APIError, type PayloadRequest } from 'payload'
import { createResultEndpoint } from '../../../src/lib/commerce/portone/result'
import { commerceSnapshotHash } from '../../../src/lib/commerce/snapshot-hash'
import { createAdapterEndpoints } from '../../../src/lib/commerce/portone/endpoints'

const transactionID = '91b6495b-479b-4306-98f1-83b729807aea'
const cartID = '91b6495b-479b-4306-98f1-83b729807aeb'
const orderID = '91b6495b-479b-4306-98f1-83b729807aec'
const paymentID = transactionID.replaceAll('-', '')
const customerID = 'buyer'
const snapshot = { version: 1 as const, customerID, cartID, productID: 'product', releaseID: 'product', eventID: 'event',
  quantity: 1, currency: 'KRW' as const, unitAmount: 45000, shippingAmount: 0, totalAmount: 45000,
  orderName: 'Product', productVersion: 'v1', eventVersion: 'v1', shippingAddress: {
    country: 'KR' as const, recipientName: 'Private Recipient', phone: '01012345678', postalCode: '01234', addressLine1: 'Private Address' } }
const snapshotHash = commerceSnapshotHash(snapshot)
const url = `http://localhost:3000/api/payments/portone/result?transactionID=${transactionID}&paymentID=${paymentID}&cartID=${cartID}`
type Row = Record<string, any> // Test-only corruption fixtures deliberately exercise unknown persisted shapes.
function fixture() {
  const transaction: Row = { id: transactionID, customer: customerID, cart: cartID, status: 'succeeded', order: orderID,
    paymentMethod: 'portone', amount: 45000, currency: 'KRW', items: [{ product: 'product', quantity: 1 }],
    commerceReviewHold: false, commerceResolutionConflict: false,
    portone: { paymentID, prepareKey: 'a'.repeat(64), snapshot, snapshotHash, storeID: 'store', channelKey: 'channel' } }
  const order: Row = { id: orderID, customer: customerID, commerceVersion: 'commerce-v1', commerceAttemptID: transactionID,
    commerceSnapshot: snapshot, transactions: [transactionID], amount: 45000, currency: 'KRW', status: 'processing',
    items: [{ product: 'product', quantity: 1 }], shippingAddress: snapshot.shippingAddress, customerEmail: 'fixture@example.invalid' }
  const reservation: Row = { id: 'reservation', attemptID: transactionID, customer: customerID, product: 'product', releaseID: 'product',
    event: 'event', quantity: 1, snapshotHash, state: 'settled', order: orderID }
  const admission: Row = { id: 'admission', order: orderID, transaction: transactionID, event: 'event', buyer: customerID,
    unit: 1, orderUnitKey: `${orderID}:1`, status: 'available', benefitReview: false }
  const rows: Record<string, Row[]> = { transactions: [transaction], orders: [order], 'commerce-reservations': [reservation],
    'commerce-admissions': [admission], 'commerce-allowances': [{ id: 'allowance', customer: customerID, releaseID: 'product', paidQuantity: 1, reservedQuantity: 0 }],
    products: [{ id: 'product', inventory: 0, reservedQuantity: 0 }],
    'commerce-events': [{ id: 'event', capacity: 10, committedQuantity: 1, reservedQuantity: 0 }],
    carts: [{ id: cartID, customer: customerID, purchasedAt: '2026-11-13T00:00:00Z' }] }
  const calls: string[] = []
  const forbidden = async () => { calls.push('MUTATION'); throw new Error('Forbidden mutation') }
  const req = Object.assign(new Request(url), { user: { id: customerID, collection: 'users' }, payload: {
    find: async ({ collection, where }: { collection: string; where: unknown }) => {
      calls.push(collection)
      if (collection === 'transactions') assert.ok(JSON.stringify(where).includes(customerID), 'owner-scoped transaction query')
      return { docs: structuredClone(rows[collection] ?? []), totalDocs: (rows[collection] ?? []).length }
    },
    findByID: async ({ collection }: { collection: string }) => { calls.push(collection); return structuredClone(rows[collection]?.[0]) },
    create: forbidden, update: forbidden, delete: forbidden, db: new Proxy({}, { get: () => forbidden }),
  } }) as unknown as PayloadRequest
  return { req, rows, transaction, order, reservation, admission, calls }
}
const read = (f: ReturnType<typeof fixture>, authorize: (req: PayloadRequest) => Promise<string | null> = async () => customerID) => createResultEndpoint(authorize).handler(f.req)

test('GET recovers exact own succeeded order and snapshot without provider, finalizer or domain writes', async () => {
  const f = fixture()
  const before = JSON.stringify(f.rows)
  const result = await read(f)
  assert.equal(result.status, 200)
  assert.deepEqual(await result.json(), { outcome: 'confirmed', transactionID, paymentID, cartID, orderID, snapshot, assurance: 'local-consistency' })
  assert.equal(JSON.stringify(f.rows), before)
  assert.equal(f.calls.includes('MUTATION'), false)
  assert.equal(result.headers.get('cache-control'), 'private, no-store')
  assert.equal(result.headers.get('referrer-policy'), 'no-referrer')
  const source = readFileSync(new URL('../../../src/lib/commerce/portone/result.ts', import.meta.url), 'utf8')
  assert.equal(/\bproviderPayment\b|finalizeOrder|withCommerceWrite|lockReservationContext|\.payload\.(create|update|delete)\(/.test(source), false)
})

test('missing and foreign rows disclose identical absence, even when foreign rows are malformed', async () => {
  const missing = fixture(); missing.rows.transactions = []
  const foreign = fixture(); foreign.transaction.customer = 'foreign'; foreign.transaction.portone = { secret: 'hidden' }
  const a = await read(missing); const b = await read(foreign)
  assert.equal(a.status, b.status)
  assert.deepEqual(await a.json(), { outcome: 'unavailable' })
  assert.deepEqual(await b.json(), { outcome: 'unavailable' })
  assert.deepEqual(foreign.calls, ['transactions'])
})

test('non-GET and untrusted query never reach reads; anonymous and canonical mismatch share private refusal', async () => {
  const f = fixture(); Object.defineProperty(f.req, 'method', { value: 'POST' })
  assert.equal((await read(f)).status, 405); assert.deepEqual(f.calls, [])
  for (const suffix of ['&extra=x', '&cartID=' + cartID, '#fragment']) {
    const f = fixture(); Object.defineProperty(f.req, 'url', { value: url + suffix })
    assert.equal((await read(f)).status, 400); assert.deepEqual(f.calls, [])
  }
  for (const owner of [null, 'foreign']) {
    const f = fixture(); const res = await read(f, async () => owner)
    assert.equal(res.status, 403); assert.deepEqual(await res.json(), { outcome: 'authentication-required' }); assert.deepEqual(f.calls, [])
  }
})

test('pending and processing are local unresolved, never provider-processing or failed', async () => {
  for (const status of ['pending', 'processing']) {
    const f = fixture(); f.transaction.status = status; f.transaction.order = null; f.rows.orders = []
    f.reservation.state = 'reserved'; delete f.reservation.order
    assert.deepEqual(await (await read(f)).json(), { outcome: 'local-unresolved' })
  }
})

test('terminal statuses stay exact and disclose no private snapshot', async () => {
  for (const status of ['failed', 'cancelled', 'refunded']) {
    const f = fixture(); f.transaction.status = status
    assert.deepEqual(await (await read(f)).json(), { outcome: 'local-terminal', status })
  }
})

test('holds and conflicts stop before ordinary confirmation and disclose at most the validated own order reference', async () => {
  for (const key of ['commerceReviewHold', 'commerceResolutionConflict']) {
    const f = fixture(); f.transaction[key] = true
    const data = await (await read(f)).json()
    assert.equal(data.outcome, 'review-required'); assert.equal(data.orderID, orderID)
    assert.equal(JSON.stringify(data).includes('Private'), false)
  }
  const f = fixture(); f.transaction.commerceReviewHold = true; f.order.customer = 'foreign'
  assert.deepEqual(await (await read(f)).json(), { outcome: 'integrity-stop' })
})

const corruptions: [string, (f: ReturnType<typeof fixture>) => void][] = [
  ['order missing', f => { f.rows.orders = [] }],
  ['duplicate order', f => { f.rows.orders.push({ ...f.order, id: 'duplicate' }) }],
  ['wrong order backlink', f => { f.order.transactions = [] }],
  ['extra transaction backlink', f => { f.order.transactions.push('another') }],
  ['wrong attempt', f => { f.order.commerceAttemptID = 'foreign' }],
  ['foreign snapshot', f => { f.order.commerceSnapshot = { ...snapshot, customerID: 'foreign' } }],
  ['wrong hash', f => { f.transaction.portone.snapshotHash = 'b'.repeat(64) }],
  ['wrong item', f => { f.order.items = [{ product: 'other', quantity: 1 }] }],
  ['wrong amount', f => { f.order.amount = 1 }],
  ['wrong currency', f => { f.order.currency = 'USD' }],
  ['missing reservation', f => { f.rows['commerce-reservations'] = [] }],
  ['duplicate reservation', f => { f.rows['commerce-reservations'].push({ ...f.reservation }) }],
  ['released reservation', f => { f.reservation.state = 'released' }],
  ['wrong reservation owner', f => { f.reservation.customer = 'foreign' }],
  ['wrong reservation snapshot', f => { f.reservation.snapshotHash = 'c'.repeat(64) }],
  ['partial grants', f => { f.rows['commerce-admissions'] = [] }],
  ['extra grants', f => { f.rows['commerce-admissions'].push({ ...f.admission, id: 'extra' }) }],
  ['foreign grant', f => { f.admission.buyer = 'foreign' }],
  ['wrong grant linkage', f => { f.admission.transaction = 'foreign' }],
  ['wrong grant unit', f => { f.admission.unit = 2 }],
  ['unsettled allowance', f => { f.rows['commerce-allowances'][0].paidQuantity = 0 }],
  ['unsettled event', f => { f.rows['commerce-events'][0].committedQuantity = 0 }],
  ['missing product', f => { f.rows.products = [] }],
  ['unpurchased cart', f => { delete f.rows.carts[0].purchasedAt }],
  ['foreign cart', f => { f.rows.carts[0].customer = 'foreign' }],
]
for (const [name, corrupt] of corruptions) test(`partial/corrupt ${name} is an integrity stop with no repair or disclosure`, async () => {
  const f = fixture(); corrupt(f)
  assert.deepEqual(await (await read(f)).json(), { outcome: 'integrity-stop' })
  assert.equal(f.calls.includes('MUTATION'), false)
})

test('benefit review and cancelled order are review stops, never ordinary confirmed', async () => {
  const f = fixture(); f.admission.benefitReview = true
  assert.equal((await (await read(f)).json()).outcome, 'review-required')
  const g = fixture(); g.order.status = 'cancelled'
  assert.equal((await (await read(g)).json()).outcome, 'review-required')
})

test('tuple mismatch, uncommitted session, changed identity and late row mutation fail closed', async () => {
  const f = fixture(); Object.defineProperty(f.req, 'url', { value: url.replace(cartID, orderID) })
  assert.deepEqual(await (await read(f)).json(), { outcome: 'integrity-stop' })
  const g = fixture(); g.req.transactionID = 'uncommitted'
  assert.deepEqual(await (await read(g)).json(), { outcome: 'completion-unknown' })
  const h = fixture(); const original = h.req.payload.findByID
  h.req.payload.findByID = (async (input: any) => { const value = await original(input); h.req.user = { id: 'foreign', collection: 'users' } as PayloadRequest['user']; return value }) as typeof original
  assert.deepEqual(await (await read(h)).json(), { outcome: 'authentication-required' })
  const j = fixture(); const find = j.req.payload.find
  j.req.payload.find = (async (input: any) => { const value = await find(input); if (input.collection === 'commerce-admissions') j.transaction.commerceReviewHold = true; return value }) as typeof find
  assert.notEqual((await (await read(j)).json()).outcome, 'confirmed')
})

test('auth, rate and unavailable authority stops never become payment failure', async () => {
  for (const [status, outcome] of [[401, 'authentication-required'], [403, 'authentication-required'], [429, 'rate-stop'], [503, 'authority-stop']] as const) {
    const f = fixture(); const res = await read(f, async () => { throw new APIError('private reason', status) })
    assert.deepEqual(await res.json(), { outcome }); assert.deepEqual(f.calls, [])
  }
})

test('result endpoint is registered and the exact pending/webhook read bypass remains unchanged', () => {
  assert.equal(createAdapterEndpoints({}).filter(e => e.path === '/result' && e.method === 'get').length, 1)
  const source = readFileSync(new URL('../../../src/lib/commerce/ecommerce.ts', import.meta.url), 'utf8')
  assert.equal(/endpoint\.path\.endsWith\("\/webhooks"\) \|\| endpoint\.path\.endsWith\("\/pending"\) \|\| endpoint\.path\.endsWith\("\/result"\)/.test(source), true)
})

test('claimed admission remains recoverable, but a forged assigned status is not an alias', async () => {
  const f = fixture(); f.admission.status = 'claimed'
  assert.equal((await (await read(f)).json()).outcome, 'confirmed')
  const g = fixture(); g.admission.status = 'assigned'
  assert.equal((await (await read(g)).json()).outcome, 'integrity-stop')
})
