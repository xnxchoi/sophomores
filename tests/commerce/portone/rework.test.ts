import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import type { PayloadRequest } from 'payload'
import { admissionFixture } from './admission-fixture'
import { admitReconciliation, debitProviderGet, endReconciliation, accountedProviderGet } from '../../../src/lib/commerce/portone/accounting'
import { runReconciliation } from '../../../src/lib/commerce/portone/admission'
import { commerceSnapshotHash } from '../../../src/lib/commerce/snapshot-hash'
import { createAdapterEndpoints } from '../../../src/lib/commerce/portone/endpoints'
import { inPaymentEndpoint } from '../../../src/lib/commerce/_shared/transaction'
import { CommerceReconciliations } from '../../../src/payload/collections/commerce-reconciliations'
import { getResumePayment } from '../../../src/lib/tickets/portone/runtime'
import { withCommerceWrite } from '../../../src/lib/commerce/access'

const config = { mode: "test" as const, origin: 'http://localhost:3000', storeId: 'store-reviewed', channelKey: 'channel-reviewed',
  apiSecret: 'synthetic', webhookSecret: 'synthetic', localKpnTestCheckout: true }
async function fixture() {
  const f = await admissionFixture({}, Date.now())
  const snapshot = { version: 1 as const, customerID: f.identity.customerID, cartID: f.identity.cartID, productID: 'product',
    releaseID: 'membership' as const, accountLimit: 1, eventID: 'event', quantity: 1, currency: 'KRW' as const, unitAmount: 100, shippingAmount: 0,
    totalAmount: 100, orderName: 'Product', productVersion: 'v1', eventVersion: 'v1', shippingAddress: {
      country: 'KR' as const, recipientName: 'Recipient', phone: '01012345678', postalCode: '01234', addressLine1: 'Address' } }
  f.identity.snapshotHash = commerceSnapshotHash(snapshot)
  const row = { id: f.identity.transactionID, createdAt: new Date(f.identity.startedAt).toISOString(), status: 'pending',
    customer: snapshot.customerID, cart: snapshot.cartID, amount: 100, currency: 'KRW', paymentMethod: 'portone',
    items: [{ product: snapshot.productID, quantity: 1 }], portone: { paymentID: f.identity.paymentID,
      prepareKey: 'a'.repeat(64), snapshot, snapshotHash: f.identity.snapshotHash, storeID: config.storeId, channelKey: config.channelKey } }
  let reservationState = 'reserved'
  const orderBacklinks: { id: string; commerceVersion: string }[] = []
  const find = f.req.payload.find
  f.req.payload.find = (async (args: Parameters<typeof find>[0]) => args.collection === 'commerce-reconciliations' ? find(args)
    : args.collection === 'orders' ? { docs: orderBacklinks, totalDocs: orderBacklinks.length }
      : args.collection === 'transactions' ? { docs: [row], totalDocs: 1 }
      : { docs: [{ id: 'reservation', attemptID: row.id, state: reservationState, snapshotHash: f.identity.snapshotHash,
      customer: snapshot.customerID, product: snapshot.productID, event: snapshot.eventID, releaseID: snapshot.releaseID, quantity: 1 }] }) as typeof find
  f.req.payload.findByID = (async ({ collection }: { collection: string }) => collection === 'transactions' ? { ...row }
    : collection === 'users' ? { id: snapshot.customerID, email: 'fixture@fixture.invalid' } : { id: 'event' }) as typeof f.req.payload.findByID
  const update = f.req.payload.update
  f.req.payload.update = (async (args: Parameters<typeof update>[0]) => {
    if (args.collection === 'transactions') Object.assign(row, args.data)
    return update(args)
  }) as typeof update
  f.req.payload.db.findOne = (async () => ({ id: 'product', inventory: 1, reservedQuantity: 1 })) as typeof f.req.payload.db.findOne
  let finalized = 0, gets = 0
  f.req.payload.config = { endpoints: [{ path: '/payments/portone/confirm-order', method: 'post', handler: () => {
    finalized++; row.status = 'succeeded'; return Response.json({ orderID: 'order' })
  } }] } as unknown as PayloadRequest['payload']['config']
  let providerStatus = 'PAID'
  const deps = { config, getPayment: async () => { gets++; return { id: f.identity.paymentID,
    storeId: config.storeId, status: providerStatus, channel: { type: 'TEST', key: config.channelKey }, customer: { id: snapshot.customerID },
    currency: 'KRW', amount: { total: 100, paid: providerStatus === 'PAID' ? 100 : 0, cancelled: providerStatus === 'CANCELLED' ? 100 : 0 }, disputes: [] } } }
  const endpoint = createAdapterEndpoints({ ...deps, verifyWebhook: async raw => JSON.parse(raw) }).find(e => e.path === '/webhooks')!
  const webhook = async (id: string, type = 'Transaction.Paid') => {
    const event = { type, data: { paymentId: f.identity.paymentID, storeId: config.storeId } }
    const req = Object.assign(new Request(config.origin + '/api/payments/portone/webhooks', { method: 'POST',
      headers: { 'content-type': 'application/json', 'webhook-id': id, 'webhook-timestamp': '1', 'webhook-signature': 'synthetic' },
      body: JSON.stringify(event) }), { payload: f.req.payload, user: null, context: {} }) as unknown as PayloadRequest
    return endpoint.handler(req)
  }
  return { ...f, row, deps, webhook, orderBacklinks, setProviderStatus: (status: string) => { providerStatus = status },
    setRetired: () => { row.status = 'failed'; reservationState = 'released' },
    counts: () => ({ finalized, gets }), input: { transactionID: row.id, paymentID: f.identity.paymentID } }
}

