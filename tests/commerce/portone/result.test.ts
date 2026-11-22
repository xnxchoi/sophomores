import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { APIError, type PayloadRequest } from 'payload'
import { createResultEndpoint } from '../../../src/lib/commerce/portone/result'
import { commerceSnapshotHash } from '../../../src/lib/commerce/snapshot-hash'
import { runReconciliation } from '../../../src/lib/commerce/portone/admission'
import { createAdapterEndpoints } from '../../../src/lib/commerce/portone/endpoints'
import { commercePlugin, secureCommerceEndpoint } from '../../../src/lib/commerce/ecommerce'
import { AttemptPrincipalChanged } from '../../../src/lib/commerce/portone/adapter'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { nativeTransactionFixture } from '../core/native-transaction-fixture'
import { installEndpointLedger } from './endpoint-ledger-fixture'

const transactionID = '91b6495b-479b-4306-98f1-83b729807aea'
const cartID = '91b6495b-479b-4306-98f1-83b729807aeb'
const orderID = '91b6495b-479b-4306-98f1-83b729807aec'
const paymentID = transactionID.replaceAll('-', '')
const customerID = 'buyer'
const snapshot = { version: 1 as const, customerID, cartID, productID: 'product', releaseID: 'membership' as const, accountLimit: 1, eventID: 'event',
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
  const reservation: Row = { id: 'reservation', attemptID: transactionID, customer: customerID, product: 'product', releaseID: 'membership',
    event: 'event', quantity: 1, snapshotHash, state: 'settled', order: orderID }
  const admission: Row = { id: 'admission', order: orderID, transaction: transactionID, event: 'event', buyer: customerID,
    unit: 1, orderUnitKey: `${orderID}:1`, status: 'available', benefitReview: false }
  const rows: Record<string, Row[]> = { transactions: [transaction], orders: [order], 'commerce-reservations': [reservation],
    'commerce-admissions': [admission], 'commerce-allowances': [{ id: 'allowance', customer: customerID, releaseID: 'membership', paidQuantity: 1, reservedQuantity: 0 }],
    products: [{ id: 'product', inventory: 0, reservedQuantity: 0 }],
    'commerce-events': [{ id: 'event', capacity: 10, committedQuantity: 1, reservedQuantity: 0 }],
    carts: [{ id: cartID, customer: customerID, purchasedAt: '2026-11-13T00:00:00Z' }] }
  const calls: string[] = []
  const forbidden = async () => { calls.push('MUTATION'); throw new Error('Forbidden mutation') }
  const req = Object.assign(new Request(url), { user: { id: customerID, collection: 'users' }, payload: {
    find: async ({ collection, where }: { collection: string; where: unknown }) => {
      calls.push(collection)
      if (collection === 'transactions') assert.ok(JSON.stringify(where).includes(customerID), 'owner-scoped transaction query')
      const all = rows[collection] ?? []
      if (collection === 'commerce-reconciliations') {
        const clauses: Row[] = (where as Row).and ?? [where]
        const matches = all.filter(row => clauses.every(clause => clause.scope
          ? clause.scope.equals !== undefined ? row.scope === clause.scope.equals : row.scope.includes(clause.scope.contains)
          : clause['state.event.type'] ? row.state?.event?.type === clause['state.event.type'].equals
            : clause.createdAt ? row.createdAt > clause.createdAt.greater_than : false))
        return { docs: structuredClone(matches), totalDocs: matches.length }
      }
      const selected = collection === 'orders' && JSON.stringify(where).includes('commerceVersion')
        ? all.filter(row => row.commerceVersion === 'commerce-v1') : all
      return { docs: structuredClone(selected), totalDocs: selected.length }
    },
    findByID: async ({ collection }: { collection: string }) => { calls.push(collection); return structuredClone(rows[collection]?.[0]) },
    create: forbidden, update: forbidden, delete: forbidden, db: new Proxy({}, { get: () => forbidden }),
  } }) as unknown as PayloadRequest
  return { req, rows, transaction, order, reservation, admission, calls }
}
const read = (f: ReturnType<typeof fixture>, authorize: (req: PayloadRequest) => Promise<string | null> = async () => customerID) => createResultEndpoint(authorize).handler(f.req)

