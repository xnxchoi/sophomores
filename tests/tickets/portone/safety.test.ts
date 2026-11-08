import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Payload } from 'payload'
import { preparePayment, reconcilePayment } from '@/lib/tickets/portone/server'

const id = '019a313f-c922-7000-8000-000000000001'
const ownerId = '019a313f-c922-7000-8000-000000000002'
const attemptId = '019a313f-c922-7000-8000-000000000003'
const config = { origin: 'http://localhost:3000', storeId: 'store-test', channelKey: 'channel-test', apiSecret: 'test-api-secret', webhookSecret: 'test-webhook-secret' }
const catalogue = { orderName: 'Synthetic admission', unitAmount: 12000, currency: 'KRW' as const,
  maximumQuantity: 4, saleStartsAt: '2020-01-01T00:00:00Z', saleEndsAt: '2099-01-01T00:00:00Z' }
type Row = Record<string, unknown>
type Query = { and?: Query[]; [key: string]: unknown }

// Small in-memory CAS/unique-index model, not proof of the real Payload adapter.
function matches(row: Row, query: Query): boolean {
  if (query.and) return query.and.every((entry) => matches(row, entry))
  return Object.entries(query).every(([key, rule]) => {
    const predicate = rule as { equals?: unknown; exists?: boolean }
    return 'equals' in predicate ? row[key] === predicate.equals : predicate.exists === (row[key] != null)
  })
}
function fixture() {
  let rows: Row[] = []
  let creates = 0
  let next = 1
  let skipBinding = false
  let loseCreateResponse = false
  let loseBindResponse = false
  const calls: { where: Query; data: Row }[] = []
  const payload = {
    async find({ where }: { where: Query }) { return { docs: structuredClone(rows.filter((row) => matches(row, where))) } },
    async findByID({ id: requested }: { id: string }) { return structuredClone(rows.find((row) => row.id === requested) ?? null) },
    async create({ data }: { data: Row }) {
      creates++
      if (rows.some((row) => row.prepareKey === data.prepareKey)) throw Object.assign(new Error('Value must be unique'), {
        name: 'ValidationError', data: { errors: [{ path: 'prepareKey' }] }
      })
      const row = { ...data, id: id.slice(0, -1) + next++, paymentReference: null }
      rows = [...rows, row]
      if (loseCreateResponse) throw new Error('Synthetic lost create response')
      return structuredClone(row)
    },
    db: { async updateOne(input: { where: Query; data: Row }) {
      calls.push(input)
      if (skipBinding && 'paymentReference' in input.data) return null
      const index = rows.findIndex((row) => matches(row, input.where))
      if (index < 0) return null
      const updated = { ...rows[index], ...input.data }
      rows = rows.map((row, at) => at === index ? updated : row)
      if (loseBindResponse && 'paymentReference' in input.data) return null
      return structuredClone(updated)
    } }
  } as unknown as Payload
  return { payload, calls, rows: () => structuredClone(rows), creates: () => creates,
    replace: (row: Row) => { rows = rows.map((old) => old.id === row.id ? structuredClone(row) : old) },
    binding: (enabled: boolean) => { skipBinding = !enabled },
    lostCreate: () => { loseCreateResponse = true }, lostBind: () => { loseBindResponse = true } }
}
function request(payload: Payload) { return { payload, config, catalogue, quantity: 2, ownerId, attemptId } }
function provider(order: Row, extra: Row = {}) {
  return { id: order.id, status: 'PAID', storeId: config.storeId, channel: { key: config.channelKey, type: 'TEST' },
    amount: { total: order.totalAmount, paid: order.totalAmount, cancelled: 0 }, currency: order.currency,
    customer: { id: ownerId }, disputes: [], ...extra }
}

test('durable prepare retry reuses a single order and refuses changed payload/catalogue/channel', async () => {
  const f = fixture()
  const input = request(f.payload)
  const first = await preparePayment(input)
  assert.equal(first.recovered, false)
  assert.deepEqual(await preparePayment(input), { ...first, recovered: true })
  assert.equal(f.rows().length, 1)
  assert.equal(f.creates(), 1)
  assert.match(String(f.rows()[0].prepareKey), /^[a-f0-9]{64}$/)
  assert.match(String(f.rows()[0].prepareFingerprint), /^[a-f0-9]{64}$/)
  for (const changed of [{ quantity: 1 }, { catalogue: { ...catalogue, unitAmount: 14000 } },
    { config: { ...config, channelKey: 'channel-other' } }, { catalogue: { ...catalogue, orderName: 'Changed offer' } }]) {
    await assert.rejects(() => preparePayment({ ...input, ...changed }))
  }
  assert.equal(f.rows().length, 1)
})