test('explicit operations ignore automatic cooldown and 30-minute stop, but automatic ones do not', async () => {
  const f = await admissionFixture()
  f.advance(31 * 60000)
  assert.equal((await admitReconciliation(f.req, f.identity, 'retire')).decision, 'started')
  await endReconciliation(f.req, 'completed')
  assert.equal((await admitReconciliation(f.other(), f.identity, 'resume', f.req.payload, { automatic: true })).decision, 'review-required')
  assert.equal((await admitReconciliation(f.other(), f.identity, 'resume')).decision, 'started')
})

test('one customer cannot hold two global reservations on different attempts', async () => {
  const f = await admissionFixture()
  await admitReconciliation(f.req, f.identity, 'resume')
  const transactionID = randomUUID()
  assert.equal((await admitReconciliation(f.other(), { ...f.identity, transactionID, paymentID: transactionID.replaceAll('-', '') }, 'resume')).decision, 'rate-stop')
})

test('unavailable ledger attempt locks are a known busy result without ownership or writes', async () => {
  const f = await admissionFixture()
  f.setLocksAvailable(false)
  assert.equal((await admitReconciliation(f.req, f.identity, 'resume')).decision, 'busy')
  assert.equal(f.rows.size, 0)
  f.setLocksAvailable(true)
  assert.equal((await admitReconciliation(f.req, f.identity, 'resume')).decision, 'started')
  assert.equal(await endReconciliation(f.req, 'completed'), 'completed')
})

test('deterministic failure and a rejected native response release ownership as known', async () => {
  for (const work of [async () => Response.json({}, { status: 500 }), async (): Promise<Response> => { throw new Error('deterministic rejection') }]) {
    const f = await fixture()
    try { await runReconciliation(f.req, f.input, 'confirm', work, f.deps) } catch { /* Expected deterministic rejection. */ }
    assert.equal(f.attempt().active, undefined)
    assert.equal((await admitReconciliation(f.other(), f.identity, 'confirm')).decision, 'started')
  }
})

test('Paid ingress joins durably but bypasses automatic cooldown', async () => {
  for (const stop of ['join', 'cooldown']) {
    const f = await fixture()
    await admitReconciliation(f.req, f.identity, 'resume')
    if (stop === 'cooldown') await endReconciliation(f.req, 'completed')
    const response = await f.webhook('paid-' + stop)
    assert.equal(stop === 'join' ? response.status >= 400 : response.status === 200, true)
    assert.equal([...f.rows.values()].some(row => row.scope.startsWith('reconciliation-event:') &&
      (row.state as { event: { id: string } }).event.id === 'paid-' + stop), true)
    assert.equal(f.counts().finalized, stop === 'join' ? 0 : 1)
  }
})