// Exact field shape observed after the official plugin persisted an I0DB order.
function persistedAddress() {
  return { title: null, firstName: null, lastName: null, company: null, city: null, state: null,
    addressLine2: null, addressLine1: snapshot.shippingAddress.addressLine1, postalCode: snapshot.shippingAddress.postalCode,
    phone: snapshot.shippingAddress.phone, country: snapshot.shippingAddress.country }
}

test('real plugin order address decodes nullable fields without leaking plugin-only fields', async () => {
  const f = fixture()
  f.order.shippingAddress = { ...persistedAddress(), company: 'never-project-this' }
  const result = await read(f)
  assert.equal(result.status, 200)
  const body = await result.json()
  assert.equal(body.outcome, 'confirmed')
  assert.deepEqual(body.snapshot.shippingAddress, snapshot.shippingAddress)
  assert.equal(JSON.stringify(body).includes('never-project-this'), false)
})

test('order address comparison remains strict on every entered field, including snapshot-only fields', async () => {
  for (const [field, value] of Object.entries({ country: 'US', phone: '01099998888', postalCode: '54321',
    addressLine1: 'Different address', addressLine2: 'Different unit' })) {
    const f = fixture()
    f.order.shippingAddress = { ...persistedAddress(), [field]: value }
    assert.equal((await read(f)).status, 503, field)
  }
  for (const field of ['recipientName', 'deliveryInstructions']) {
    const f = fixture()
    f.order.shippingAddress = persistedAddress()
    f.order.commerceSnapshot = { ...snapshot, shippingAddress: { ...snapshot.shippingAddress, [field]: 'Different value' } }
    assert.equal((await read(f)).status, 503, field)
  }
  const f = fixture()
  const withUnit = { ...snapshot, shippingAddress: { ...snapshot.shippingAddress, addressLine2: 'Unit 2', deliveryInstructions: 'Call on arrival' } }
  f.transaction.portone = { ...f.transaction.portone, snapshot: withUnit, snapshotHash: commerceSnapshotHash(withUnit) }
  f.order.commerceSnapshot = withUnit
  f.reservation.snapshotHash = commerceSnapshotHash(withUnit)
  f.order.shippingAddress = { ...persistedAddress(), addressLine2: 'Unit 2' }
  assert.equal((await read(f)).status, 200)
  f.order.shippingAddress.addressLine2 = null
  assert.equal((await read(f)).status, 503, 'a supplied second address line cannot disappear')
})

async function settledWebhook(f: ReturnType<typeof fixture>) {
  const now = Date.now(), start = now - 31 * 60000
  f.rows.users = [{ id: customerID, email: 'fixture@example.invalid' }]
  const native = await nativeTransactionFixture({ queryRows: text => text.includes('reconciliation_started')
    ? [{ reconciliation_started: String(start) }] : text.includes('reconciliation_now')
      ? [{ reconciliation_now: String(now) }] : text.includes('reconciliation_locked') ? [{ reconciliation_locked: true }] : [] })
  f.req.payload.db = native.adapter as unknown as PayloadRequest['payload']['db']
  const ledger = installEndpointLedger(f.req)
  const config = { mode: "test" as const, origin: 'http://localhost:3000', storeId: 'store', channelKey: 'channel',
    apiSecret: 'synthetic', webhookSecret: 'synthetic', localKpnTestCheckout: true }
  const event = { type: 'Transaction.Paid', data: { paymentId: paymentID, storeId: 'store' } }
  const request = Object.assign(new Request(config.origin + '/api/payments/portone/webhooks', { method: 'POST',
    headers: { 'content-type': 'application/json', 'webhook-id': 'settled-paid', 'webhook-timestamp': '1', 'webhook-signature': 'synthetic' },
    body: JSON.stringify(event) }), { payload: f.req.payload, user: null, context: {} }) as unknown as PayloadRequest
  const endpoint = createAdapterEndpoints({ config, verifyWebhook: async () => event,
    getPayment: async () => { throw new Error('No GET for settled ingress') } }).find(e => e.path === '/webhooks')!
  return { response: await endpoint.handler(request), ledger }
}

