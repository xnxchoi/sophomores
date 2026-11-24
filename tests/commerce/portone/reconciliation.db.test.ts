import assert from 'node:assert/strict'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import { Socket } from 'node:net'
import { setTimeout } from 'node:timers/promises'
import test from 'node:test'

test('I2 disposable PostgreSQL admission, accounting, native fencing and restart', {
  skip: process.env.COMMERCE_PAYLOAD_DATABASE_TESTS !== '1', timeout: 300000,
}, async (t) => {
  const { openReconciliationDatabase, identityFor, target } = await import('./reconciliation-postgres-fixture')
  const { seedAttempt, confirmation, effects, providerConfig } = await import('../core/payment-postgres-fixture')
  const { createLocalReq } = await import('payload')
  const { admitReconciliation, debitProviderGet, endReconciliation, assertReconciliationFence, retainReconciliationRisk, accountedProviderGet } = await import('../../../src/lib/commerce/portone/accounting')
  const { runReconciliation } = await import('../../../src/lib/commerce/portone/admission')
  const { readSettlementProof } = await import('../../../src/lib/commerce/portone/adapter')
  const { createAdapterEndpoints } = await import('../../../src/lib/commerce/portone/endpoints')
  const { inPaymentTransaction } = await import('../../../src/lib/commerce/_shared/transaction')
  const { withCommerceWrite } = await import('../../../src/lib/commerce/access')
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Provider HTTP forbidden') })
  const connect = Socket.prototype.connect
  t.mock.method(Socket.prototype, 'connect', function (this: Socket, ...args: Parameters<Socket['connect']>) {
    const first: unknown = Array.isArray(args[0]) ? args[0][0] : args[0]
    const options = first && typeof first === 'object' ? first as Record<string, unknown> : undefined
    if (Number(options?.port ?? first) !== target.port || String(options?.host ?? args[1]) !== '127.0.0.1') throw new Error('Only the disposable database is permitted')
    return Reflect.apply(connect, this, args)
  })
  const { Pool } = await import('pg')
  const control = new Pool({ connectionString: target.url, max: 1 })
  let alreadyPrepared = false
  try { alreadyPrepared = Boolean((await control.query("SELECT to_regclass('public.commerce_reconciliations') AS ledger")).rows[0].ledger) }
  finally { await control.end() }
  if (!alreadyPrepared) {
    const prepared = await openReconciliationDatabase(true)
    await prepared.close()
  }
  const db = await openReconciliationDatabase()
  t.after(db.close)
  const ledger = async (transactionID: string) => {
    const found = await db.payload.find({ collection: 'commerce-reconciliations', where: { scope: { equals: 'reconciliation-attempt:' + transactionID } }, overrideAccess: true })
    return found.docs[0]
  }
  const read = async (transactionID: string) => (await ledger(transactionID)).state as unknown as import('../../../src/lib/commerce/portone/accounting').AttemptAccounting
  const worker = (identity: import('../../../src/lib/commerce/portone/accounting').ReconciliationIdentity, mode = 'admit') => {
    const child = fork(new URL('./reconciliation-process-fixture.ts', import.meta.url), [], { execArgv: ['--import', 'tsx'],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'], env: { ...process.env, I2_PROOF_IDENTITY: JSON.stringify(identity), I2_PROOF_MODE: mode } })
    t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL') })
    let tail = ''
    for (const stream of [child.stdout, child.stderr]) stream?.on('data', chunk => { tail = (tail + String(chunk)).slice(-1000) })
    const exited = once(child, 'exit')
    const nextMessage = () => Promise.race([once(child, 'message').then(([value]) => value as { decision: string; debited?: number }),
      exited.then(() => { throw new Error('Proof child exited before receipt: ' + tail) })])
    return { child, message: nextMessage(), nextMessage, exited }
  }
  await t.test('separate processes contend for the same exact attempt and only one starts', async () => {
    const f = await seedAttempt(db.payload), req = await createLocalReq({ user: f.user }, db.payload)
    const identity = await identityFor(req, f)
    const a = worker(identity, 'barrier-admit'), b = worker(identity, 'barrier-admit')
    assert.deepEqual((await Promise.all([a.message, b.message])).map(m => m.decision), ['ready', 'ready'])
    const results = [a.nextMessage(), b.nextMessage()]
    a.child.send({ start: true }); b.child.send({ start: true })
    const messages = await Promise.all(results)
    const decisions = messages.map(result => result.decision).sort()
    assert.equal(decisions.filter(value => value === 'started').length, 1)
    assert.equal(decisions.every(value => ['join', 'busy', 'started'].includes(value)), true)
    for (const [index, child] of [a, b].entries()) if (messages[index].decision === 'started') child.child.send({ finish: true })
    await Promise.all([a.exited, b.exited])
    assert.equal((await read(f.transactionID)).generation, 1)
  })
  await setTimeout(1100)
  await t.test('two-read official confirmation debits independently before transport and settles once', async () => {
    const f = await seedAttempt(db.payload, new Date(Date.now() - 31 * 60000).toISOString()), attempt = await confirmation(db.payload, f)
    let gets = 0
    const get = attempt.deps.getPayment
    attempt.deps.getPayment = async () => {
      gets++
      assert.equal((await read(f.transactionID)).ordinaryUsed, gets)
      return get()
    }
    // confirmation() closes over its original dependency object, including this transport mutation.
    const run = () => runReconciliation(attempt.req, { transactionID: f.transactionID, paymentID: f.transactionID.replaceAll('-', ''), cartID: f.cartID }, 'confirm', async () => {
      assert.equal(await readSettlementProof(attempt.req, f.transactionID.replaceAll('-', ''), attempt.deps), 'provider-paid')
      return attempt.run()
    }, attempt.deps)
    assert.equal((await run()).status, 200)
    assert.equal(gets, 2)
    const before = await read(f.transactionID)
    const event = { type: 'Transaction.Paid', data: { paymentId: f.transactionID.replaceAll('-', ''), storeId: providerConfig.storeId } }
    const endpoint = createAdapterEndpoints({ ...attempt.deps, verifyWebhook: async () => event }).find(e => e.path === '/webhooks')!
    const request = Object.assign(new Request(providerConfig.origin + '/api/payments/portone/webhooks', { method: 'POST',
      headers: { 'content-type': 'application/json', 'webhook-id': 'paid-after-browser', 'webhook-timestamp': '1', 'webhook-signature': 'synthetic' },
      body: JSON.stringify(event) }), { payload: db.payload, user: null, context: {} }) as unknown as import('payload').PayloadRequest
    assert.equal((await endpoint.handler(request)).status, 200)
    const after = await read(f.transactionID)
    assert.equal(after.generation, before.generation)
    assert.equal(after.escalation, undefined)
    const receipts = await db.payload.find({ collection: 'commerce-reconciliations', depth: 0,
      where: { scope: { contains: `reconciliation-event:${f.transactionID}:` } } })
    assert.equal(receipts.totalDocs, 1)
    assert.equal((receipts.docs[0].state as { event: { id: string } }).event.id, 'paid-after-browser')
    assert.equal(gets, 2)
    assert.equal((await read(f.transactionID)).ordinaryUsed, 2)
    assert.equal((await read(f.transactionID)).last?.outcome, 'completed')
    const effect = await effects(db.payload.db.pool, f)
    assert.equal(effect.orders, 1); assert.equal(effect.stock, 9); assert.equal(effect.admissions, 1)
    const replay = await confirmation(db.payload, f)
    assert.equal((await runReconciliation(replay.req, { transactionID: f.transactionID, paymentID: f.transactionID.replaceAll('-', '') }, 'confirm', replay.run, replay.deps)).status, 200)
    assert.equal(gets, 2)
  })
  await setTimeout(1100)
  await t.test('real Payload isolates legacy backlinks in replay and quarantines a legacy-only pending attempt', async () => {
    const { projectLocalResult } = await import('../../../src/lib/commerce/portone/result')
    const { readPortOneTransaction } = await import('../../../src/lib/commerce/portone/adapter')
    const f = await seedAttempt(db.payload), a = await confirmation(db.payload, f)
    const paymentID = f.transactionID.replaceAll('-', '')
    assert.equal((await runReconciliation(a.req, { transactionID: f.transactionID, paymentID }, 'confirm', a.run, a.deps)).status, 200)
    // Isolated historical fixture: use the adapter to create shapes that app hooks refuse.
    const legacy = await db.payload.db.create({ collection: 'orders', data: {
      customer: f.customerID, commerceVersion: 'legacy', transactions: [f.transactionID], status: 'paid',
    } })
    const all = await db.payload.find({ collection: 'orders', limit: 2, depth: 0, where: { transactions: { equals: f.transactionID } } })
    assert.equal(all.totalDocs, 2)
    const row = await readPortOneTransaction(a.req, paymentID)
    assert.equal((await projectLocalResult(a.req, row)).outcome, 'confirmed')
    await assert.rejects(projectLocalResult(a.req, { ...row, order: String(legacy.id) }))
    await setTimeout(1100)

    const pending = await seedAttempt(db.payload), b = await confirmation(db.payload, pending)
    const pendingID = pending.transactionID.replaceAll('-', '')
    await db.payload.db.create({ collection: 'orders', data: {
      customer: pending.customerID, commerceVersion: 'legacy', transactions: [pending.transactionID], status: 'paid',
    } })
    const signed = { type: 'Transaction.Paid', data: { paymentId: pendingID, storeId: providerConfig.storeId } }
    const endpoint = createAdapterEndpoints({ ...b.deps, verifyWebhook: async () => signed }).find(e => e.path === '/webhooks')!
    const request = Object.assign(new Request(providerConfig.origin + '/api/payments/portone/webhooks', {
      method: 'POST', body: JSON.stringify(signed),
      headers: { 'content-type': 'application/json', 'webhook-id': 'legacy-only', 'webhook-timestamp': '1', 'webhook-signature': 'synthetic' },
    }), { payload: db.payload, user: null, context: {} }) as unknown as import('payload').PayloadRequest
    assert.equal((await endpoint.handler(request)).status, 200)
    const held = await readPortOneTransaction(b.req, pendingID)
    assert.equal(held.status, 'pending')
    assert.equal(held.commerceResolutionConflict, true)
    assert.equal((await effects(db.payload.db.pool, pending)).orders, 0)
  })
  await setTimeout(1100)
  await t.test('native retired Paid case is private and blocks every membership purchase of that account only', async (st) => {
    const { randomUUID } = await import('node:crypto')
    const { initiateAttempt, initiateThroughEndpoint, seedCheckoutCart } = await import('../core/payment-postgres-fixture')
    const { createPendingEndpoint } = await import('../../../src/lib/commerce/portone/pending')
    const { retireFailedPayment } = await import('../../../src/lib/commerce/portone/review')
    const { commerceSnapshotHash } = await import('../../../src/lib/commerce/snapshot-hash')
    const { readPortOneTransaction } = await import('../../../src/lib/commerce/portone/adapter')
    const { paidReviewScope, reconciliationEventScope } = await import('../../../src/lib/commerce/portone/accounting')
    const old = await initiateAttempt(db.payload), other = await seedAttempt(db.payload)
    const paymentID = old.transactionID.replaceAll('-', '')
    const input = { transactionID: old.transactionID, paymentID }
    let status = 'FAILED'
    const readyReads: { paymentId: string; storeId: string }[] = []
    const webhookID = 'native-paid-review'
    const signed = { type: 'Transaction.Paid', data: { paymentId: paymentID, storeId: providerConfig.storeId } }
    const deps = { config: providerConfig, verifyWebhook: async () => signed, getPayment: async (requested: { paymentId: string; storeId: string }) => {
      if (status === 'READY') readyReads.push(requested)
      return { id: requested.paymentId, status, storeId: providerConfig.storeId, channel: { key: providerConfig.channelKey, type: 'TEST' },
        customer: { id: old.customerID }, currency: 'KRW', amount: { total: old.snapshot.totalAmount, paid: 0, cancelled: 0 }, disputes: [] }
    } }
    const control = new Pool({ connectionString: target.url, max: 1 })
    st.after(() => control.end())
    const retire = async (attempt: { transactionID: string; paymentID: string }) => {
      const owner = await createLocalReq({ user: old.user }, db.payload)
      assert.equal((await runReconciliation(owner, attempt, 'retire', async () => {
        await retireFailedPayment(owner, attempt, deps)
        return Response.json({ retired: true })
      }, deps)).status, 200)
    }
    const freshSameProductCart = async () => {
      const cartID = randomUUID()
      await db.payload.db.create({ collection: 'carts', customID: cartID, data: {
        customer: old.customerID, currency: 'KRW', subtotal: old.snapshot.unitAmount,
        items: [{ id: randomUUID(), product: old.productID, quantity: 1 }],
      } })
      return cartID
    }
    const assertPrepared = async (cartID: string, productID: string, eventID: string) => {
      const result = await initiateThroughEndpoint(db.payload, old.user, { cartID, shippingAddress: old.snapshot.shippingAddress }) as {
        outcome: string; transactionID: string; paymentID: string; paymentRequest?: unknown
      }
      assert.equal(result.outcome, 'prepared')
      assert.match(result.transactionID, /^[0-9a-f-]{36}$/)
      assert.notEqual(result.transactionID, old.transactionID)
      assert.equal(result.paymentID, result.transactionID.replaceAll('-', ''))
      assert.deepEqual(result.paymentRequest, {
        paymentId: result.paymentID, storeId: providerConfig.storeId, channelKey: providerConfig.channelKey,
        totalAmount: old.snapshot.totalAmount, orderName: old.snapshot.orderName, currency: 'KRW',
        redirectUrl: providerConfig.origin + '/shop/payment',
        customer: { customerId: old.customerID, email: old.user.email, ...(old.user.name ? { fullName: old.user.name } : {}) },
      })
      const row = await readPortOneTransaction(await createLocalReq({ user: old.user }, db.payload), result.paymentID)
      const { snapshot } = row.portone
      assert.deepEqual([snapshot.cartID, snapshot.productID, snapshot.eventID, snapshot.customerID], [cartID, productID, eventID, old.customerID])
      const hash = commerceSnapshotHash(snapshot)
      assert.deepEqual((await control.query(
        'SELECT id, customer_id, status, amount::int, portone_payment_i_d, portone_snapshot_hash FROM transactions WHERE cart_id=$1', [cartID],
      )).rows, [{ id: result.transactionID, customer_id: old.customerID, status: 'pending', amount: old.snapshot.totalAmount,
        portone_payment_i_d: result.paymentID, portone_snapshot_hash: hash }])
      assert.deepEqual((await control.query(
        'SELECT customer_id, product_id, event_id, release_i_d, quantity::int, snapshot_hash, state, order_id FROM commerce_reservations WHERE attempt_i_d=$1',
        [result.transactionID],
      )).rows, [{ customer_id: old.customerID, product_id: productID, event_id: eventID, release_i_d: 'membership',
        quantity: 1, snapshot_hash: hash, state: 'reserved', order_id: null }])
      return { transactionID: result.transactionID, paymentID: result.paymentID }
    }
    const caseCount = async () => (await control.query(
      'SELECT count(*)::int AS n FROM commerce_reconciliations WHERE scope=$1', [paidReviewScope(old.transactionID)],
    )).rows[0].n
    await retire(input)
    const before = await effects(control, old)
    assert.equal(before.status, 'failed')
    // A real replacement can prepare after verified retirement, before any case exists.
    assert.equal(await caseCount(), 0)
    const positive = await assertPrepared(await freshSameProductCart(), old.productID, old.eventID)
    await retire(positive)
    assert.deepEqual(await effects(control, old), before)
    status = 'READY'
    const url = providerConfig.origin + '/api/payments/portone'
    const request = Object.assign(new Request(url + '/webhooks', { method: 'POST', body: JSON.stringify(signed),
      headers: { 'content-type': 'application/json', 'webhook-id': webhookID, 'webhook-timestamp': '1', 'webhook-signature': 'synthetic' } }),
    { payload: db.payload, user: null, context: {} }) as unknown as import('payload').PayloadRequest
    const handler = createAdapterEndpoints(deps).find(e => e.path === '/webhooks')!.handler
    assert.equal((await handler(request)).ok, false)
    assert.deepEqual(readyReads, [{ paymentId: paymentID, storeId: providerConfig.storeId }])
    const eventScope = reconciliationEventScope(old.transactionID, webhookID)
    const caseScope = paidReviewScope(old.transactionID)
    const evidence = (await control.query('SELECT scope, state FROM commerce_reconciliations WHERE scope IN ($1, $2)',
      [eventScope, caseScope])).rows
    assert.equal(evidence.length, 2)
    const event = evidence.find(row => row.scope === eventScope)?.state
    const paidCase = evidence.find(row => row.scope === caseScope)?.state
    assert.deepEqual(event?.event, { id: webhookID, type: 'Transaction.Paid' })
    assert.equal(paidCase?.eventID, webhookID)
    assert.deepEqual(paidCase?.identity, event.identity)
    const { startedAt: _startedAt, ...tuple } = event.identity
    assert.deepEqual(tuple, { ...input, customerID: old.customerID, cartID: old.cartID, snapshotHash: commerceSnapshotHash(old.snapshot) })
    const discover = async (user: typeof old.user, productID: string) => {
      const req = Object.assign(new Request(url + '/pending?productID=' + productID), { user, payload: db.payload }) as unknown as import('payload').PayloadRequest
      const result = await createPendingEndpoint(async () => String(user.id)).handler(req)
      assert.equal(result.status, 200)
      return (await result.json()).attempts as { transactionID: string; reviewHold: boolean; status: string }[]
    }
    const attempts = await discover(old.user, old.productID)
    assert.equal(attempts.length, 1)
    assert.equal(attempts[0].transactionID, old.transactionID)
    assert.equal(attempts[0].reviewHold, true)
    assert.equal(attempts[0].status, 'failed')
    // The case stays private: another account sees only its own attempts, never this case.
    const otherAttempts = await discover(other.user, old.productID)
    assert.equal(otherAttempts.some(attempt => attempt.transactionID === old.transactionID), false)
    assert.deepEqual(otherAttempts.map(attempt => attempt.transactionID), [other.transactionID])
    // Single membership token per account: discovery is never narrowed by product,
    // because the case blocks every membership product of this account.
    assert.deepEqual((await discover(old.user, other.productID)).map(attempt => attempt.transactionID), [old.transactionID])
    const cartID = await freshSameProductCart()
    const samePurchaseState = async () => (await control.query(`SELECT
      (SELECT count(*)::int FROM transactions WHERE cart_id=$1) AS attempts,
      (SELECT count(*)::int FROM commerce_reservations WHERE customer_id=$2 AND release_i_d=$3) AS reservations,
      (SELECT reserved_quantity::int FROM commerce_allowances WHERE customer_id=$2 AND release_i_d=$3) AS allowance_reserved,
      (SELECT purchased_at FROM carts WHERE id=$1) AS cart_purchased,
      (SELECT reserved_quantity::int FROM commerce_events WHERE id=$4) AS event_reserved,
      (SELECT committed_quantity::int FROM commerce_events WHERE id=$4) AS event_committed`,
    [cartID, old.customerID, 'membership', old.eventID])).rows
    const beforeDenial = await samePurchaseState()
    assert.deepEqual(beforeDenial, [{ attempts: 0, reservations: 2, allowance_reserved: 0, cart_purchased: null, event_reserved: 0, event_committed: 0 }])
    await assert.rejects(initiateThroughEndpoint(db.payload, old.user, { cartID, shippingAddress: old.snapshot.shippingAddress }),
      /initiate answered 500:.*Error initiating payment/)
    assert.deepEqual(await samePurchaseState(), beforeDenial)
    assert.deepEqual(await effects(control, old), before)
    // Single membership token per account: the same buyer's open Paid case also holds
    // a different membership product, with no attempt, reservation or allowance written.
    const distinct = await seedCheckoutCart(db.payload, old)
    const distinctState = async () => (await control.query(`SELECT
      (SELECT count(*)::int FROM transactions WHERE cart_id=$1) AS attempts,
      (SELECT reserved_quantity::int FROM commerce_allowances WHERE customer_id=$2 AND release_i_d='membership') AS allowance_reserved`,
    [distinct.cartID, old.customerID])).rows
    const beforeDistinct = await distinctState()
    await assert.rejects(initiateThroughEndpoint(db.payload, old.user, { cartID: distinct.cartID, shippingAddress: old.snapshot.shippingAddress }),
      /initiate answered 500:.*Error initiating payment/)
    assert.deepEqual(await distinctState(), beforeDistinct)
    assert.deepEqual(await effects(control, old), before)
  })
  await setTimeout(1100)
  await t.test('a settled Paid case stops holding after verified full cancellation; an unresolved late Paid still holds', async (st) => {
    const { randomUUID } = await import('node:crypto')
    const { initiateAttempt, initiateThroughEndpoint, seedCheckoutCart } = await import('../core/payment-postgres-fixture')
    const { createPendingEndpoint } = await import('../../../src/lib/commerce/portone/pending')
    const { assertPurchaseWithoutPaidReview, PaymentReviewRequired, retireFailedPayment } = await import('../../../src/lib/commerce/portone/review')
    const { readPortOneTransaction } = await import('../../../src/lib/commerce/portone/adapter')
    const { paidReviewScope, paidDispositionScope, reconciliationEventScope } = await import('../../../src/lib/commerce/portone/accounting')
    const control = new Pool({ connectionString: target.url, max: 1 })
    st.after(() => control.end())
    type Attempt = Awaited<ReturnType<typeof initiateAttempt>>
    const url = providerConfig.origin + '/api/payments/portone'
    const provider = (f: Attempt, status: string, paid: number, cancelled: number) => async () => ({ id: f.transactionID.replaceAll('-', ''),
      storeId: providerConfig.storeId, status, channel: { key: providerConfig.channelKey, type: 'TEST' }, customer: { id: f.customerID },
      currency: 'KRW', amount: { total: f.snapshot.totalAmount, paid, cancelled }, disputes: [] })
    // Stay under the global five-GET-per-second provider ceiling shared by every attempt.
    const pace = () => setTimeout(1100)
    const signedWebhook = async (f: Attempt, id: string, type: string, getPayment: () => Promise<unknown>) => {
      await pace()
      const event = { type, data: { paymentId: f.transactionID.replaceAll('-', ''), storeId: providerConfig.storeId } }
      const request = Object.assign(new Request(url + '/webhooks', { method: 'POST', body: JSON.stringify(event),
        headers: { 'content-type': 'application/json', 'webhook-id': id, 'webhook-timestamp': '1', 'webhook-signature': 'synthetic' } }),
      { payload: db.payload, user: null, context: {} }) as unknown as import('payload').PayloadRequest
      return createAdapterEndpoints({ config: providerConfig, verifyWebhook: async () => event, getPayment })
        .find(e => e.path === '/webhooks')!.handler(request)
    }
    const evidence = async (transactionID: string) => Object.fromEntries((await control.query(
      'SELECT scope, state FROM commerce_reconciliations WHERE scope = $1 OR scope LIKE $2 ORDER BY scope',
      [paidReviewScope(transactionID), `reconciliation-paid-disposition:${transactionID}:%`])).rows.map(row => [row.scope, row.state]))
    // Disposable proof database only: force a same-millisecond tie to show ordering never depends on the clock.
    const tieWithDisposition = (transactionID: string, eventID: string, sequence: number) => control.query(
      'UPDATE commerce_reconciliations SET created_at = (SELECT created_at FROM commerce_reconciliations WHERE scope = $2) WHERE scope = $1',
      [reconciliationEventScope(transactionID, eventID), paidDispositionScope(transactionID, sequence)])
    const discover = async (f: Attempt) => {
      const req = Object.assign(new Request(url + '/pending'), { user: f.user, payload: db.payload }) as unknown as import('payload').PayloadRequest
      const result = await createPendingEndpoint(async () => String(f.user.id)).handler(req)
      assert.equal(result.status, 200)
      return ((await result.json()).attempts as { transactionID: string }[]).map(attempt => attempt.transactionID)
    }
    const { createResultEndpoint } = await import('../../../src/lib/commerce/portone/result')
    const localResult = async (f: Attempt) => {
      const query = new URLSearchParams({ transactionID: f.transactionID, paymentID: f.transactionID.replaceAll('-', ''), cartID: f.cartID })
      const req = Object.assign(new Request(url + '/result?' + query), { user: f.user, payload: db.payload }) as unknown as import('payload').PayloadRequest
      const body = await (await createResultEndpoint(async () => String(f.user.id)).handler(req)).json() as { outcome: string; status?: string }
      return [body.outcome, body.status]
    }
    const purchaseGate = async (f: Attempt) => {
      const req = await createLocalReq({ user: f.user }, db.payload)
      return assertPurchaseWithoutPaidReview(req, { ...f.snapshot, cartID: randomUUID(), productID: randomUUID() })
    }

    // A signed Paid arrives while the attempt is still pending, so the immutable case opens first.
    const settled = await initiateAttempt(db.payload)
    assert.equal((await signedWebhook(settled, 'paid-before-settlement', 'Transaction.Paid', provider(settled, 'READY', 0, 0))).ok, false)
    const opened = await evidence(settled.transactionID)
    assert.deepEqual(Object.keys(opened), [paidReviewScope(settled.transactionID)])
    assert.equal(opened[paidReviewScope(settled.transactionID)].reason, 'signed-paid-pending')
    // The browser confirmation then settles this exact attempt.
    await pace()
    const browser = await confirmation(db.payload, settled)
    assert.equal((await runReconciliation(browser.req, { transactionID: settled.transactionID,
      paymentID: settled.transactionID.replaceAll('-', ''), cartID: settled.cartID }, 'confirm', browser.run, browser.deps)).status, 200)
    assert.equal((await readPortOneTransaction(browser.req, settled.transactionID.replaceAll('-', ''))).status, 'succeeded')
    assert.deepEqual(await discover(settled), [])
    await purchaseGate(settled)
    // A verified full cancellation follows.
    const cancel = provider(settled, 'CANCELLED', settled.snapshot.totalAmount, settled.snapshot.totalAmount)
    await signedWebhook(settled, 'cancelled-after-settlement', 'Transaction.Cancelled', cancel)
    const cancelled = await readPortOneTransaction(browser.req, settled.transactionID.replaceAll('-', ''))
    assert.deepEqual([cancelled.status, cancelled.commerceReviewHold, cancelled.commerceResolutionConflict], ['cancelled', true, false])
    const reservationState = async (f: Attempt) => (await control.query(
      'SELECT state, release_reason, provider_event_i_d FROM commerce_reservations WHERE attempt_i_d=$1', [f.transactionID])).rows
    const allowance = async (f: Attempt) => (await control.query(
      "SELECT paid_quantity::int, reserved_quantity::int FROM commerce_allowances WHERE customer_id=$1 AND release_i_d='membership'", [f.customerID])).rows
    const released = await reservationState(settled)
    assert.deepEqual(released.map(row => [row.state, row.release_reason]), [['released', 'confirmed-cancel']])
    // The order moves to refunded once, with its record; the financial snapshot is untouched.
    const orderRecord = async (f: Attempt) => (await control.query(`SELECT status, amount::int, commerce_snapshot,
      commerce_refund_source, commerce_refund_provider_event_i_d, commerce_refund_transaction_i_d, commerce_refund_refunded_at
      FROM orders WHERE id = (SELECT order_id FROM transactions WHERE id = $1)`, [f.transactionID])).rows
    const refunded = await orderRecord(settled)
    assert.equal(refunded.length, 1)
    assert.deepEqual([refunded[0].status, refunded[0].amount, refunded[0].commerce_refund_source, refunded[0].commerce_refund_provider_event_i_d,
      refunded[0].commerce_refund_transaction_i_d, refunded[0].commerce_refund_refunded_at instanceof Date],
    ['refunded', settled.snapshot.totalAmount, 'provider', 'cancelled-after-settlement', settled.transactionID, true])
    const closed = await evidence(settled.transactionID)
    // Case 11: the Paid case is unchanged; the disposition is a separate immutable record.
    assert.deepEqual(closed[paidReviewScope(settled.transactionID)], opened[paidReviewScope(settled.transactionID)])
    const { startedAt: _startedAt, ...tuple } = opened[paidReviewScope(settled.transactionID)].identity
    assert.deepEqual(closed[paidDispositionScope(settled.transactionID, 1)].identity, tuple)
    assert.equal(closed[paidDispositionScope(settled.transactionID, 1)].disposition, 'verified-full-cancellation')
    assert.deepEqual(await discover(settled), [])
    await purchaseGate(settled)
    assert.deepEqual(await localResult(settled), ['local-terminal', 'cancelled'])
    // Case 11 replay: the same cancellation changes nothing and releases nothing twice.
    const freed = await allowance(settled)
    await signedWebhook(settled, 'cancelled-after-settlement', 'Transaction.Cancelled', cancel)
    assert.deepEqual(await evidence(settled.transactionID), closed)
    assert.deepEqual(await reservationState(settled), released)
    assert.deepEqual(await allowance(settled), freed)
    assert.deepEqual(await orderRecord(settled), refunded)
    assert.deepEqual(await discover(settled), [])
    // Case 13: the original Paid redelivered after the cancellation is stale and cannot reopen it.
    const stale = await signedWebhook(settled, 'paid-before-settlement', 'Transaction.Paid', provider(settled, 'PAID', settled.snapshot.totalAmount, 0))
    assert.deepEqual([stale.status, (await stale.json()).outcome], [200, 'already-cancelled'])
    assert.equal((await readPortOneTransaction(browser.req, settled.transactionID.replaceAll('-', ''))).commerceResolutionConflict, false)
    assert.deepEqual(await evidence(settled.transactionID), closed)
    assert.deepEqual(await discover(settled), [])
    // The same holds when that Paid and the cancellation share a millisecond.
    assert.equal((await tieWithDisposition(settled.transactionID, 'paid-before-settlement', 1)).rowCount, 1)
    const tied = await signedWebhook(settled, 'paid-before-settlement', 'Transaction.Paid', provider(settled, 'PAID', settled.snapshot.totalAmount, 0))
    assert.deepEqual([tied.status, (await tied.json()).outcome], [200, 'already-cancelled'])
    assert.deepEqual(await discover(settled), [])
    // The account can buy membership again, on another release.
    const again = await seedCheckoutCart(db.payload, settled)
    const prepared = await initiateThroughEndpoint(db.payload, settled.user, { cartID: again.cartID, shippingAddress: again.shippingAddress }) as {
      outcome: string; transactionID: ReturnType<typeof randomUUID> }
    assert.equal(prepared.outcome, 'prepared')
    // Case 13: an independent unresolved case on the same account holds by itself.
    const next: Attempt = { ...settled, transactionID: prepared.transactionID, cartID: again.cartID, productID: again.productID, eventID: again.eventID }
    const retire = async (f: Attempt) => {
      await pace()
      const input = { transactionID: f.transactionID, paymentID: f.transactionID.replaceAll('-', '') }
      const deps = { config: providerConfig, getPayment: provider(f, 'FAILED', 0, 0) }
      const owner = await createLocalReq({ user: f.user }, db.payload)
      assert.equal((await runReconciliation(owner, input, 'retire', async () => {
        await retireFailedPayment(owner, input, deps)
        return Response.json({ retired: true })
      }, deps)).status, 200)
    }
    const latePaid = async (f: Attempt, id: string) => {
      assert.equal((await signedWebhook(f, id, 'Transaction.Paid', provider(f, 'READY', 0, 0))).ok, false)
      assert.deepEqual(Object.keys(await evidence(f.transactionID)), [paidReviewScope(f.transactionID)])
    }
    await retire(next)
    await latePaid(next, 'late-paid-next')
    // Pending and /result parity: the settled conflict is closed, only the independent hold is listed.
    assert.deepEqual(await discover(settled), [next.transactionID])
    assert.deepEqual(await localResult(settled), ['local-terminal', 'cancelled'])
    await assert.rejects(purchaseGate(settled), PaymentReviewRequired)
    // Case 13: a Paid first delivered after the cancellation is a fresh contradiction and holds again,
    // even when it shares the cancellation's millisecond.
    await signedWebhook(settled, 'fresh-paid-after-cancellation', 'Transaction.Paid', cancel)
    assert.equal((await tieWithDisposition(settled.transactionID, 'fresh-paid-after-cancellation', 1)).rowCount, 1)
    // The fresh Paid raised a resolution conflict on the terminal attempt; pending discovery must agree with the gate below.
    assert.equal((await readPortOneTransaction(browser.req, settled.transactionID.replaceAll('-', ''))).commerceResolutionConflict, true)
    assert.deepEqual((await discover(settled)).sort(), [next.transactionID, settled.transactionID].sort())
    assert.deepEqual(await localResult(settled), ['review-required', undefined])
    // Replaying the first cancellation neither clears nor reopens anything.
    const reopened = await evidence(settled.transactionID)
    await signedWebhook(settled, 'cancelled-after-settlement', 'Transaction.Cancelled', cancel)
    assert.deepEqual(await evidence(settled.transactionID), reopened)
    assert.deepEqual((await discover(settled)).sort(), [next.transactionID, settled.transactionID].sort())
    // A later, distinct verified full cancellation resolves it again, while the independent hold stays.
    await signedWebhook(settled, 'second-cancellation', 'Transaction.Cancelled', cancel)
    const second = (await evidence(settled.transactionID))[paidDispositionScope(settled.transactionID, 2)]
    assert.deepEqual([second?.sequence, second?.conflictAtCancellation, [...(second?.paidEventsAtCancellation ?? [])].sort()],
      [2, true, ['fresh-paid-after-cancellation', 'paid-before-settlement']])
    // Pending and /result parity: the settled conflict is closed, only the independent hold is listed.
    assert.deepEqual(await discover(settled), [next.transactionID])
    assert.deepEqual(await localResult(settled), ['local-terminal', 'cancelled'])
    await assert.rejects(purchaseGate(settled), PaymentReviewRequired)

    // Case 12: a late Paid on a retired attempt, without a verified full cancellation, still holds.
    const retired = await initiateAttempt(db.payload)
    await retire(retired)
    await latePaid(retired, 'late-paid-after-retirement')
    const lateCase = await evidence(retired.transactionID)
    // Replay: the quarantined attempt keeps one unchanged case.
    await signedWebhook(retired, 'late-paid-after-retirement', 'Transaction.Paid', provider(retired, 'READY', 0, 0))
    assert.deepEqual(await evidence(retired.transactionID), lateCase)
    assert.deepEqual(await discover(retired), [retired.transactionID])
    await assert.rejects(purchaseGate(retired), PaymentReviewRequired)
    // Partial (unmatched) cancellation is not a disposition.
    await signedWebhook(retired, 'partial-cancel', 'Transaction.PartialCancelled',
      provider(retired, 'PARTIAL_CANCELLED', retired.snapshot.totalAmount, retired.snapshot.totalAmount - 1))
    assert.deepEqual(await evidence(retired.transactionID), lateCase)
    assert.deepEqual(await discover(retired), [retired.transactionID])
    await assert.rejects(purchaseGate(retired), PaymentReviewRequired)
    // Case 11 on a retired attempt: the verified full cancellation of that payment frees the account.
    const fullCancel = await signedWebhook(retired, 'full-cancel-after-retirement', 'Transaction.Cancelled',
      provider(retired, 'CANCELLED', retired.snapshot.totalAmount, retired.snapshot.totalAmount))
    const retiredClosed = await evidence(retired.transactionID)
    assert.deepEqual(retiredClosed[paidReviewScope(retired.transactionID)], lateCase[paidReviewScope(retired.transactionID)])
    assert.equal(retiredClosed[paidDispositionScope(retired.transactionID, 1)]?.disposition, 'verified-full-cancellation',
      `full cancellation answered ${fullCancel.status}`)
    assert.deepEqual(await discover(retired), [])
    await purchaseGate(retired)
    assert.deepEqual(await localResult(retired), ['local-terminal', 'failed'])
    // A fresh authoritative PAID read after that closure, with no new signed Paid id and the conflict flag
    // already set, is recorded as a contradiction and reopens the hold.
    await signedWebhook(retired, 'dispute-resolved-after-closure', 'Transaction.DisputeResolved',
      provider(retired, 'PAID', retired.snapshot.totalAmount, 0))
    const contradicted = await control.query("SELECT state FROM commerce_reconciliations WHERE scope LIKE $1",
      [`reconciliation-paid-contradiction:${retired.transactionID}:%`])
    assert.equal(contradicted.rows.some(row => row.state.afterDispositions === 1), true, 'contradiction recorded after the cancellation')
    assert.deepEqual(await discover(retired), [retired.transactionID])
    assert.deepEqual((await localResult(retired))[0], 'review-required')
    await assert.rejects(purchaseGate(retired), PaymentReviewRequired)
    // A later, distinct verified full cancellation that accounts for it closes the case again.
    await signedWebhook(retired, 'second-cancel-after-contradiction', 'Transaction.Cancelled',
      provider(retired, 'CANCELLED', retired.snapshot.totalAmount, retired.snapshot.totalAmount))
    assert.deepEqual(await discover(retired), [])
    assert.deepEqual(await localResult(retired), ['local-terminal', 'failed'])

    // Case 12: an unreadable provider never frees the account.
    const unreadable = await initiateAttempt(db.payload)
    await retire(unreadable)
    await latePaid(unreadable, 'late-paid-unreadable')
    await signedWebhook(unreadable, 'cancel-unreadable', 'Transaction.Cancelled', async () => { throw new Error('Provider unavailable') })
    assert.deepEqual(Object.keys(await evidence(unreadable.transactionID)), [paidReviewScope(unreadable.transactionID)])
    assert.deepEqual(await discover(unreadable), [unreadable.transactionID])
    await assert.rejects(purchaseGate(unreadable), PaymentReviewRequired)

    // Case 14: no Paid case ever. Settled by the browser alone, then fully cancelled,
    // then a fresh authoritative PAID read contradicts the cancellation. The
    // contradiction alone must hold the account in /pending, /result and the purchase fence.
    const quiet = await initiateAttempt(db.payload)
    await pace()
    const quietBrowser = await confirmation(db.payload, quiet)
    assert.equal((await runReconciliation(quietBrowser.req, { transactionID: quiet.transactionID,
      paymentID: quiet.transactionID.replaceAll('-', ''), cartID: quiet.cartID }, 'confirm', quietBrowser.run, quietBrowser.deps)).status, 200)
    const quietCancel = provider(quiet, 'CANCELLED', quiet.snapshot.totalAmount, quiet.snapshot.totalAmount)
    await signedWebhook(quiet, 'quiet-full-cancel', 'Transaction.Cancelled', quietCancel)
    const quietClosed = await evidence(quiet.transactionID)
    assert.deepEqual(Object.keys(quietClosed), [paidDispositionScope(quiet.transactionID, 1)], 'a disposition and no Paid case')
    assert.deepEqual(await discover(quiet), [])
    await purchaseGate(quiet)
    await signedWebhook(quiet, 'quiet-paid-after-cancel', 'Transaction.DisputeResolved', provider(quiet, 'PAID', quiet.snapshot.totalAmount, 0))
    assert.equal((await control.query('SELECT count(*)::int AS n FROM commerce_reconciliations WHERE scope = $1',
      [paidReviewScope(quiet.transactionID)])).rows[0].n, 0, 'still no Paid case')
    assert.equal((await control.query('SELECT count(*)::int AS n FROM commerce_reconciliations WHERE scope LIKE $1',
      [`reconciliation-paid-contradiction:${quiet.transactionID}:%`])).rows[0].n, 1, 'one contradiction recorded')
    assert.deepEqual(await discover(quiet), [quiet.transactionID])
    assert.equal((await localResult(quiet))[0], 'review-required')
    await assert.rejects(purchaseGate(quiet), PaymentReviewRequired)
    // The real prepare path refuses a new membership purchase on another product, writing nothing.
    const blockedCart = await seedCheckoutCart(db.payload, quiet)
    const attemptsOn = async (cartID: string) => (await control.query('SELECT count(*)::int AS n FROM transactions WHERE cart_id=$1', [cartID])).rows[0].n
    await assert.rejects(initiateThroughEndpoint(db.payload, quiet.user, { cartID: blockedCart.cartID, shippingAddress: blockedCart.shippingAddress }))
    assert.equal(await attemptsOn(blockedCart.cartID), 0)
    // Another account is not held by it.
    const stranger = await initiateAttempt(db.payload)
    await purchaseGate(stranger)
    // A later, distinct verified full cancellation that accounts for the contradiction frees the account.
    await signedWebhook(quiet, 'quiet-second-cancel', 'Transaction.Cancelled', quietCancel)
    assert.deepEqual(await discover(quiet), [])
    await purchaseGate(quiet)

    // Case 15: contradiction evidence and a new purchase serialize on the account lock, in
    // both orders. A separate session holds one later lock so each side pauses mid-transaction.
    const { Client } = await import('pg')
    const holder = new Client({ connectionString: target.url })
    await holder.connect()
    st.after(() => holder.end())
    const hold = (key: string) => holder.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', ['commerce:' + key])
    const letGo = (key: string) => holder.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', ['commerce:' + key])
    const waiters = async () => (await control.query("SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND NOT granted")).rows[0].n
    const waitingOn = async (n: number, what: string) => {
      for (let i = 0; i < 200; i++) { if (await waiters() === n) return; await setTimeout(50) }
      assert.fail(what)
    }
    const outcome = <T>(work: Promise<T>) => work.then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }))
    const releasedAttempt = async (name: string) => {
      const f = await initiateAttempt(db.payload)
      await pace()
      const run = await confirmation(db.payload, f)
      assert.equal((await runReconciliation(run.req, { transactionID: f.transactionID,
        paymentID: f.transactionID.replaceAll('-', ''), cartID: f.cartID }, 'confirm', run.run, run.deps)).status, 200)
      await signedWebhook(f, name + '-cancel', 'Transaction.Cancelled', provider(f, 'CANCELLED', f.snapshot.totalAmount, f.snapshot.totalAmount))
      await purchaseGate(f)
      return f
    }
    const contradictions = async (f: Attempt) => (await control.query('SELECT count(*)::int AS n FROM commerce_reconciliations WHERE scope LIKE $1',
      [`reconciliation-paid-contradiction:${f.transactionID}:%`])).rows[0].n
    // (a) The review holds the account and pauses before the reservation; initiate waits, then refuses.
    const first = await releasedAttempt('race-review-first')
    const firstCart = await seedCheckoutCart(db.payload, first)
    await hold('attempt:' + first.transactionID)
    const firstReview = outcome(signedWebhook(first, 'race-review-first-paid', 'Transaction.DisputeResolved', provider(first, 'PAID', first.snapshot.totalAmount, 0)))
    await waitingOn(1, 'the review pauses on the reservation lock')
    const firstInitiate = outcome(initiateThroughEndpoint(db.payload, first.user, { cartID: firstCart.cartID, shippingAddress: firstCart.shippingAddress }))
    await waitingOn(2, 'initiate waits for the review that holds the account')
    await letGo('attempt:' + first.transactionID)
    const [reviewedFirst, initiatedSecond] = await Promise.all([firstReview, firstInitiate])
    assert.equal(reviewedFirst.ok, true)
    assert.equal(await contradictions(first), 1)
    assert.equal(initiatedSecond.ok, false, 'no new payment request while the account is held')
    assert.equal(await attemptsOn(firstCart.cartID), 0)
    await assert.rejects(purchaseGate(first), PaymentReviewRequired)
    // (b) Initiate holds the account and pauses before its cart; the review waits until it commits.
    const racer = await releasedAttempt('race-initiate-first')
    const secondCart = await seedCheckoutCart(db.payload, racer)
    await hold('cart:' + secondCart.cartID)
    const secondInitiate = outcome(initiateThroughEndpoint(db.payload, racer.user, { cartID: secondCart.cartID, shippingAddress: secondCart.shippingAddress }))
    await waitingOn(1, 'initiate pauses on the cart lock')
    const secondReview = outcome(signedWebhook(racer, 'race-initiate-first-paid', 'Transaction.DisputeResolved', provider(racer, 'PAID', racer.snapshot.totalAmount, 0)))
    await waitingOn(2, 'the review waits for the initiate that holds the account')
    assert.equal(await contradictions(racer), 0)
    await letGo('cart:' + secondCart.cartID)
    const [initiatedFirst, reviewedSecond] = await Promise.all([secondInitiate, secondReview])
    assert.equal(initiatedFirst.ok && (initiatedFirst.value as { outcome: string }).outcome, 'prepared', 'initiate committed before the evidence existed')
    assert.equal(reviewedSecond.ok, true)
    assert.equal(await contradictions(racer), 1)
    assert.ok((await discover(racer)).includes(racer.transactionID))
    await assert.rejects(purchaseGate(racer), PaymentReviewRequired)
  })
  await setTimeout(1100)
  await t.test('FAILED can retire at 31 minutes; rejected PAID retirement does not fence a later Paid webhook', async () => {
    const { retireFailedPayment } = await import('../../../src/lib/commerce/portone/review')
    const old = await seedAttempt(db.payload, new Date(Date.now() - 31 * 60000).toISOString())
    const req = await createLocalReq({ user: old.user }, db.payload), paymentID = old.transactionID.replaceAll('-', '')
    const deps = { config: providerConfig, getPayment: async () => ({ id: paymentID,
      status: 'FAILED', storeId: providerConfig.storeId, channel: { key: providerConfig.channelKey, type: 'TEST' },
      customer: { id: old.customerID }, currency: 'KRW', amount: { total: 13000, paid: 0, cancelled: 0 }, disputes: [] }) }
    const input = { transactionID: old.transactionID, paymentID }
    assert.equal((await runReconciliation(req, input, 'retire', async () => {
      await retireFailedPayment(req, input, deps); return Response.json({ retired: true })
    }, deps)).status, 200)
    assert.equal((await effects(db.payload.db.pool, old)).status, 'failed')
    await setTimeout(1100)
    const paid = await seedAttempt(db.payload, new Date(Date.now() - 31 * 60000).toISOString()), attempt = await confirmation(db.payload, paid)
    const data = { transactionID: paid.transactionID, paymentID: paid.transactionID.replaceAll('-', '') }
    await assert.rejects(runReconciliation(attempt.req, data, 'retire', async () => {
      await retireFailedPayment(attempt.req, data, attempt.deps); return Response.json({})
    }, attempt.deps))
    assert.equal((await read(paid.transactionID)).active, undefined)
    // Genuine late Paid bypasses both the automatic cooldown and the 30-minute stop.
    const event = { type: 'Transaction.Paid', data: { paymentId: data.paymentID, storeId: providerConfig.storeId } }
    const original = db.payload.config.endpoints
    db.payload.config.endpoints = [{ ...original!.find(e => e.path === '/payments/portone/confirm-order')!, path: '/payments/portone/confirm-order', method: 'post', handler: async (same: import('payload').PayloadRequest) => {
      // The official harness must operate on the same verified native request.
      // Same admission owner is required by the installed adapter, so call its native endpoint on same.
      const { createPortOneAdapter } = await import('../../../src/lib/commerce/portone/adapter')
      const { createRequire } = await import('node:module')
      const { pathToFileURL } = await import('node:url')
      const entry = createRequire(import.meta.url).resolve('@payloadcms/plugin-ecommerce')
      const { confirmOrderHandler } = await import(new URL('./endpoints/confirmOrder.js', pathToFileURL(entry)).href)
      const { inPaymentEndpoint } = await import('../../../src/lib/commerce/_shared/transaction')
      const handler = confirmOrderHandler({ paymentMethod: createPortOneAdapter(attempt.deps), currenciesConfig: {
        defaultCurrency: 'KRW', supportedCurrencies: [{ code: 'KRW', decimals: 0, label: 'Won', symbol: 'KRW' }] } })
      return inPaymentEndpoint(same, handler)
    } }] as unknown as typeof db.payload.config.endpoints
    try {
      const request = Object.assign(new Request(providerConfig.origin + '/api/payments/portone/webhooks', { method: 'POST',
        headers: { 'content-type': 'application/json', 'webhook-id': 'paid-after-retire', 'webhook-timestamp': '1', 'webhook-signature': 'synthetic' },
        body: JSON.stringify(event) }), { payload: db.payload, user: null, context: {} }) as unknown as import('payload').PayloadRequest
      const endpoint = createAdapterEndpoints({ ...attempt.deps, verifyWebhook: async () => event }).find(e => e.path === '/webhooks')!
      assert.equal((await endpoint.handler(request)).status, 200)
      assert.equal((await effects(db.payload.db.pool, paid)).orders, 1)
    } finally { db.payload.config.endpoints = original }
  })
  await setTimeout(1100)
  await t.test('risk reserve remains available after ordinary exhaustion; signed evidence persists', async () => {
    const f = await seedAttempt(db.payload), req = await createLocalReq({ user: f.user }, db.payload)
    const identity = await identityFor(req, f)
    await admitReconciliation(req, identity, 'confirm')
    await endReconciliation(req, 'completed')
    const row = await ledger(f.transactionID), state = await read(f.transactionID)
    const update = await createLocalReq({ user: f.user }, db.payload)
    await inPaymentTransaction(update, () => withCommerceWrite(update, async () => {
      await db.payload.update({ collection: 'commerce-reconciliations', id: row.id, req: update, overrideAccess: true,
        data: { state: { ...state, ordinaryUsed: 12, escalation: 'budget' } } })
    }))
    const signed = { type: 'Transaction.PartialCancelled', data: { paymentId: identity.paymentID, storeId: providerConfig.storeId } }
    const request = (id: string) => Object.assign(new Request(providerConfig.origin + '/api/payments/portone/webhooks', { method: 'POST',
      headers: { 'content-type': 'application/json', 'webhook-id': id, 'webhook-timestamp': '1', 'webhook-signature': 'synthetic-verified' }, body: JSON.stringify(signed) }),
      { payload: db.payload, user: null, context: {} }) as unknown as import('payload').PayloadRequest
    let gets = 0
    const endpoint = createAdapterEndpoints({ config: providerConfig, verifyWebhook: async () => signed,
      getPayment: async () => { gets++; return { id: identity.paymentID, storeId: providerConfig.storeId, status: 'PARTIAL_CANCELLED',
        channel: { type: 'TEST', key: providerConfig.channelKey }, customer: { id: f.customerID }, currency: 'KRW',
        amount: { total: 13000, paid: 13000, cancelled: 1000 }, disputes: [] } } }).find(endpoint => endpoint.path === '/webhooks')!
    assert.equal((await admitReconciliation(req, identity, 'risk')).decision, 'budget-stop', 'unsigned callers cannot use risk capacity')
    assert.equal((await endpoint.handler(request('i2-risk-1'))).status, 409)
    const after = await read(f.transactionID)
    assert.equal(gets, 1); assert.equal(after.ordinaryUsed, 12); assert.equal(after.riskUsed, 1)
    assert.equal(after.riskEvents[0]?.id, 'i2-risk-1')
    assert.equal(after.riskProofs.length, 1)
    assert.equal(after.escalation, 'review')
    const current = await db.payload.findByID({ collection: 'transactions', id: f.transactionID, overrideAccess: true })
    assert.equal(current.commerceReviewHold, true)
    for (let i = 2; i <= 5; i++) await endpoint.handler(request('i2-risk-' + i))
    assert.equal(gets, 4)
    assert.equal((await read(f.transactionID)).riskUsed, 4)
    assert.equal((await read(f.transactionID)).riskEvents.length, 4)
  })
  await setTimeout(1100)
  await t.test('SIGKILL after debit survives restart; expiry never starts overlapping work or clears a hold', async () => {
    const f = await seedAttempt(db.payload), req = await createLocalReq({ user: f.user }, db.payload)
    const identity = await identityFor(req, f)
    const held = await seedAttempt(db.payload), heldReq = await createLocalReq({ user: held.user }, db.payload)
    const heldIdentity = await identityFor(heldReq, held)
    await admitReconciliation(heldReq, heldIdentity, 'confirm')
    await inPaymentTransaction(heldReq, () => withCommerceWrite(heldReq, () => heldReq.payload.update({ collection: 'transactions', id: held.transactionID,
      req: heldReq, overrideAccess: true, data: { commerceReviewHold: true } })))
    const a = worker(identity, 'lock-crash')
    assert.equal((await a.message).debited, 1)
    a.child.kill('SIGKILL'); await a.exited
    const global = await db.payload.find({ collection: 'commerce-reconciliations', overrideAccess: true,
      where: { scope: { equals: 'reconciliation-provider-global' } } })
    const slots = (global.docs[0].state as { reservations: { token: string; remaining: number }[] }).reservations
    const killed = await read(f.transactionID)
    assert.equal(slots.some(slot => slot.token === killed.active?.token && slot.remaining === 1), true,
      'SIGKILL never releases the crashed holder global reservation before expiry')
    const b = worker(identity)
    assert.equal((await b.message).decision, 'join'); await b.exited
    assert.equal((await read(f.transactionID)).ordinaryUsed, 1)
    await setTimeout(91000)
    const c = worker(identity)
    assert.equal((await c.message).decision, 'ownership-unknown'); await c.exited
    assert.equal((await read(f.transactionID)).active?.remaining, 1)
    assert.equal((await read(f.transactionID)).ordinaryUsed, 1)
    await assert.rejects(assertReconciliationFence(heldReq))
    await assert.rejects(inPaymentTransaction(heldReq, async () => {
      await assertReconciliationFence(heldReq)
      await withCommerceWrite(heldReq, () => heldReq.payload.update({ collection: 'transactions', id: held.transactionID,
        req: heldReq, overrideAccess: true, data: { commerceReviewHold: false } }))
    }))
    assert.equal(await endReconciliation(heldReq, 'completed'), 'unknown')
    const heldRow = await db.payload.findByID({ collection: 'transactions', id: held.transactionID, overrideAccess: true })
    assert.equal(heldRow.commerceReviewHold, true)
    assert.equal((await effects(db.payload.db.pool, held)).orders, 0)
  })
  await setTimeout(1100)
  await t.test('real accounted GETs reach 11; a two-read confirmation cannot fit', async () => {
    const f = await seedAttempt(db.payload), req = await createLocalReq({ user: f.user }, db.payload)
    const identity = await identityFor(req, f)
    for (let i = 0; i < 11; i++) {
      if (i && i % 5 === 0) await setTimeout(1100)
      assert.equal((await admitReconciliation(req, identity, 'resume')).decision, 'started')
      await accountedProviderGet(req, identity.paymentID, async () => ({}))
      await endReconciliation(req, 'completed')
    }
    assert.equal((await admitReconciliation(req, identity, 'confirm')).decision, 'budget-stop')
    assert.equal((await read(f.transactionID)).ordinaryUsed, 11)
  })
  await setTimeout(1100)
  await t.test('ledger acquisition and settlement-lock contention stay known without fencing or pool starvation', { timeout: 15000 }, async () => {
    const { getReconciliationPool, KnownLedgerRejection } = await import('../../../src/lib/commerce/portone/ledger-transaction')
    const f = await seedAttempt(db.payload), req = await createLocalReq({ user: f.user }, db.payload)
    const other = await seedAttempt(db.payload), otherReq = await createLocalReq({ user: other.user }, db.payload)
    const identity = await identityFor(req, f), otherIdentity = await identityFor(otherReq, other)
    assert.equal((await admitReconciliation(req, identity, 'confirm')).decision, 'started')
    const pool = getReconciliationPool(db.payload)
    const clients = await Promise.all([pool.connect(), pool.connect()])
    try {
      await assert.rejects(debitProviderGet(req, identity.paymentID), KnownLedgerRejection)
      assert.equal((await admitReconciliation(otherReq, otherIdentity, 'resume')).decision, 'busy')
    } finally { clients.forEach(client => client.release()) }
    assert.equal((await read(f.transactionID)).active?.state, 'running')
    assert.equal((await read(f.transactionID)).ordinaryUsed, 0)
    await debitProviderGet(req, identity.paymentID)
    let unlock!: () => void, signal!: () => void
    const held = new Promise<void>(resolve => { signal = resolve })
    const release = new Promise<void>(resolve => { unlock = resolve })
    const settlement = inPaymentTransaction(req, async () => {
      await assertReconciliationFence(req)
      signal(); await release
    })
    await held
    try {
      const contenders = await Promise.all([0, 1].map(async () => {
        const contender = await createLocalReq({ user: f.user }, db.payload)
        return admitReconciliation(contender, identity, 'confirm')
      }))
      assert.deepEqual(contenders.map(value => value.decision), ['busy', 'busy'])
      assert.equal((await admitReconciliation(otherReq, otherIdentity, 'resume')).decision, 'started')
      await endReconciliation(otherReq, 'completed')
    } finally { unlock(); await settlement }
    assert.equal((await read(f.transactionID)).active?.state, 'running')
    assert.equal((await read(f.transactionID)).escalation, undefined)
    assert.equal(await endReconciliation(req, 'completed'), 'completed')
  })
  await setTimeout(1100)
  await t.test('busy completion and risk retention use durable catch-up without a fixture retry or ownership fence', { timeout: 15000 }, async () => {
    for (const riskBusy of [false, true]) {
      const f = await seedAttempt(db.payload), req = await createLocalReq({ user: f.user }, db.payload)
      const identity = await identityFor(req, f)
      assert.equal((await admitReconciliation(req, identity, 'resume')).decision, 'started')
      const active = (await read(f.transactionID)).active!
      const blocker = await db.payload.db.pool.connect()
      let marker: { recordedAt: number }
      try {
        await blocker.query('BEGIN')
        await blocker.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['commerce:reconciliation-provider-global'])
        if (riskBusy) await blocker.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['commerce:reconciliation-attempt:' + f.transactionID])
        await retainReconciliationRisk(req, { id: identity.paymentID, storeId: providerConfig.storeId, status: 'PAID',
          channel: { type: 'TEST', key: providerConfig.channelKey }, customer: { id: f.customerID }, currency: 'KRW',
          amount: { total: 13000, paid: 13000, cancelled: 0 }, disputes: [] })
        assert.equal(await endReconciliation(req, 'completed'), 'completed')
        const markers = await db.payload.find({ collection: 'commerce-reconciliations', overrideAccess: true,
          where: { scope: { equals: `reconciliation-completion:${f.transactionID}:${active.token}` } } })
        assert.equal(markers.docs.length, 1)
        marker = markers.docs[0].state as unknown as { recordedAt: number }
        if (riskBusy) {
          const proofs = await db.payload.find({ collection: 'commerce-reconciliations', overrideAccess: true,
            where: { scope: { contains: `reconciliation-risk:${f.transactionID}:${active.token}:` } } })
          assert.equal(proofs.docs.length, 1)
        } else assert.equal((await read(f.transactionID)).riskProofs.length, 1)
      } finally { await blocker.query('ROLLBACK'); blocker.release() }
      // Accelerate only the lease boundary, preserving marker-before-expiry ordering.
      const row = await ledger(f.transactionID), state = await read(f.transactionID)
      const update = await createLocalReq({ user: f.user }, db.payload)
      await withCommerceWrite(update, () => db.payload.update({ collection: 'commerce-reconciliations', id: row.id, req: update,
        overrideAccess: true, data: { state: { ...state, active: { ...state.active!, expiresAt: marker.recordedAt + 1 } } as never } }))
      await setTimeout(5)
      const next = await createLocalReq({ user: f.user }, db.payload)
      assert.equal((await admitReconciliation(next, identity, 'resume')).decision, 'started')
      const recovered = await read(f.transactionID)
      assert.equal(recovered.riskProofs.length, 1)
      assert.equal(recovered.last?.outcome, 'completed')
      assert.equal(recovered.escalation, undefined)
      await endReconciliation(next, 'completed')
    }
  })
  await setTimeout(1100)
  await t.test('six financial boundaries saturate the five-connection pool without ledger self-starvation', { timeout: 15000 }, async () => {
    const holders = []
    for (let i = 0; i < 6; i++) {
      if (i === 5) await setTimeout(1100)
      const f = await seedAttempt(db.payload), req = await createLocalReq({ user: f.user }, db.payload)
      const identity = await identityFor(req, f)
      assert.equal((await admitReconciliation(req, identity, 'resume')).decision, 'started')
      await accountedProviderGet(req, identity.paymentID, async () => ({}))
      holders.push({ f, req, identity })
    }
    const pool = db.payload.db.pool
    const capacity = 5 - (pool.totalCount - pool.idleCount)
    assert.equal(capacity > 0 && capacity <= 5, true)
    let entered = 0, release!: () => void
    const saturated = new Promise<void>(resolve => { release = resolve })
    const completed = await Promise.all(holders.map(({ f, req, identity }) => inPaymentTransaction(req, async () => {
      if (++entered === capacity) { assert.equal(pool.waitingCount > 0, true); release() }
      await saturated
      await retainReconciliationRisk(req, { id: identity.paymentID, storeId: providerConfig.storeId, status: 'PAID',
        channel: { type: 'TEST', key: providerConfig.channelKey }, customer: { id: f.customerID }, currency: 'KRW',
        amount: { total: 13000, paid: 13000, cancelled: 0 }, disputes: [] })
      return true
    })))
    assert.equal(completed.length, 6)
    for (const { req } of holders) await endReconciliation(req, 'completed')
  })
  await setTimeout(1100)
  await t.test('global five-GET rolling ceiling is shared by three independent processes', async () => {
    const attempts = await Promise.all([seedAttempt(db.payload), seedAttempt(db.payload), seedAttempt(db.payload)])
    const identities = await Promise.all(attempts.map(async f => identityFor(await createLocalReq({ user: f.user }, db.payload), f)))
    const workers = identities.map((identity, index) => worker(identity, index === 2 ? 'gate-resume' : 'gate-confirm'))
    assert.deepEqual((await Promise.all(workers.map(w => w.message))).map(m => m.decision), ['ready', 'ready', 'ready'])
    const admitted = workers.map(w => w.nextMessage())
    workers.forEach(w => w.child.send({ start: true }))
    assert.deepEqual((await Promise.all(admitted)).map(m => m.decision), ['admitted', 'admitted', 'admitted'])
    const messages = []
    for (const w of workers) {
      const done = w.nextMessage()
      w.child.send({ dispatch: true })
      messages.push(await done)
    }
    assert.equal(messages.every(m => m.decision === 'started'), true)
    assert.equal(messages.reduce((sum, m) => sum + (m.debited ?? 0), 0), 5)
    await Promise.all(workers.map(w => w.exited))
    const sixth = await seedAttempt(db.payload), req = await createLocalReq({ user: sixth.user }, db.payload)
    assert.equal((await admitReconciliation(req, await identityFor(req, sixth), 'resume')).decision, 'rate-stop')
    await setTimeout(1100)
    const next = await createLocalReq({ user: sixth.user }, db.payload)
    assert.equal((await admitReconciliation(next, await identityFor(next, sixth), 'resume')).decision, 'started')
    await endReconciliation(next, 'completed')
  })
  await t.test('budget fit, 24-hour lifetime and 30-minute escalation survive fresh process admission', async () => {
    for (const [age, expected] of [[1800001, 'review-required'], [86400001, 'lifetime-stop']] as const) {
      const f = await seedAttempt(db.payload, new Date(Date.now() - age).toISOString())
      const req = await createLocalReq({ user: f.user }, db.payload)
      const identity = await identityFor(req, f)
      const child = worker(identity, 'automatic')
      assert.equal((await child.message).decision, expected); await child.exited
      assert.equal((await read(f.transactionID)).escalation, expected === 'lifetime-stop' ? 'lifetime' : 'unresolved')
      assert.equal((await read(f.transactionID)).ordinaryUsed, 0)
      const reservation = await db.payload.find({ collection: 'commerce-reservations', where: { attemptID: { equals: f.transactionID } }, overrideAccess: true })
      assert.equal(reservation.docs[0].state, 'reserved')
    }
  })
  await t.test('S0c-2: member reads stay inside the signed-in account across two accounts', async () => {
    // Real plugin collections and access rules: a member read can only return its own rows,
    // a foreign order looks the same as a missing one, and a held attempt keeps its hold flag.
    const { randomUUID } = await import('node:crypto')
    const { createPendingEndpoint } = await import('../../../src/lib/commerce/portone/pending')
    const { loadOwnPaidReviewAttempts } = await import('../../../src/lib/commerce/portone/review')
    const { paidReviewScope } = await import('../../../src/lib/commerce/portone/accounting')
    const { buyerAdmissions } = await import('../../../src/lib/commerce/guests')
    const as = (f: { user: import('payload').TypedUser }) => createLocalReq({ user: f.user }, db.payload)
    const a = await seedAttempt(db.payload), b = await seedAttempt(db.payload)
    const reqA = await as(a)
    // A's attempt carries a verified review hold (set the way the settlement owner sets it).
    await admitReconciliation(reqA, await identityFor(reqA, a), 'confirm')
    await inPaymentTransaction(reqA, () => withCommerceWrite(reqA, () => reqA.payload.update({ collection: 'transactions', id: a.transactionID,
      req: reqA, overrideAccess: true, data: { commerceReviewHold: true } })))
    const pendingResponse = async (f: typeof a) => {
      const req = await as(f)
      Object.defineProperty(req, 'url', { value: 'http://localhost:3000/api/payments/portone/pending' })
      Object.defineProperty(req, 'method', { value: 'GET' })
      return createPendingEndpoint(async () => f.customerID).handler(req)
    }
    const pending = async (f: typeof a) => {
      const res = await pendingResponse(f)
      assert.equal(res.status, 200)
      return ((await res.json()) as { attempts: { transactionID: string; reviewHold: boolean }[] }).attempts.map(x => [x.transactionID, x.reviewHold])
    }
    assert.deepEqual(await pending(a), [[a.transactionID, true]])
    assert.deepEqual(await pending(b), [[b.transactionID, false]])
    // S0c-2 r2: real Paid cases, seeded in savePaidReviewCase's exact ledger shape (only verified
    // Paid ingress writes them in production). Owner is the case's customer; attempt is what it names.
    const seedPaidCase = async (owner: typeof a, attempt: typeof a) => {
      const identity = { ...(await identityFor(await as(attempt), attempt)), customerID: owner.customerID }
      const now = new Date().toISOString()
      await db.payload.db.create({ collection: 'commerce-reconciliations', data: { scope: paidReviewScope(attempt.transactionID),
        state: { identity, eventID: 'paid-' + attempt.transactionID, reason: 'review-required', recordedAt: Date.now() }, createdAt: now, updatedAt: now } })
    }
    await seedPaidCase(a, a); await seedPaidCase(b, b)
    assert.deepEqual((await loadOwnPaidReviewAttempts(await as(a), a.customerID)).map(row => row.id), [a.transactionID])
    assert.deepEqual((await loadOwnPaidReviewAttempts(await as(b), b.customerID)).map(row => row.id), [b.transactionID])
    assert.deepEqual(await pending(b), [[b.transactionID, true]])
    // The verified customer must still be the signed-in member.
    await assert.rejects(loadOwnPaidReviewAttempts(await as(b), a.customerID), /Verified membership required/)
    // Mismatch regression: C's case names D's attempt. Member access cannot return it, so
    // discovery is an integrity stop (503), never an empty list or D's row.
    const c = await seedAttempt(db.payload), d = await seedAttempt(db.payload)
    await seedPaidCase(c, d)
    await assert.rejects(loadOwnPaidReviewAttempts(await as(c), c.customerID), /Paid review attempt missing/)
    assert.equal((await pendingResponse(c)).status, 503)
    await setTimeout(1100)
    const s = await seedAttempt(db.payload, new Date(Date.now() - 31 * 60000).toISOString()), attempt = await confirmation(db.payload, s)
    const paymentID = s.transactionID.replaceAll('-', '')
    assert.equal((await runReconciliation(attempt.req, { transactionID: s.transactionID, paymentID, cartID: s.cartID }, 'confirm', async () => {
      assert.equal(await readSettlementProof(attempt.req, paymentID, attempt.deps), 'provider-paid')
      return attempt.run()
    }, attempt.deps)).status, 200)
    const order = (await db.payload.find({ collection: 'orders', where: { commerceAttemptID: { equals: s.transactionID } }, overrideAccess: true })).docs[0]
    assert.ok(order)
    const own = await buyerAdmissions({ req: await as(s), orderID: String(order.id) })
    assert.equal(own.length >= 1, true)
    for (const orderID of [String(order.id), randomUUID()]) {
      await assert.rejects(buyerAdmissions({ req: await as(b), orderID }), /^Error: Order admissions unavailable$/)
    }
  })
  await t.test('music Hardening C: playlist eligibility follows a live admission for the event, on every read', async () => {
    // Owner, 23 Nov: no event admits no one; a refunded or revoked ticket loses access on the next read.
    const { hasEventAdmission } = await import('../../../src/lib/music/eligibility')
    await setTimeout(1100)
    const s = await seedAttempt(db.payload, new Date(Date.now() - 31 * 60000).toISOString()), attempt = await confirmation(db.payload, s)
    const paymentID = s.transactionID.replaceAll('-', '')
    assert.equal((await runReconciliation(attempt.req, { transactionID: s.transactionID, paymentID, cartID: s.cartID }, 'confirm', async () => {
      assert.equal(await readSettlementProof(attempt.req, paymentID, attempt.deps), 'provider-paid')
      return attempt.run()
    }, attempt.deps)).status, 200)
    const admission = (await db.payload.find({ collection: 'commerce-admissions' as never, overrideAccess: true, limit: 1, depth: 0,
      where: { and: [{ buyer: { equals: s.customerID } }, { unit: { equals: 1 } }] } })).docs[0] as unknown as { id: string; event: string }
    assert.ok(admission)
    const eventID = s.eventID
    assert.equal(admission.event, eventID)
    const other = await seedAttempt(db.payload)
    assert.equal(await hasEventAdmission(db.payload, s.customerID, eventID), true)
    assert.equal(await hasEventAdmission(db.payload, s.customerID, null), false)
    assert.equal(await hasEventAdmission(db.payload, s.customerID, other.eventID), false)
    assert.equal(await hasEventAdmission(db.payload, other.customerID, eventID), false)
    // A refund on a used ticket keeps its status but holds the benefit: no playlist.
    await db.payload.db.updateOne({ collection: 'commerce-admissions' as never, id: admission.id, data: { benefitReview: true } })
    assert.equal(await hasEventAdmission(db.payload, s.customerID, eventID), false)
    await db.payload.db.updateOne({ collection: 'commerce-admissions' as never, id: admission.id, data: { benefitReview: false } })
    assert.equal(await hasEventAdmission(db.payload, s.customerID, eventID), true)
    // Revocation (what release and returns write) loses access on the very next read.
    await db.payload.db.updateOne({ collection: 'commerce-admissions' as never, id: admission.id, data: { status: 'revoked', eventAccountKey: null } })
    assert.equal(await hasEventAdmission(db.payload, s.customerID, eventID), false)
  })
  t.diagnostic('Real PostgreSQL/native Payload Local API, shipped additive migration and separate OS processes; provider evidence synthetic; no production/provider acceptance')
})