test('late signed PAID on a retired attempt is reread, quarantined, and acknowledged without settlement', async () => {
  const f = await fixture()
  f.setRetired()
  const response = await f.webhook('paid-after-retirement')
  assert.equal(response.status, 200)
  assert.equal(f.counts().gets, 1)
  assert.equal(f.counts().finalized, 0)
  assert.equal(f.row.status, 'failed')
  assert.equal(Reflect.get(f.row, 'commerceReviewHold'), true)
  assert.equal(Reflect.get(f.row, 'commerceResolutionConflict'), true)
  assert.equal(f.attempt().ordinaryUsed, 1)
  assert.equal(f.attempt().riskUsed, 0)
})

test('a repeated risk event gets no second reserve grant and reserve cannot settle a clear payment', async () => {
  const f = await fixture()
  f.seed({ ordinaryUsed: 12, escalation: 'budget' })
  assert.equal((await f.webhook('risk-once', 'Transaction.DisputeResolved')).status, 409, 'Paid evidence funded only by reserve must reach and fail the ordinary-settlement guard')
  assert.equal(f.counts().gets, 1)
  assert.equal(f.counts().finalized, 0)
  assert.equal(f.attempt().riskUsed, 1)
  await f.webhook('risk-once', 'Transaction.DisputeResolved')
  assert.equal(f.counts().gets, 1)
  assert.equal(f.attempt().riskEvents.length, 1)
})

test('ordinary-funded risk is seen once and its replay cannot bypass automatic cooldown', async () => {
  const f = await fixture()
  await f.webhook('ordinary-risk', 'Transaction.DisputeResolved')
  assert.equal(f.counts().gets, 1)
  assert.equal(f.attempt().ordinaryUsed, 1)
  assert.equal(f.attempt().riskEvents.length, 0)
  await f.webhook('ordinary-risk', 'Transaction.DisputeResolved')
  assert.equal(f.counts().gets, 1)
  assert.equal(f.attempt().ordinaryUsed, 1)
  assert.equal(f.attempt().seenRiskEvents?.includes('ordinary-risk'), true)
})

test('post-admission settlement is rechecked before the first GET', async () => {
  const f = await fixture(), find = f.req.payload.findByID
  let reads = 0, work = 0
  f.req.payload.findByID = (async (args: Parameters<typeof find>[0]) => {
    if (args.collection === 'transactions' && ++reads >= 2) f.row.status = 'succeeded'
    return find(args)
  }) as typeof find
  await runReconciliation(f.req, f.input, 'confirm', async () => { work++; return Response.json({}) }, f.deps)
  assert.equal(work, 0)
  assert.equal(f.attempt().ordinaryUsed, 0)
})

test('a committed financial response survives an end-ledger failure and records escalation', async () => {
  const f = await fixture()
  const response = await runReconciliation(f.req, f.input, 'confirm', async () => {
    const result = await inPaymentEndpoint(f.req, async () => Response.json({ orderID: 'committed' }))
    f.failCommit()
    return result
  }, f.deps)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { orderID: 'committed' })
  assert.equal(f.attempt().escalation, 'ownership')
})

test('global gate writes validate shape and attempt UPDATE is generation-conditional', async () => {
  const f = await fixture()
  const hook = CommerceReconciliations.hooks!.beforeChange![0]
  await assert.rejects(withCommerceWrite(f.req, async () => hook({ req: f.req, operation: 'create',
    data: { scope: 'reconciliation-provider-global', state: { dispatchedAt: 'malformed' } },
  } as unknown as Parameters<typeof hook>[0])))
  await admitReconciliation(f.req, f.identity, 'resume')
  const update = f.req.payload.db.updateOne
  let conditional = false
  f.req.payload.db.updateOne = (async (args: Parameters<typeof update>[0]) => {
    if (JSON.stringify(args.where).includes('state.generation') && args.options?.atomic) conditional = true
    return update(args)
  }) as typeof update
  await debitProviderGet(f.req, f.identity.paymentID)
  assert.equal(conditional, true)
})

test('DB time, not a skewed application clock, controls admission and DB work has lease allowance', async (t) => {
  const f = await admissionFixture()
  t.mock.method(Date, 'now', () => 0)
  await admitReconciliation(f.req, f.identity, 'confirm')
  await debitProviderGet(f.req, f.identity.paymentID)
  await debitProviderGet(f.req, f.identity.paymentID)
  f.advance(45000)
  assert.equal(await endReconciliation(f.req, 'completed'), 'completed')
})