test('a consistent settled attempt acknowledges late Paid ingress without admission, escalation or GET', async () => {
  const { response, ledger } = await settledWebhook(fixture())
  assert.equal(response.status, 200)
  const rows = [...ledger.values()]
  assert.equal(rows.length, 1)
  assert.match(rows[0].scope, /^reconciliation-event:/)
  assert.equal((rows[0].state as { event: { id: string } }).event.id, 'settled-paid')
})

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

test('legacy rows referencing the payment do not contaminate commerce-v1 replay cardinality', async () => {
  const f = fixture()
  f.rows.orders.push({ id: 'legacy-order', customer: customerID, commerceVersion: 'legacy',
    transactions: [transactionID], status: 'completed' })
  const result = await read(f)
  assert.equal(result.status, 200)
  assert.deepEqual(await result.json(), { outcome: 'confirmed', transactionID, paymentID, cartID, orderID, snapshot, assurance: 'local-consistency' })
  assert.equal(f.calls.includes('MUTATION'), false)
})

test('a forward link to a legacy order is rejected on the local GET and signed Paid replay', async () => {
  for (const withCanonical of [true, false]) {
    const f = fixture()
    const legacyID = '91b6495b-479b-4306-98f1-83b729807aed'
    f.transaction.order = legacyID
    const legacy = { ...f.order, id: legacyID, commerceVersion: 'legacy' }
    f.rows.orders = withCanonical ? [f.order, legacy] : [legacy]
    const result = await read(f)
    assert.equal(result.status, 503)
    assert.deepEqual(await result.json(), { outcome: 'integrity-stop' })
    assert.equal((await settledWebhook(f)).response.status, 409)
  }
})

test('a durable signed Paid review case stops a misleading terminal read without proving a charge', async () => {
  const f = fixture()
  f.transaction.status = 'failed'
  f.transaction.order = null
  f.reservation.state = 'released'
  f.reservation.order = null
  f.rows.orders = []
  f.rows['commerce-admissions'] = []
  f.rows['commerce-reconciliations'] = [{ id: 'case', scope: `reconciliation-paid-review:${transactionID}`, state: {
    identity: { transactionID, paymentID, cartID, customerID, snapshotHash, startedAt: 1 },
    eventID: 'signed-paid', reason: 'lifetime-stop', recordedAt: 2,
  } }]
  assert.deepEqual(await (await read(f)).json(), { outcome: 'review-required' })
})

test('only the exact canonical settlement satisfies an immutable Paid review case', async () => {
  const { readPortOneTransaction } = await import('../../../src/lib/commerce/portone/adapter')
  const { hasUnresolvedPaidReview } = await import('../../../src/lib/commerce/portone/review')
  const f = fixture()
  f.rows['commerce-reconciliations'] = [{ id: 'case', scope: `reconciliation-paid-review:${transactionID}`, state: {
    identity: { transactionID, paymentID, cartID, customerID, snapshotHash, startedAt: 1 },
    eventID: 'signed-paid', reason: 'signed-paid-pending', recordedAt: 2,
  } }]
  assert.equal(await hasUnresolvedPaidReview(f.req, await readPortOneTransaction(f.req, paymentID)), false)
  f.transaction.status = 'failed'
  f.transaction.order = null
  assert.equal(await hasUnresolvedPaidReview(f.req, await readPortOneTransaction(f.req, paymentID)), true)
  assert.equal((await (await read(f)).json()).outcome, 'review-required')
  assert.equal(f.rows['commerce-reconciliations'].length, 1)
  assert.equal(f.calls.includes('MUTATION'), false)
})

