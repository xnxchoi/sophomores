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
  const { assertPaymentRiskReviewed } = await import('../../../src/lib/commerce/portone/review')
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
      await assertPaymentRiskReviewed(attempt.req, attempt.req.data as { transactionID: string; paymentID: string }, undefined, attempt.deps)
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
    assert.equal(after.events.some(e => e.id === 'paid-after-browser'), true)
    assert.equal(gets, 2)
    assert.equal((await read(f.transactionID)).ordinaryUsed, 2)
    assert.equal((await read(f.transactionID)).last?.outcome, 'completed')
    const effect = await effects(db.payload.db.pool, f)
    assert.equal(effect.orders, 1); assert.equal(effect.stock, 9); assert.equal(effect.admissions, 1)
    const replay = await confirmation(db.payload, f)
    assert.equal((await runReconciliation(replay.req, { transactionID: f.transactionID, paymentID: f.transactionID.replaceAll('-', '') }, 'confirm', replay.run, replay.deps)).status, 202)
    assert.equal(gets, 2)
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
  t.diagnostic('Real PostgreSQL/native Payload Local API, shipped additive migration and separate OS processes; provider evidence synthetic; no production/provider acceptance')
})