test('risk-event journal refuses an unbounded seventeenth entry', async () => {
  const { attemptAccountingSchema } = await import('../../../src/lib/commerce/portone/accounting')
  const f = await fixture()
  f.seed({ riskEvents: Array.from({ length: 17 }, (_, id) => ({ id: String(id), type: 'Transaction.Cancelled' })) })
  assert.equal(attemptAccountingSchema.safeParse(f.attempt()).success, false)
  f.seed({ riskEvents: [], seenRiskEvents: Array.from({ length: 17 }, (_, id) => String(id)) })
  assert.equal(attemptAccountingSchema.safeParse(f.attempt()).success, false)
})

test('seen risk ids roll oldest-first at sixteen independently of reserve spend', async () => {
  const f = await fixture()
  f.seed({ seenRiskEvents: Array.from({ length: 16 }, (_, id) => 'old-' + id) })
  await f.webhook('new-risk', 'Transaction.DisputeResolved')
  assert.deepEqual(f.attempt().seenRiskEvents, [...Array.from({ length: 15 }, (_, id) => 'old-' + (id + 1)), 'new-risk'])
  assert.equal(f.attempt().riskEvents.length, 0)
})

test('four distinct signed events exhaust the reserve, while unsigned GETs cannot use it', async () => {
  const f = await fixture()
  f.seed({ ordinaryUsed: 12, escalation: 'budget' })
  assert.equal((await admitReconciliation(f.req, f.identity, 'risk')).decision, 'budget-stop')
  for (let i = 0; i < 5; i++) await f.webhook('reserve-' + i, 'Transaction.DisputeResolved')
  assert.equal(f.counts().gets, 4)
  assert.equal(f.attempt().riskUsed, 4)
  assert.equal(f.counts().finalized, 0)
})

test('a proven pre-dispatch debit rejection does not poison a known operation', async () => {
  const f = await admissionFixture()
  await admitReconciliation(f.req, f.identity, 'resume')
  await debitProviderGet(f.req, f.identity.paymentID)
  await assert.rejects(debitProviderGet(f.req, f.identity.paymentID))
  assert.equal(await endReconciliation(f.req, 'completed'), 'completed')
})

test('retirement locks Paid review before the attempt fence and reservation resources', async () => {
  const f = await fixture()
  const { retireFailedPayment } = await import('../../../src/lib/commerce/portone/review')
  await admitReconciliation(f.req, f.identity, 'retire')
  const start = f.queries.length
  // Invalid FAILED identity is rejected only after the financial locks, before writes.
  await assert.rejects(retireFailedPayment(f.req, f.input, { ...f.deps, getPayment: async () => ({ id: f.input.paymentID,
    status: 'FAILED', storeId: 'different-store', channel: { type: 'TEST', key: config.channelKey },
    customer: { id: f.identity.customerID }, currency: 'KRW', amount: { total: 100, paid: 0, cancelled: 0 }, disputes: [] }) }))
  const queries = f.queries.slice(start)
  const begins = queries.flatMap((query, index) => /^begin/.test(query.text) ? [index] : [])
  const financialLocks = queries.slice(begins.at(-1)!).filter(query => query.text.includes('pg_advisory_xact_lock'))
  assert.equal(financialLocks.length > 1, true)
  assert.equal(String(financialLocks[0].values[0]).includes('paid-review-customer:'), true)
  assert.equal(String(financialLocks[1].values[0]).includes('reconciliation-attempt:'), true)
})

test('an uncertain native outcome wrapped as an HTTP response stays unknown', async () => {
  const f = await fixture()
  const response = await runReconciliation(f.req, f.input, 'confirm', async () => {
    f.failCommit()
    try { return await inPaymentEndpoint(f.req, async () => Response.json({})) }
    catch { return Response.json({}, { status: 503 }) }
  }, f.deps)
  assert.equal(response.status, 503)
  assert.equal(f.attempt().active?.state, 'unknown')
})


test('a risk event joined before dispatch keeps its reserve for redelivery', async () => {
  const f = await fixture()
  await admitReconciliation(f.req, f.identity, 'resume')
  f.seed({ ordinaryUsed: 12 })
  assert.equal((await f.webhook('joined-risk', 'Transaction.DisputeResolved')).status >= 400, true)
  assert.equal(f.attempt().riskEvents.length, 0)
  await endReconciliation(f.req, 'completed')
  await f.webhook('joined-risk', 'Transaction.DisputeResolved')
  assert.equal(f.attempt().riskUsed, 1)
  assert.equal(f.attempt().riskEvents[0].id, 'joined-risk')
})