test('concurrent prepares with the same owner/key converge through the durable unique index', async () => {
  const f = fixture()
  const results = await Promise.all([preparePayment(request(f.payload)), preparePayment(request(f.payload))])
  assert.equal(results[0].paymentId, results[1].paymentId)
  assert.equal(results.filter((result) => result.recovered === false).length, 1)
  assert.equal(f.rows().length, 1)
})

test('prepare recovers a persisted create response loss without allocating another order', async () => {
  const f = fixture()
  f.lostCreate()
  const first = await preparePayment(request(f.payload))
  assert.equal(first.recovered, true)
  assert.equal(first.paymentId, f.rows()[0].id)
  assert.equal((await preparePayment(request(f.payload))).paymentId, first.paymentId)
  assert.equal(f.creates(), 1)
})

test('prepare recovers an unbound pending row after a create-before-bind failure', async () => {
  const f = fixture()
  f.binding(false)
  await assert.rejects(() => preparePayment(request(f.payload)))
  assert.equal(f.rows().length, 1)
  assert.equal(f.rows()[0].paymentReference, null)
  f.binding(true)
  const recovered = await preparePayment(request(f.payload))
  assert.equal(recovered.recovered, true)
  assert.equal(recovered.paymentId, f.rows()[0].id)
  assert.equal(f.rows()[0].paymentReference, recovered.paymentId)
  assert.equal(f.creates(), 1)
})

test('a lost bind result is reread once and recovered without issuing another new SDK request', async () => {
  const f = fixture()
  f.lostBind()
  const recovered = await preparePayment(request(f.payload))
  assert.equal(recovered.recovered, true)
  assert.equal(recovered.paymentId, f.rows()[0].paymentReference)
  assert.equal(f.creates(), 1)
  assert.equal(f.calls.length, 1)
})

test('an unavailable create with no exact durable row propagates failure rather than recreating', async () => {
  const f = fixture()
  f.payload.create = (async () => { throw new Error('Synthetic unavailable storage') }) as Payload['create']
  await assert.rejects(() => preparePayment(request(f.payload)), /Synthetic unavailable storage/)
  assert.equal(f.rows().length, 0)
})

test('a global attempt cannot cross accounts and all terminal replays recover without reopening SDK payment', async () => {
  const f = fixture()
  await preparePayment(request(f.payload))
  const first = f.rows()[0]
  await assert.rejects(() => preparePayment({ ...request(f.payload), ownerId: '019a313f-c922-7000-8000-000000000004' }))
  assert.equal(f.rows().length, 1)
  for (const status of ['paid', 'held', 'cancelled', 'refunded']) {
    f.replace({ ...first, status })
    const recovered = await preparePayment(request(f.payload))
    assert.equal(recovered.recovered, true)
    assert.equal(recovered.paymentId, first.id)
  }
  assert.equal(f.rows().length, 1)
})

test('an existing attempt can recover after the sale window closes but a new attempt cannot prepare', async () => {
  const f = fixture()
  const first = await preparePayment(request(f.payload))
  const expired = { ...request(f.payload), now: new Date('2100-01-01T00:00:00Z') }
  assert.deepEqual(await preparePayment(expired), { ...first, recovered: true })
  await assert.rejects(() => preparePayment({ ...expired, attemptId: '019a313f-c922-7000-8000-000000000005' }))
  assert.equal(f.rows().length, 1)
})

test('prepare rejects missing/malformed retry identities before any order allocation', async () => {
  const f = fixture()
  for (const invalid of [undefined, '', 'not-uuid']) {
    await assert.rejects(() => preparePayment({ ...request(f.payload), attemptId: invalid as string }))
  }
  assert.equal(f.rows().length, 0)
})

test('known authoritative partial cancellation, dispute, or missing dispute evidence durably holds paid orders', async () => {
  for (const extra of [{ status: 'PARTIAL_CANCELLED', amount: { total: 24000, paid: 24000, cancelled: 12000 } },
    { status: 'CANCELLED', amount: { total: 24000, paid: 24000, cancelled: 12000 } },
    { amount: { total: 24000, paid: 23999, cancelled: 1 } },
    { disputes: [{ status: 'UNRESOLVED' }] }, { disputes: [{ status: 'UNKNOWN_FUTURE' }] }, { disputes: undefined }]) {
    const f = fixture()
    const prepared = await preparePayment(request(f.payload))
    const original = { ...f.rows()[0], status: 'paid' }
    f.replace(original)
    assert.deepEqual(await reconcilePayment({ payload: f.payload, config, paymentId: prepared.paymentId,
      getPayment: async () => provider(original, extra) }), { orderId: prepared.paymentId, status: 'held' })
    assert.equal(f.rows()[0].status, 'held')
    const writes = f.calls.filter((call) => call.data.status === 'held')
    assert.equal(writes.length, 1)
    assert.equal('id' in writes[0], false)
    assert.deepEqual(writes[0].data.status, 'held')
    assert.equal((await reconcilePayment({ payload: f.payload, config, paymentId: prepared.paymentId,
      getPayment: async () => provider(original) })).status, 'held', 'resolved/stale PAID cannot clear a hold')
    assert.equal(f.rows()[0].status, 'held')
  }
})

