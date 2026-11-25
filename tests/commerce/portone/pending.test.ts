import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload'
import { commerceSnapshotHash } from '../../../src/lib/commerce/snapshot-hash'
import { createPendingEndpoint } from '../../../src/lib/commerce/portone/pending'

const customerID = '91b6495b-479b-4306-98f1-83b729807aea'
const otherID = '91b6495b-479b-4306-98f1-83b729807aeb'
const productID = '91b6495b-479b-4306-98f1-83b729807aec'
const cartID = '91b6495b-479b-4306-98f1-83b729807aed'
const row = (id = '91b6495b-479b-4306-98f1-83b729807aee') => ({ id, customer: customerID, cart: cartID,
  amount: 12345, currency: 'KRW', status: 'pending', commerceReviewHold: false, commerceResolutionConflict: false, paymentMethod: 'portone',
  items: [{ product: productID, quantity: 1 }], portone: { paymentID: id.replaceAll('-', ''), snapshotHash: 'a'.repeat(64),
    prepareKey: 'private-attempt-key', snapshot: { orderName: 'PREVIEW Premium edition', shippingAddress: { addressLine1: 'private address' } } },
  customerEmail: 'private@example.com' })
function fixture(url = 'http://localhost:3000/api/payments/portone/pending', docs = [row()]) {
  let finds = 0
  let query: unknown
  const req = Object.assign(new Request(url, { headers: { 'sec-fetch-site': 'same-origin' } }), {
    user: { id: customerID, collection: 'users' }, payload: { find: async (input: { collection: string }) => {
      finds++
      if (input.collection === 'commerce-reconciliations') return { docs: [], totalDocs: 0 }
      query = input
      return { docs }
    } },
  }) as unknown as PayloadRequest
  return { req, finds: () => finds, query: () => query }
}

test('discovery returns every bounded own pending/processing/held attempt with an explicit non-PII projection', async () => {
  const second = { ...row('91b6495b-479b-4306-98f1-83b729807aef'), status: 'processing' }
  const held = { ...row('91b6495b-479b-4306-98f1-83b729807af0'), status: 'succeeded', commerceReviewHold: true }
  const foreign = { ...row('91b6495b-479b-4306-98f1-83b729807af1'), customer: otherID }
  const f = fixture(`http://localhost:3000/api/payments/portone/pending?productID=${productID}`, [row(), second, held, foreign])
  const result = await createPendingEndpoint(async () => customerID).handler(f.req)
  assert.equal(result.status, 200)
  const data = await result.json()
  assert.equal(data.attempts.length, 3)
  assert.deepEqual(Object.keys(data.attempts[0]).sort(), ['transactionID', 'paymentID', 'cartID', 'productID', 'quantity', 'totalAmount', 'currency', 'status', 'reviewHold', 'resolutionConflict', 'orderName', 'refundTerms'].sort())
  // Only the frozen order name leaves the snapshot; the address and keys stay private.
  assert.equal(data.attempts[0].orderName, 'PREVIEW Premium edition')
  // A snapshot that names no product the refund policy knows is not refundable; only the derived terms leave.
  assert.deepEqual(data.attempts[0].refundTerms, { kind: 'none', reason: 'not-refundable-product' })
  assert.equal(JSON.stringify(data).includes('private'), false)
  assert.equal(JSON.stringify(data).includes(otherID), false)
  assert.equal(data.attempts[2].reviewHold, true)
  assert.equal(JSON.stringify(f.query()).includes(customerID), true)
  // One membership allowance per account: discovery is never narrowed by product.
  assert.equal(JSON.stringify(f.query()).includes('items.product'), false)
  assert.equal(result.headers.get('cache-control'), 'private, no-store')
})

test('terminal held transactions remain history rather than unresolved checkout attempts', async () => {
  const terminal = ['failed', 'cancelled', 'refunded'].map((status) => ({ ...row(), status, commerceReviewHold: true }))
  const f = fixture(undefined, terminal)
  const result = await createPendingEndpoint(async () => customerID).handler(f.req)
  assert.equal(result.status, 200)
  assert.deepEqual((await result.json()).attempts, [])
})

test('terminal payment resolution conflicts stay discoverable until manual resolution', async () => {
  const f = fixture(undefined, [{ ...row(), status: 'failed', commerceReviewHold: true, commerceResolutionConflict: true }])
  const result = await createPendingEndpoint(async () => customerID).handler(f.req)
  assert.equal(result.status, 200)
  const data = await result.json()
  assert.equal(data.attempts.length, 1)
  assert.equal(data.attempts[0].resolutionConflict, true)
})

test('anonymous and mismatched canonical users cannot read the ledger', async () => {
  for (const canonical of [null, otherID]) {
    const f = fixture()
    const result = await createPendingEndpoint(async () => canonical).handler(f.req)
    assert.equal(result.status, 403)
    assert.equal(f.finds(), 0)
    assert.equal(JSON.stringify(await result.json()).includes('private'), false)
  }
})

test('unknown, duplicate, malformed and foreign lookup query input never reaches storage', async () => {
  for (const query of ['customerID=' + otherID, 'paymentID=abc', 'productID=bad', 'productID=',
    `productID=${productID}&productID=${productID}`, `productID=${productID}&secret=leak`]) {
    const f = fixture('http://localhost:3000/api/payments/portone/pending?' + query)
    assert.equal((await createPendingEndpoint(async () => customerID).handler(f.req)).status, 400)
    assert.equal(f.finds(), 0)
  }
})