test('risk ids rejected by global rate or reserve budget remain available for redelivery', async () => {
  for (const stop of ['rate', 'budget']) {
    const f = await fixture()
    f.seed({ ordinaryUsed: 12, riskUsed: stop === 'budget' ? 4 : 0 })
    if (stop === 'rate') f.rows.set('global', { id: 'global', scope: 'reconciliation-provider-global',
      state: { dispatchedAt: Array(5).fill(f.identity.startedAt), reservations: [] } })
    await f.webhook('retry-risk', 'Transaction.DisputeResolved')
    assert.equal(f.counts().gets, 0)
    assert.equal(f.attempt().riskEvents.length, 0)
    if (stop === 'rate') f.advance(1100)
    else f.seed({ riskUsed: 0 }) // Model released allowance only in this inert regression fixture.
    await f.webhook('retry-risk', 'Transaction.DisputeResolved')
    assert.equal(f.counts().gets, 1)
    assert.equal(f.attempt().riskEvents[0].id, 'retry-risk')
  }
})

test('completed HTTP, parse and schema errors retain the debit but not unknown ownership', async (t) => {
  for (const [body, status] of [['{}', 503], ['malformed JSON', 200], ['{}', 200]] as const) {
    const f = await admissionFixture()
    await admitReconciliation(f.req, f.identity, 'resume')
    t.mock.method(globalThis, 'fetch', async () => new Response(body, { status }))
    await assert.rejects(accountedProviderGet(f.req, f.identity.paymentID, () => getResumePayment(config,
      { paymentId: f.identity.paymentID, storeId: config.storeId })))
    assert.equal(f.attempt().ordinaryUsed, 1)
    assert.equal(await endReconciliation(f.req, 'completed'), 'completed')
  }
})

test('a committed settlement response survives a returned unknown completion', async () => {
  const f = await fixture()
  const response = await runReconciliation(f.req, f.input, 'confirm', async () => {
    const committed = await inPaymentEndpoint(f.req, async () => Response.json({ orderID: 'committed' }))
    f.advance(90001)
    return committed
  }, f.deps)
  assert.equal(response.status, 200)
  assert.equal(f.attempt().escalation, 'ownership')
})

test('Paid webhook after 31 minutes bypasses automatic unresolved escalation', async () => {
  const f = await fixture()
  f.advance(31 * 60000)
  assert.equal((await f.webhook('late-paid')).status, 200)
  assert.equal(f.attempt().escalation, undefined)
  assert.equal(f.counts().finalized, 1)
})

test('admission reads attempt start from DB, not the application timestamp projection', async () => {
  const f = await fixture()
  f.row.createdAt = '2099-01-01T00:00:00.000Z'
  const response = await runReconciliation(f.req, f.input, 'resume', async () => Response.json({}), f.deps)
  assert.equal(response.status, 200)
  assert.equal(f.attempt().identity.startedAt, f.identity.startedAt)
})

test('authenticated ingress limiter runs before journal writes, including joined requests', async () => {
  const f = await fixture()
  await admitReconciliation(f.req, f.identity, 'resume')
  for (let i = 0; i < 21; i++) await f.webhook('limited-' + i)
  const events = [...f.rows.values()].filter(row => row.scope.startsWith('reconciliation-event:'))
    .map(row => (row.state as { event: { id: string } }).event.id)
  assert.equal(events.includes('limited-19'), true)
  assert.equal(events.includes('limited-20'), false)
})

test('a full historical journal keeps every event when new Paid evidence arrives', async () => {
  const f = await fixture()
  const risk = Array.from({ length: 16 }, (_, i) => ({ id: 'risk-' + i, type: 'Transaction.Cancelled' }))
  const original = [...risk, ...Array.from({ length: 48 }, (_, i) => ({ id: 'old-' + i, type: 'Transaction.Paid' }))]
  f.seed({ events: original })
  await f.webhook('new-paid')
  assert.deepEqual(f.attempt().events, original)
  assert.equal([...f.rows.values()].some(row => row.scope.startsWith('reconciliation-event:') &&
    (row.state as { event: { id: string } }).event.id === 'new-paid'), true)
})