test('the latest verified full cancellation closes a Paid case unless a contradiction followed it', async () => {
  const { readPortOneTransaction } = await import('../../../src/lib/commerce/portone/adapter')
  const { hasUnresolvedPaidReview } = await import('../../../src/lib/commerce/portone/review')
  const { reconciliationEventScope } = await import('../../../src/lib/commerce/portone/accounting')
  const f = fixture()
  f.transaction.status = 'cancelled'
  f.transaction.commerceReviewHold = true
  const identity = { transactionID, paymentID, cartID, customerID, snapshotHash }
  const paidCase = { id: 'case', scope: `reconciliation-paid-review:${transactionID}`, state: {
    identity: { ...identity, startedAt: 1 }, eventID: 'a', reason: 'signed-paid-pending', recordedAt: 2 } }
  const disposition = (sequence: number, events: string[], conflictAtCancellation = false, contradictionsAtCancellation = 0) => ({ id: `disposition-${sequence}`,
    scope: `reconciliation-paid-disposition:${transactionID}:${sequence}`, state: { identity, sequence,
      disposition: 'verified-full-cancellation', evidenceID: `cancel-${sequence}`, conflictAtCancellation,
      paidEventsAtCancellation: events, contradictionsAtCancellation, recordedAt: 3 } })
  const contradiction = (sequence: number, afterDispositions: number) => ({ id: `contradiction-${sequence}`,
    scope: `reconciliation-paid-contradiction:${transactionID}:${sequence}`, state: { identity, sequence,
      evidenceID: `provider-get:${sequence}`, afterDispositions, recordedAt: 4 } })
  // Same-millisecond timestamps on purpose: ordering comes from the recorded Paid set, not the clock.
  const paidEvent = (id: string) => ({ id, scope: reconciliationEventScope(transactionID, id), createdAt: '2026-11-22T01:00:00.000Z',
    state: { identity: paidCase.state.identity, event: { id, type: 'Transaction.Paid' } } })
  const unresolved = async () => hasUnresolvedPaidReview(f.req, await readPortOneTransaction(f.req, paymentID))
  const ledger = (...rows: Row[]) => { f.rows['commerce-reconciliations'] = [paidCase, ...rows] }
  // A bare cancelled status is not a disposition.
  ledger(paidEvent('a'))
  assert.equal(await unresolved(), true)
  ledger(paidEvent('a'), disposition(1, ['a']))
  assert.equal(await unresolved(), false)
  // /result agrees: the closed cancellation is final, so a saved browser attempt can clear.
  assert.deepEqual(await (await read(f)).json(), { outcome: 'local-terminal', status: 'cancelled' })
  // A conflict raised after the cancellation reopens it; one settled by the cancellation does not.
  f.transaction.commerceResolutionConflict = true
  assert.equal(await unresolved(), true)
  f.transaction.status = 'failed'
  ledger(paidEvent('a'), disposition(1, ['a'], true))
  assert.equal(await unresolved(), false)
  // A signed Paid the cancellation did not account for is a fresh contradiction.
  ledger(paidEvent('a'), paidEvent('b'), disposition(1, ['a'], true))
  assert.equal(await unresolved(), true)
  assert.equal((await (await read(f)).json()).outcome, 'review-required')
  // A later, distinct verified full cancellation resolves it again.
  ledger(paidEvent('a'), paidEvent('b'), disposition(1, ['a'], true), disposition(2, ['a', 'b'], true))
  assert.equal(await unresolved(), false)
  // A contradiction recorded after the latest cancellation reopens it, even with the conflict flag already set
  // and no new signed Paid; one the cancellation accounted for does not.
  ledger(paidEvent('a'), disposition(1, ['a'], true), contradiction(1, 1))
  assert.equal(await unresolved(), true)
  ledger(paidEvent('a'), contradiction(1, 0), disposition(1, ['a'], true, 1))
  assert.equal(await unresolved(), false)
  ledger(paidEvent('a'), disposition(1, ['a'], true), contradiction(1, 1), disposition(2, ['a'], true, 1))
  assert.equal(await unresolved(), false)
  // A gap in the sequence or a foreign identity is an integrity stop, never a clean read.
  ledger(paidEvent('a'), disposition(2, ['a'], true))
  await assert.rejects(unresolved(), /sequence gap/)
  ledger(paidEvent('a'), { ...disposition(1, ['a'], true), state: { ...disposition(1, ['a'], true).state,
    identity: { ...identity, snapshotHash: 'f'.repeat(64) } } })
  await assert.rejects(unresolved(), /identity mismatch/)
  assert.equal(f.calls.includes('MUTATION'), false)
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

test('a principal that changes during the owned read is an authentication stop, never absence', async () => {
  // S0c-1: foreign and missing stay identical for a stable principal (above); a change of the
  // signed-in member mid-read must not tell the member authorized at entry that their attempt is gone.
  for (const changeOnRead of [1, 2]) {
    const f = fixture(); const original = f.req.payload.findByID; let reads = 0
    f.req.payload.findByID = (async (input: any) => {
      const value = await original(input)
      if (++reads === changeOnRead) f.req.user = { id: 'foreign', collection: 'users' } as PayloadRequest['user']
      return value
    }) as typeof original
    const res = await read(f)
    assert.equal(res.status, 403)
    assert.deepEqual(await res.json(), { outcome: 'authentication-required' })
  }
})

test('a principal change at any read, including during projection, is an authentication stop', async () => {
  // Review-A (S0c-1): the second owned read keeps the principal authorized at entry, so a
  // change between the reads is never reported as a foreign row (409) or as absence (404).
  const clean = fixture(); assert.equal((await read(clean)).status, 200)
  const total = clean.calls.length
  assert.ok(total >= 3, 'the owned read, the projection and the reread')
  for (let changeAt = 1; changeAt <= total; changeAt++) {
    const f = fixture(); let reads = 0
    for (const method of ['find', 'findByID'] as const) {
      const original = (f.req.payload as any)[method]
      ;(f.req.payload as any)[method] = async (input: unknown) => {
        const value = await original(input)
        if (++reads === changeAt) f.req.user = { id: 'foreign', collection: 'users' } as PayloadRequest['user']
        return value
      }
    }
    const res = await read(f)
    assert.deepEqual([changeAt, res.status, await res.json()], [changeAt, 403, { outcome: 'authentication-required' }])
  }
})

test('/retire and /resume map a principal change to 403 and missing or foreign attempts to 404', async () => {
  // Review-A (S0c-1 r2): the endpoint catch blocks, not only the read helper, carry the typed stops.
  const config = { mode: 'test' as const, origin: 'http://localhost:3000', storeId: 'store', channelKey: 'channel',
    apiSecret: 'synthetic', webhookSecret: 'synthetic', localKpnTestCheckout: true }
  const call = (path: '/retire' | '/resume', f: ReturnType<typeof fixture>) => {
    f.req.data = { transactionID, paymentID }
    return createAdapterEndpoints({ config }, async () => customerID).find(e => e.path === path)!.handler(f.req)
  }
  for (const path of ['/retire', '/resume'] as const) {
    const missing = fixture(); missing.rows.transactions = []
    const foreign = fixture(); foreign.transaction.customer = 'foreign'
    for (const f of [missing, foreign]) {
      const res = await call(path, f)
      assert.deepEqual([path, res.status, await res.json()], [path, 404, { outcome: 'unavailable' }])
    }
    const clean = fixture(); await call(path, clean)
    const total = clean.calls.length
    assert.ok(total >= 1, path + ' reads the attempt')
    for (let changeAt = 1; changeAt <= total; changeAt++) {
      const f = fixture(); let reads = 0
      for (const method of ['find', 'findByID'] as const) {
        const original = (f.req.payload as any)[method]
        ;(f.req.payload as any)[method] = async (input: unknown) => {
          const value = await original(input)
          if (++reads === changeAt) f.req.user = { id: 'foreign', collection: 'users' } as PayloadRequest['user']
          return value
        }
      }
      const res = await call(path, f)
      assert.deepEqual([path, changeAt, res.status, await res.json()], [path, changeAt, 403, { outcome: 'authentication-required' }])
    }
  }
})

// Change the signed-in user right after the k-th payload read, whichever method it uses.
function changePrincipalAtRead(f: ReturnType<typeof fixture>, changeAt: number) {
  let reads = 0
  for (const method of ['find', 'findByID'] as const) {
    const original = (f.req.payload as any)[method]
    ;(f.req.payload as any)[method] = async (input: unknown) => {
      const value = await original(input)
      if (++reads === changeAt) f.req.user = { id: 'foreign', collection: 'users' } as PayloadRequest['user']
      return value
    }
  }
}

test('S0c-1 r3: an early non-throwing reply after a later read is still an authentication stop', async () => {
  // Review-A (S0c-1 r2): /retire and /resume reply review-required after hasPaidReviewCase, and
  // confirm replays a settled receipt after its projection reads. Neither reply may reach a
  // different principal than the one authorized at entry.
  const config = { mode: 'test' as const, origin: 'http://localhost:3000', storeId: 'store', channelKey: 'channel',
    apiSecret: 'synthetic', webhookSecret: 'synthetic', localKpnTestCheckout: true }
  const held = () => { const f = fixture(); f.transaction.status = 'pending'; f.transaction.order = null; f.transaction.commerceReviewHold = true; return f }
  for (const path of ['/retire', '/resume'] as const) {
    const call = (f: ReturnType<typeof fixture>) => {
      f.req.data = { transactionID, paymentID }
      return createAdapterEndpoints({ config }, async () => customerID).find(e => e.path === path)!.handler(f.req)
    }
    const clean = held(); const res = await call(clean)
    assert.deepEqual([path, res.status, await res.json()], [path, 409, { outcome: 'review-required' }])
    for (let changeAt = 1; changeAt <= clean.calls.length; changeAt++) {
      const f = held(); changePrincipalAtRead(f, changeAt)
      const stopped = await call(f)
      assert.deepEqual([path, changeAt, stopped.status, await stopped.json()], [path, changeAt, 403, { outcome: 'authentication-required' }])
    }
  }
  const confirm = (f: ReturnType<typeof fixture>) => runReconciliation(f.req, { transactionID, paymentID, cartID }, 'confirm',
    async () => assert.fail('A settled replay never confirms again'), { config }, { boundedRecheck: true, principal: customerID })
  const clean = fixture(); assert.equal((await confirm(clean)).status, 200)
  for (let changeAt = 1; changeAt <= clean.calls.length; changeAt++) {
    const f = fixture(); changePrincipalAtRead(f, changeAt)
    await assert.rejects(confirm(f), (error: unknown) => error instanceof AttemptPrincipalChanged, `confirm read ${changeAt}`)
  }
})

test('S0c-1 r3: the browser mutation wrapper stops a principal change during the body read', async () => {
  // The wrapper authorizes, then awaits the body. Neither the inner handler nor any attempt
  // read may run for whoever is signed in after that await.
  for (const [path, body] of [
    ['/payments/portone/confirm-order', { cartID, transactionID, paymentID }],
    ['/payments/portone/retire', { transactionID, paymentID }],
  ] as const) {
    const f = fixture(); let handled = 0
    const bytes = new TextEncoder().encode(JSON.stringify(body))
    const stream = new ReadableStream<Uint8Array>({ pull(controller) {
      f.req.user = { id: 'foreign', collection: 'users' } as PayloadRequest['user']
      controller.enqueue(bytes); controller.close()
    } })
    const req = Object.assign(new Request('http://localhost:3000/api' + path, { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' } as RequestInit),
    { user: f.req.user, payload: f.req.payload }) as unknown as PayloadRequest
    f.req = req
    const endpoint = secureCommerceEndpoint({ path, method: 'post', handler: async () => { handled++; return Response.json({ ok: true }) } },
      async () => customerID)
    const res = await endpoint.handler(req)
    assert.deepEqual([path, res.status, (await res.json()).outcome, handled, f.calls], [path, 403, 'authentication-required', 0, []])
  }
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
    f.transaction.order = null; f.rows.orders = []; f.rows['commerce-admissions'] = []
    f.reservation.state = 'released'; delete f.reservation.order
    assert.deepEqual(await (await read(f)).json(), { outcome: 'local-terminal', status })
  }
})

test('terminal rows with linked or matching orders and settlement evidence require review', async () => {
  for (const status of ['failed', 'cancelled', 'refunded']) {
    const f = fixture(); f.transaction.status = status
    assert.deepEqual(await (await read(f)).json(), { outcome: 'review-required', orderID })
    f.transaction.order = null
    assert.deepEqual(await (await read(f)).json(), { outcome: 'review-required', orderID })
  }
  for (const evidence of ['settled', 'order-reference', 'admission']) {
    const f = fixture(); f.transaction.status = 'failed'; f.transaction.order = null; f.rows.orders = []
    f.reservation.state = evidence === 'settled' ? 'settled' : 'released'
    if (evidence !== 'order-reference') delete f.reservation.order
    if (evidence !== 'admission') f.rows['commerce-admissions'] = []
    assert.deepEqual(await (await read(f)).json(), { outcome: 'review-required' })
  }
})

test('terminal rows still reject corrupt reservation and order shapes without private disclosure', async () => {
  for (const corrupt of [(f: ReturnType<typeof fixture>) => { f.reservation.customer = 'foreign' },
    (f: ReturnType<typeof fixture>) => { f.reservation.state = 'unknown' },
    (f: ReturnType<typeof fixture>) => { f.reservation.order = {} },
    (f: ReturnType<typeof fixture>) => { f.order.amount = 1 }]) {
    const f = fixture(); f.transaction.status = 'failed'; corrupt(f)
    assert.deepEqual(await (await read(f)).json(), { outcome: 'integrity-stop' })
  }
})

test('missing or empty URL is an invalid request, not an integrity or availability stop', async () => {
  for (const value of [undefined, '']) {
    const f = fixture(); Object.defineProperty(f.req, 'url', { value })
    const res = await read(f)
    assert.equal(res.status, 400); assert.deepEqual(await res.json(), { outcome: 'invalid-request' })
    assert.deepEqual(f.calls, [])
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

test('only the real result GET bypasses mutation ingress and reaches its own authority', async () => {
  assert.equal(createAdapterEndpoints({}).filter(e => e.path === '/result' && e.method === 'get').length, 1)
  let calls = 0
  const config = await commercePlugin({ collections: [], secret: transactionID,
    db: postgresAdapter({ pool: { connectionString: 'postgres://localhost/unused_synthetic' } }),
    endpoints: [
      { path: '/payments/other/result', method: 'post', handler: async () => { calls++; return Response.json({ unsafe: true }) } },
      { path: '/payments/other/result', method: 'get', handler: async () => { calls++; return Response.json({ unsafe: true }) } },
      { path: '/payments/portone/result', method: 'post', handler: async () => { calls++; return Response.json({ unsafe: true }) } },
    ] })
  for (const endpoint of config.endpoints ?? []) {
    if (!endpoint.path.endsWith('/result')) continue
    const req = new Request('http://localhost:3000/api' + endpoint.path, { method: endpoint.method.toUpperCase() }) as PayloadRequest
    const res = await endpoint.handler(req)
    const data = await res.json()
    if (endpoint.path === '/payments/portone/result' && endpoint.method === 'get') {
      assert.equal(res.status, 503); assert.deepEqual(data, { outcome: 'authority-stop' })
    } else {
      assert.equal(res.status, 503); assert.equal(data.error.code, 'COMMERCE_REJECTED')
    }
  }
  assert.equal(calls, 0)
})

test('claimed admission remains recoverable, but a forged assigned status is not an alias', async () => {
  const f = fixture(); f.admission.status = 'claimed'
  assert.equal((await (await read(f)).json()).outcome, 'confirmed')
  const g = fixture(); g.admission.status = 'assigned'
  assert.equal((await (await read(g)).json()).outcome, 'integrity-stop')
})

test('browser recheck replays the exact settled receipt without replaying provider or writes', async () => {
  const f = fixture()
  const config = { mode: 'test' as const, origin: 'http://localhost:3000', storeId: 'store', channelKey: 'channel',
    apiSecret: 'synthetic', webhookSecret: 'synthetic', localKpnTestCheckout: true }
  const before = structuredClone(f.rows)
  const result = await runReconciliation(f.req, { transactionID, paymentID, cartID }, 'confirm',
    async () => assert.fail('Replay must not invoke confirmation'), { config, getPayment: async () => assert.fail('Replay must not call provider') },
    { boundedRecheck: true })
  assert.equal(result.status, 200)
  assert.deepEqual(await result.json(), { outcome: 'already-confirmed', transactionID, orderID })
  assert.deepEqual(f.rows, before)
  assert.equal(f.calls.includes('MUTATION'), false)
})