test('fresh browser discovery retains an exact retired attempt with a signed Paid review case', async () => {
  const f = fixture()
  const terminal = { ...row(), status: 'failed' }
  const snapshot = { version: 1 as const, customerID, cartID, productID, releaseID: "membership" as const, accountLimit: 1, eventID: 'event', quantity: 1,
    currency: 'KRW' as const, unitAmount: terminal.amount, shippingAmount: 0, totalAmount: terminal.amount,
    orderName: 'Fixture', productVersion: 'v1', eventVersion: 'v1', shippingAddress: {
      country: 'KR' as const, recipientName: 'Fixture', phone: '01012345678', postalCode: '01234', addressLine1: 'private address',
    } }
  const snapshotHash = commerceSnapshotHash(snapshot)
  const caseScope = 'reconciliation-paid-review:' + terminal.id
  const ledger = { scope: caseScope, state: { identity: {
    transactionID: terminal.id, paymentID: terminal.portone.paymentID, customerID, cartID, snapshotHash, startedAt: 1,
  }, eventID: 'signed-event', reason: 'budget-stop', recordedAt: 2 } }
  const payload = f.req.payload
  payload.find = (async (args: Parameters<typeof payload.find>[0]) => {
    // Only the case list matches; this attempt has no verified-cancellation disposition.
    const docs = args.collection === 'commerce-reconciliations' ? JSON.stringify(args.where).includes('reconciliation-paid-review:') ? [ledger] : []
      : JSON.stringify(args.where).includes(terminal.id) ? [{ ...terminal, portone: { ...terminal.portone, prepareKey: 'a'.repeat(64), snapshot, snapshotHash, storeID: 'test', channelKey: 'test' } }] : []
    return { docs, totalDocs: docs.length }
  }) as typeof payload.find
  const result = await createPendingEndpoint(async () => customerID).handler(f.req)
  assert.equal(result.status, 200)
  const data = await result.json()
  assert.equal(data.attempts.length, 1)
  assert.equal(data.attempts[0].transactionID, terminal.id)
  assert.equal(data.attempts[0].reviewHold, true)
  assert.equal(data.attempts[0].status, 'failed')
  assert.equal(JSON.stringify(data).includes('signed-event'), false)
  assert.equal(JSON.stringify(data).includes('private address'), false)

  Object.defineProperty(f.req, 'url', { value: `http://localhost:3000/api/payments/portone/pending?productID=${otherID}` })
  const otherProduct = await createPendingEndpoint(async () => customerID).handler(f.req)
  assert.equal(otherProduct.status, 200)
  // One membership allowance per account: the case blocks every product, so it stays visible.
  assert.equal((await otherProduct.json()).attempts[0].transactionID, terminal.id)

  // A broken case-to-row binding is unavailable, never a clean empty ledger.
  ledger.state.identity.snapshotHash = 'b'.repeat(64)
  assert.equal((await createPendingEndpoint(async () => customerID).handler(f.req)).status, 503)
})

test('each attempt carries the refund terms of its frozen snapshot; a guest ticket reads its event once, open or closed', async () => {
  const eventID = '91b6495b-479b-4306-98f1-83b729807b00'
  const day = 24 * 60 * 60 * 1000
  const snapshotted = (id: string, snapshot: Record<string, unknown>) => { const value = row(id); return { ...value, portone: { ...value.portone, snapshot: { orderName: 'PREVIEW', ...snapshot } } } }
  const docs = [
    snapshotted('91b6495b-479b-4306-98f1-83b729807b01', { version: 3, kind: 'guest-ticket-v1', eventID }),
    snapshotted('91b6495b-479b-4306-98f1-83b729807b02', { version: 3, kind: 'guest-ticket-v1', eventID }),
    snapshotted('91b6495b-479b-4306-98f1-83b729807b03', { version: 2, eventID: null, editionEntitlements: { membershipSignet: false, freeLaunchTicket: false } }),
    snapshotted('91b6495b-479b-4306-98f1-83b729807b04', { version: 2, eventID, editionEntitlements: { membershipSignet: true, freeLaunchTicket: true } }),
  ]
  for (const [startsIn, expected] of [[4 * day, 'until'], [2 * day, 'closed']] as const) {
    const partIStartsAt = new Date(Date.now() + startsIn).toISOString()
    let eventReads = 0
    const req = Object.assign(new Request('http://localhost:3000/api/payments/portone/pending', { headers: { 'sec-fetch-site': 'same-origin' } }), {
      user: { id: customerID, collection: 'users' }, payload: {
        find: async (input: { collection: string }) => input.collection === 'commerce-reconciliations' ? { docs: [], totalDocs: 0 } : { docs },
        findByID: async (input: { collection: string; id: string; select?: unknown }) => {
          assert.equal(input.collection, 'commerce-events'); assert.equal(input.id, eventID); assert.deepEqual(input.select, { partIStartsAt: true })
          eventReads++
          return { id: eventID, partIStartsAt }
        } },
    }) as unknown as PayloadRequest
    const result = await createPendingEndpoint(async () => customerID).handler(req)
    assert.equal(result.status, 200)
    const terms = (await result.json()).attempts.map((attempt: { refundTerms: unknown }) => attempt.refundTerms)
    const cutoffAt = new Date(new Date(partIStartsAt).getTime() - 3 * day).toISOString()
    assert.deepEqual(terms, [{ kind: expected, cutoffAt }, { kind: expected, cutoffAt },
      { kind: 'refundable' }, { kind: 'none', reason: 'personalised-edition' }])
    assert.equal(eventReads, 1)
  }
})