test('an all-risk journal rolls new ingress to immutable evidence without dropping risk ids', async () => {
  const f = await fixture()
  f.seed({ events: Array.from({ length: 64 }, (_, i) => ({ id: 'risk-' + i, type: 'Transaction.Cancelled' })) })
  await f.webhook('overflow-risk', 'Transaction.DisputeResolved')
  assert.equal(f.attempt().events.length, 64)
  const rolled = [...f.rows.values()].filter(row => row.scope.startsWith('reconciliation-event:'))
  assert.equal(rolled.length, 1)
  assert.equal((rolled[0].state as { event: { id: string } }).event.id, 'overflow-risk')
})

test('FAILED fetched before financial locks cannot retire a changed or already settled attempt', async () => {
  const { retireFailedPayment } = await import('../../../src/lib/commerce/portone/review')
  for (const change of ['succeeded', 'snapshot', 'hold'] as const) {
    const f = await fixture()
    await admitReconciliation(f.req, f.identity, 'retire')
    let writes = 0
    const update = f.req.payload.update
    f.req.payload.update = (async (args: Parameters<typeof update>[0]) => {
      if (args.collection !== 'commerce-reconciliations') writes++
      return update(args)
    }) as typeof update
    await assert.rejects(retireFailedPayment(f.req, f.input, { ...f.deps, getPayment: async () => {
      if (change === 'succeeded') f.row.status = 'succeeded'
      if (change === 'hold') Object.assign(f.row, { commerceReviewHold: true })
      if (change === 'snapshot') {
        f.row.portone.snapshot = { ...f.row.portone.snapshot, productVersion: 'v2' }
        f.row.portone.snapshotHash = commerceSnapshotHash(f.row.portone.snapshot)
      }
      return { id: f.input.paymentID, status: 'FAILED', storeId: config.storeId,
        channel: { type: 'TEST', key: config.channelKey }, customer: { id: f.identity.customerID },
        currency: 'KRW', amount: { total: 100, paid: 0, cancelled: 0 }, disputes: [] }
    } }), change === 'snapshot' ? /Attempt changed/ : /Attempt cannot retire/)
    assert.equal(writes, 0, 'no retirement status, reservation or counter write')
    await endReconciliation(f.req, 'completed')
  }
})

test('ordinary recheck records non-PAID evidence without invoking the order finalizer', async () => {
  const { settleIfProviderPaid } = await import('../../../src/lib/commerce/portone/admission')
  const f = await fixture()
  f.setProviderStatus('READY')
  const before = structuredClone(f.row)
  const work = () => settleIfProviderPaid(f.req, f.input.paymentID, async () => assert.fail('A non-PAID recheck cannot settle'), f.deps)
  const response = await runReconciliation(f.req, f.input, 'confirm', work, f.deps, { boundedRecheck: true })
  const second = await runReconciliation(f.req, f.input, 'confirm', work, f.deps, { boundedRecheck: true })
  assert.equal((await second.json()).outcome, 'cooldown')
  assert.equal(response.status, 202)
  assert.deepEqual(f.row, before)
  assert.deepEqual(f.counts(), { finalized: 0, gets: 1 })
  const observations = [...f.rows.values()].filter(row => row.scope.startsWith('reconciliation-observation:'))
  assert.equal(observations.length, 1)
  assert.equal((observations[0].state as { observation: string }).observation, 'provider-ready')
})

test('signed Paid with a non-PAID provider record leaves money state untouched and is retryable', async () => {
  const f = await fixture()
  const before = structuredClone(f.row)
  for (const status of ['READY', 'CANCELLED']) {
    f.setProviderStatus(status)
    assert.equal((await f.webhook('still-pending')).status, 409)
    assert.deepEqual(f.row, before)
  }
  const events = [...f.rows.values()].filter(row => row.scope.startsWith('reconciliation-event:'))
  const observations = [...f.rows.values()].filter(row => row.scope.startsWith('reconciliation-observation:'))
  assert.equal(events.length, 1)
  assert.equal(observations.length, 2)
  assert.deepEqual(f.counts(), { gets: 2, finalized: 0 })
  f.setProviderStatus('PAID')
  assert.equal((await f.webhook('still-pending')).status, 200)
  assert.equal(f.counts().finalized, 1)
})