test('hold checks still reject mismatched provider identities and amounts without writing', async () => {
  const f = fixture()
  const prepared = await preparePayment(request(f.payload))
  const original = { ...f.rows()[0], status: 'paid' }
  f.replace(original)
  for (const extra of [{ id: attemptId }, { storeId: 'other-store' }, { customer: { id: attemptId } },
    { amount: { total: 1, paid: 1, cancelled: 0 } }, { channel: { key: config.channelKey, type: 'LIVE' } }]) {
    await assert.rejects(() => reconcilePayment({ payload: f.payload, config, paymentId: prepared.paymentId,
      getPayment: async () => provider(original, { disputes: [{ status: 'DISPUTED' }], ...extra }) }))
    assert.equal(f.rows()[0].status, 'paid')
  }
})

test('concurrent stale PAID and a reversal converge to held without restoring eligibility', async () => {
  const f = fixture()
  const prepared = await preparePayment(request(f.payload))
  const original = { ...f.rows()[0], status: 'paid' }
  f.replace(original)
  await Promise.all([
    reconcilePayment({ payload: f.payload, config, paymentId: prepared.paymentId, getPayment: async () => provider(original) }),
    reconcilePayment({ payload: f.payload, config, paymentId: prepared.paymentId,
      getPayment: async () => provider(original, { disputes: [{ status: 'UNRESOLVED' }] }) })
  ])
  assert.equal(f.rows()[0].status, 'held')
})

test('a hold wins over an already-read pending confirmation through the guarded retry path', async () => {
  const f = fixture()
  const prepared = await preparePayment(request(f.payload))
  const original = f.rows()[0]
  let release!: () => void
  const providerGate = new Promise<void>((resolve) => { release = resolve })
  const stale = reconcilePayment({ payload: f.payload, config, paymentId: prepared.paymentId,
    getPayment: async () => { await providerGate; return provider(original) } })
  await Promise.resolve()
  await reconcilePayment({ payload: f.payload, config, paymentId: prepared.paymentId,
    getPayment: async () => provider(original, { disputes: [{ status: 'UNRESOLVED' }] }) })
  release()
  assert.equal((await stale).status, 'held')
  assert.equal(f.rows()[0].status, 'held')
})

test('a duplicate paid confirmation re-reads a hold committed while provider lookup was pending', async () => {
  const f = fixture()
  const prepared = await preparePayment(request(f.payload))
  const original = { ...f.rows()[0], status: 'paid' }
  f.replace(original)
  let release!: () => void
  let started!: () => void
  const providerGate = new Promise<void>((resolve) => { release = resolve })
  const providerStarted = new Promise<void>((resolve) => { started = resolve })
  const stale = reconcilePayment({ payload: f.payload, config, paymentId: prepared.paymentId,
    getPayment: async () => { started(); await providerGate; return provider(original) } })
  await providerStarted
  await reconcilePayment({ payload: f.payload, config, paymentId: prepared.paymentId,
    getPayment: async () => provider(original, { disputes: [{ status: 'UNRESOLVED' }] }) })
  assert.equal(f.rows()[0].status, 'held')
  release()
  assert.equal((await stale).status, 'held')
  assert.equal(f.calls.filter((call) => 'status' in call.data).length, 1, 'duplicate read does not write or audit paid again')
})

test('post-provider order re-read rejects an immutable amount change before reporting duplicate paid', async () => {
  const f = fixture()
  const prepared = await preparePayment(request(f.payload))
  const original = { ...f.rows()[0], status: 'paid' }
  f.replace(original)
  let release!: () => void
  let started!: () => void
  const providerGate = new Promise<void>((resolve) => { release = resolve })
  const providerStarted = new Promise<void>((resolve) => { started = resolve })
  const stale = reconcilePayment({ payload: f.payload, config, paymentId: prepared.paymentId,
    getPayment: async () => { started(); await providerGate; return provider(original) } })
  await providerStarted
  f.replace({ ...original, totalAmount: 1 })
  release()
  await assert.rejects(() => stale)
  assert.equal(f.calls.filter((call) => 'status' in call.data).length, 0)
})

test('an authoritative full cancellation never automatically clears an existing hold', async () => {
  const f = fixture()
  const prepared = await preparePayment(request(f.payload))
  const original = { ...f.rows()[0], status: 'held' }
  f.replace(original)
  assert.equal((await reconcilePayment({ payload: f.payload, config, paymentId: prepared.paymentId,
    getPayment: async () => provider(original, { status: 'CANCELLED', amount: { total: 24000, paid: 24000, cancelled: 24000 } }) })).status, 'held')
  assert.equal(f.rows()[0].status, 'held')
})