test('bounded recheck cannot debit or settle past its 30-second authority lease', async () => {
  const { settleIfProviderPaid } = await import('../../../src/lib/commerce/portone/admission')
  const f = await fixture()
  const before = structuredClone(f.row)
  await assert.rejects(runReconciliation(f.req, f.input, 'confirm', async () => {
    f.advance(30_001)
    return settleIfProviderPaid(f.req, f.input.paymentID, async () => assert.fail('expired recheck cannot settle'), f.deps)
  }, f.deps, { boundedRecheck: true }))
  assert.deepEqual(f.counts(), { finalized: 0, gets: 0 })
  assert.deepEqual(f.row, before)
})

test('late signed Paid has a bounded quarantine-only read even after the ordinary budget', async () => {
  for (const retired of [false, true]) {
    const f = await fixture()
    if (retired) f.setRetired()
    f.seed({ ordinaryUsed: 12 })
    assert.equal((await f.webhook('paid-after-budget')).status, 200)
    assert.equal(f.attempt().ordinaryUsed, 12)
    assert.equal(f.attempt().riskUsed, 1)
    assert.deepEqual(f.counts(), { gets: 1, finalized: 0 })
    assert.equal(Reflect.get(f.row, 'commerceReviewHold'), true)
    assert.equal(f.row.status, retired ? 'failed' : 'pending')
  }
})

test('signed Paid blocked by lifetime, ownership or exhausted reserve becomes a durable review case with no GET', async () => {
  for (const stop of ['budget', 'lifetime', 'ownership'] as const) {
    const f = await fixture()
    f.setRetired()
    if (stop === 'ownership') {
      await admitReconciliation(f.req, f.identity, 'confirm')
      await endReconciliation(f.req, 'unknown')
    } else f.seed({ ordinaryUsed: 12, riskUsed: 4 })
    if (stop === 'lifetime') f.advance(24 * 60 * 60 * 1000 + 1)
    for (let n = 0; n < 2; n++) assert.equal((await f.webhook('paid-needs-review')).status, 409)
    const cases = [...f.rows.values()].filter(row => row.scope === 'reconciliation-paid-review:' + f.input.transactionID)
    assert.equal(cases.length, 1)
    assert.deepEqual(f.counts(), { gets: 0, finalized: 0 })
    assert.equal(f.row.status, 'failed')
  }
})

test('exact Paid plus a legacy-only backlink is quarantined before official finalization', async () => {
  const f = await fixture()
  f.orderBacklinks.push({ id: 'legacy', commerceVersion: 'legacy' })
  assert.equal((await f.webhook('legacy-backlink')).status, 200)
  assert.deepEqual(f.counts(), { gets: 1, finalized: 0 })
  assert.equal(Reflect.get(f.row, 'commerceResolutionConflict'), true)
  assert.equal(f.row.status, 'pending')
})


test('an unresolved signed Paid signal fences browser resume and retire before provider work', async () => {
  const f = await fixture()
  f.setProviderStatus('READY')
  assert.equal((await f.webhook('paid-not-converged')).status, 409)
  for (const kind of ['resume', 'retire'] as const) {
    const response = await runReconciliation(f.req, f.input, kind, async () => {
      assert.fail('A contradictory signed signal must stop ordinary recovery')
    }, f.deps)
    assert.equal((await response.json()).outcome, 'review-required')
  }
  assert.equal(f.counts().gets, 1)
  assert.equal(f.row.status, 'pending')
})


test('an old signed Paid case blocks preparation on a fresh cart for any membership product', async () => {
  const { createPortOneAdapter } = await import('../../../src/lib/commerce/portone/adapter')
  const { inPaymentTransaction } = await import('../../../src/lib/commerce/_shared/transaction')
  const f = await fixture()
  f.setRetired()
  f.seed({ ordinaryUsed: 12, riskUsed: 4 })
  assert.equal((await f.webhook('paid-retired')).status, 409)
  const cartID = randomUUID()
  const policy = { effectiveDate: '2020-01-01', sections: [{ heading: 'Fixture', paragraphs: ['Fixture policy'] }] }
  f.req.payload.findGlobal = (async () => ({ _status: 'published', publicationApproved: true, physicalProductApproved: true,
    fulfillmentReady: true, addressRetentionApproved: true, shippingCountries: ['KR'], disclosure: {
      seller: { name: 'Fixture', registrationNumber: '123-45-67890', representative: 'Fixture', address: 'Fixture', phone: '02-1234-5678' },
      policies: { terms: policy, privacy: policy, refund: policy },
    } })) as typeof f.req.payload.findGlobal
  const product = { id: f.row.portone.snapshot.productID, title: 'Product', description: 'Fixture', images: [{ image: 'image' }],
    _status: 'published', publicationApproved: true, event: 'event', saleStartsAt: '2000-01-01T00:00:00Z',
    saleEndsAt: '2100-01-01T00:00:00Z', dispatchSchedule: 'Fixture', shippingFeeKRW: 0, inventory: 3, reservedQuantity: 0,
    priceInKRWEnabled: true, priceInKRW: 100, updatedAt: 'v1' }
  const create = f.req.payload.create
  f.req.payload.create = (async (input: Parameters<typeof create>[0]) => {
    if (input.collection === 'transactions') assert.fail('Replacement reached financial row creation')
    return create(input)
  }) as typeof create
  const oldFind = f.req.payload.find
  const oldFindByID = f.req.payload.findByID
  let offeredProduct = product.id
  f.req.payload.find = (async (input: Parameters<typeof oldFind>[0]) => {
    if (input.collection === 'products') return { docs: [{ ...product, id: offeredProduct }], totalDocs: 1 }
    if (input.collection === 'transactions') {
      const docs = JSON.stringify(input.where).includes(f.row.id) ? [f.row] : []
      return { docs, totalDocs: docs.length }
    }
    return oldFind(input)
  }) as typeof oldFind
  f.req.payload.findByID = (async (input: Parameters<typeof oldFindByID>[0]) =>
    input.collection === 'carts' ? { id: cartID, customer: f.identity.customerID, currency: 'KRW', items: [{ product: offeredProduct, quantity: 1 }] }
      : input.collection === 'commerce-events' ? { id: 'event', name: 'Fixture', publicationApproved: true,
        partIStartsAt: '2099-01-01', updatedAt: 'v1', capacity: 3, committedQuantity: 0, reservedQuantity: 0 }
      : oldFindByID(input)) as typeof oldFindByID
  f.req.user = { ...f.req.user!, email: 'fixture@fixture.invalid' }
  f.req.data = { attemptID: randomUUID() }
  const adapter = createPortOneAdapter(f.deps)
  const data = { cart: { id: cartID }, currency: 'KRW', customerEmail: '', shippingAddress: f.row.portone.snapshot.shippingAddress } as unknown as Parameters<typeof adapter.initiatePayment>[0]['data']
  await assert.rejects(inPaymentTransaction(f.req, async () => adapter.initiatePayment({
    data, req: f.req, transactionsSlug: 'transactions',
  })), /Payment requires review/)
  assert.equal(f.counts().gets, 0)

  // Every v1 product shares the account's membership allowance, so another product is held too.
  offeredProduct = 'distinct-product'
  f.req.data = { attemptID: randomUUID() }
  await assert.rejects(inPaymentTransaction(f.req, async () => adapter.initiatePayment({
    data, req: f.req, transactionsSlug: 'transactions',
  })), /Payment requires review/)
  assert.equal(f.counts().gets, 0)
})


test('in-flight resume and retire cannot use stale provider proof after authenticated Paid ingress', async () => {
  for (const kind of ['resume', 'retire'] as const) {
    const f = await fixture()
    const deps = { ...f.deps, getPayment: async () => {
      assert.equal((await f.webhook('paid-during-' + kind)).status, 409)
      assert.equal(f.counts().gets, 0) // Active operation prevents a second provider debit.
      return kind === 'resume' ? { type: 'PAYMENT_NOT_FOUND' } : { id: f.input.paymentID,
        status: 'FAILED', storeId: config.storeId, channel: { type: 'TEST', key: config.channelKey },
        customer: { id: f.identity.customerID }, currency: 'KRW', amount: { total: 100, paid: 0, cancelled: 0 }, disputes: [] }
    } }
    const handler = createAdapterEndpoints(deps, async () => f.identity.customerID).find(e => e.path === '/' + kind)!
    f.req.data = f.input
    const res = await handler.handler(f.req)
    assert.equal(res.status, 409)
    assert.deepEqual(await res.json(), { outcome: 'review-required' })
    assert.equal(f.row.status, 'pending')
    assert.equal(f.attempt().ordinaryUsed, 1)
    assert.equal(f.counts().finalized, 0)
  }
})
