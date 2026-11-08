import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import {
  createLocalTicketQuote,
  type LocalTicketCatalogue,
  type LocalTicketQuoteContext,
} from '@/lib/tickets/quotes'

// Synthetic commercial values belong here, not in a production catalogue.
const now = new Date('2026-11-01T03:00:00.000Z')
const catalogue: LocalTicketCatalogue = {
  version: 'test-catalogue-v1',
  currency: 'KRW',
  saleStartsAt: '2026-11-01T02:00:00.000Z',
  saleEndsAt: '2026-11-01T04:00:00.000Z',
  quoteTtlSeconds: 300,
  maximumTotalQuantity: 12,
  ticketTypes: [
    { id: 'test-admission', unitAmountMinor: 12345, minimumQuantity: 1, maximumQuantity: 10 },
    { id: 'test-inclusion', unitAmountMinor: 321, minimumQuantity: 2, maximumQuantity: 6 },
  ],
}
const context: LocalTicketQuoteContext = {
  catalogue,
  principal: { userId: 'canonical-user-id', emailVerified: true, phoneBound: true },
  now,
}
const request = {
  catalogueVersion: catalogue.version,
  items: [
    { ticketTypeId: 'test-admission', quantity: 2 },
    { ticketTypeId: 'test-inclusion', quantity: 3 },
  ],
}

test('quotes server-owned amounts and identifies the canonical owner without reserving or enabling checkout', () => {
  const result = createLocalTicketQuote(request, context)
  assert.equal(result.success, true)
  if (!result.success) return
  assert.match(result.quote.id, /^[0-9a-f-]{36}$/)
  assert.equal(result.quote.ownerId, context.principal?.userId)
  assert.equal(result.quote.catalogueVersion, catalogue.version)
  assert.equal(result.quote.currency, 'KRW')
  assert.deepEqual(result.quote.items, [
    {
      ticketTypeId: 'test-admission',
      quantity: 2,
      unitAmountMinor: 12345,
      totalAmountMinor: 24690,
    },
    { ticketTypeId: 'test-inclusion', quantity: 3, unitAmountMinor: 321, totalAmountMinor: 963 },
  ])
  assert.equal(result.quote.totalAmountMinor, 25653)
  assert.equal(result.quote.issuedAt, now.toISOString())
  assert.equal(result.quote.expiresAt, '2026-11-01T03:05:00.000Z')
  assert.equal(result.quote.reservation, 'none')
  assert.equal(result.quote.checkoutAvailable, false)
})

test('each quote has a new opaque ID and leaves request, catalogue, and principal unchanged', () => {
  const before = structuredClone({ request, context })
  const first = createLocalTicketQuote(request, context)
  const second = createLocalTicketQuote(request, context)
  assert.equal(first.success, true)
  assert.equal(second.success, true)
  if (first.success && second.success) assert.notEqual(first.quote.id, second.quote.id)
  assert.deepEqual({ request, context }, before)
})

test('catalogue quantity policy is not the unrelated interaction-study range', () => {
  // Library-first check: computeTicketTotal is tied to studyTicketBounds (1–6).
  // Quotes instead use the injected catalogue; Zod validates, BigInt prices safely.
  const result = createLocalTicketQuote(
    {
      catalogueVersion: catalogue.version,
      items: [{ ticketTypeId: 'test-admission', quantity: 10 }],
    },
    context,
  )
  assert.equal(result.success, true)
  if (result.success) assert.equal(result.quote.totalAmountMinor, 123450)
})

test('rejects client prices, totals, currency, owner, and eligibility assertions rather than ignoring them', () => {
  for (const extra of [
    { totalAmountMinor: 1 },
    { currency: 'USD' },
    { userId: 'other' },
    { emailVerified: true },
    { phoneBound: true },
    { checkoutAvailable: true },
  ]) {
    assert.deepEqual(createLocalTicketQuote({ ...request, ...extra }, context), {
      success: false,
      error: 'invalid-request',
    })
  }
  assert.deepEqual(
    createLocalTicketQuote(
      {
        ...request,
        items: [{ ...request.items[0], unitAmountMinor: 1 }],
      },
      context,
    ),
    { success: false, error: 'invalid-request' },
  )
})

test('rejects malformed requests, unsafe or coerced quantities, duplicate IDs, and oversized selection lists', () => {
  for (const input of [null, [], {}, { ...request, items: [] }]) {
    assert.deepEqual(createLocalTicketQuote(input, context), {
      success: false,
      error: 'invalid-request',
    })
  }
  for (const quantity of [0, -1, 1.5, '2', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.deepEqual(
      createLocalTicketQuote(
        { ...request, items: [{ ticketTypeId: 'test-admission', quantity }] },
        context,
      ),
      {
        success: false,
        error: 'invalid-request',
      },
    )
  }
  assert.deepEqual(
    createLocalTicketQuote({ ...request, items: [request.items[0], request.items[0]] }, context),
    {
      success: false,
      error: 'invalid-request',
    },
  )
  assert.deepEqual(
    createLocalTicketQuote(
      {
        ...request,
        items: Array.from({ length: 101 }, (_, i) => ({ ticketTypeId: `test-${i}`, quantity: 1 })),
      },
      context,
    ),
    { success: false, error: 'invalid-request' },
  )
})

test('requires canonical email and phone eligibility supplied by the server, never the request', () => {
  for (const principal of [
    null,
    { userId: 'canonical-user-id', emailVerified: false, phoneBound: true },
    { userId: 'canonical-user-id', emailVerified: true, phoneBound: false },
    { userId: '', emailVerified: true, phoneBound: true },
  ]) {
    assert.deepEqual(createLocalTicketQuote(request, { ...context, principal }), {
      success: false,
      error: 'member-required',
    })
  }
})

test('requires an explicitly injected usable catalogue and never supplies commercial defaults', () => {
  for (const value of [
    null,
    { ...catalogue, currency: 'krw' },
    { ...catalogue, quoteTtlSeconds: 0 },
    { ...catalogue, maximumTotalQuantity: 0 },
    { ...catalogue, ticketTypes: [] },
    { ...catalogue, ticketTypes: [catalogue.ticketTypes[0], catalogue.ticketTypes[0]] },
    { ...catalogue, ticketTypes: [{ ...catalogue.ticketTypes[0], minimumQuantity: 11 }] },
    { ...catalogue, ticketTypes: [{ ...catalogue.ticketTypes[0], unitAmountMinor: -1 }] },
    { ...catalogue, saleStartsAt: catalogue.saleEndsAt },
  ]) {
    assert.deepEqual(createLocalTicketQuote(request, { ...context, catalogue: value }), {
      success: false,
      error: 'catalogue-unavailable',
    })
  }
})

test('rejects stale versions, unavailable ticket IDs, and catalogue quantity rules', () => {
  assert.deepEqual(
    createLocalTicketQuote({ ...request, catalogueVersion: 'retired-test-v0' }, context),
    {
      success: false,
      error: 'catalogue-changed',
    },
  )
  assert.deepEqual(
    createLocalTicketQuote(
      { ...request, items: [{ ticketTypeId: 'missing', quantity: 1 }] },
      context,
    ),
    {
      success: false,
      error: 'ticket-unavailable',
    },
  )
  for (const items of [
    [{ ticketTypeId: 'test-admission', quantity: 11 }],
    [{ ticketTypeId: 'test-inclusion', quantity: 1 }],
    [
      { ticketTypeId: 'test-admission', quantity: 10 },
      { ticketTypeId: 'test-inclusion', quantity: 3 },
    ],
  ]) {
    assert.deepEqual(createLocalTicketQuote({ ...request, items }, context), {
      success: false,
      error: 'quantity-unavailable',
    })
  }
})

test('sale window is start-inclusive and end-exclusive; expiry never outlives the catalogue', () => {
  assert.deepEqual(
    createLocalTicketQuote(request, { ...context, now: new Date('2026-11-01T01:59:59.999Z') }),
    {
      success: false,
      error: 'sale-not-open',
    },
  )
  assert.equal(
    createLocalTicketQuote(request, { ...context, now: new Date(catalogue.saleStartsAt) }).success,
    true,
  )
  assert.deepEqual(
    createLocalTicketQuote(request, { ...context, now: new Date(catalogue.saleEndsAt) }),
    {
      success: false,
      error: 'catalogue-expired',
    },
  )
  const closing = createLocalTicketQuote(request, {
    ...context,
    now: new Date('2026-11-01T03:59:59.999Z'),
  })
  assert.equal(closing.success, true)
  if (closing.success) assert.equal(closing.quote.expiresAt, catalogue.saleEndsAt)
})

test('allows explicit zero and maximum-safe prices but rejects line and aggregate monetary overflow', () => {
  for (const amount of [0, Number.MAX_SAFE_INTEGER]) {
    const priced = {
      ...catalogue,
      ticketTypes: [{ ...catalogue.ticketTypes[0], unitAmountMinor: amount }],
    }
    const result = createLocalTicketQuote(
      { ...request, items: [{ ticketTypeId: 'test-admission', quantity: 1 }] },
      {
        ...context,
        catalogue: priced,
      },
    )
    assert.equal(result.success, true)
    if (result.success) assert.equal(result.quote.totalAmountMinor, amount)
  }
  for (const items of [
    [{ ticketTypeId: 'test-admission', quantity: 2 }],
    [
      { ticketTypeId: 'test-admission', quantity: 1 },
      { ticketTypeId: 'test-inclusion', quantity: 2 },
    ],
  ]) {
    assert.deepEqual(
      createLocalTicketQuote(
        { ...request, items },
        {
          ...context,
          catalogue: {
            ...catalogue,
            ticketTypes: catalogue.ticketTypes.map((type) => ({
              ...type,
              unitAmountMinor: Number.MAX_SAFE_INTEGER,
            })),
          },
        },
      ),
      { success: false, error: 'amount-overflow' },
    )
  }
  assert.deepEqual(
    createLocalTicketQuote(request, {
      ...context,
      catalogue: {
        ...catalogue,
        ticketTypes: catalogue.ticketTypes.map((type) => ({
          ...type,
          unitAmountMinor: Math.floor(Number.MAX_SAFE_INTEGER / 3),
        })),
      },
    }),
    { success: false, error: 'amount-overflow' },
  )
})

test('rejects invalid server clock or expiry arithmetic instead of issuing an invalid timestamp', () => {
  assert.deepEqual(createLocalTicketQuote(request, { ...context, now: new Date(NaN) }), {
    success: false,
    error: 'catalogue-unavailable',
  })
  const result = createLocalTicketQuote(request, {
    ...context,
    catalogue: { ...catalogue, quoteTtlSeconds: Number.MAX_SAFE_INTEGER },
  })
  assert.equal(result.success, true)
  if (result.success) assert.equal(result.quote.expiresAt, catalogue.saleEndsAt)
})

test('the default server clock produces a bounded quote without a client timestamp', () => {
  const startedAt = Date.now()
  const result = createLocalTicketQuote(request, {
    ...context,
    now: undefined,
    catalogue: {
      ...catalogue,
      saleStartsAt: '2000-01-01T00:00:00.000Z',
      saleEndsAt: '2099-01-01T00:00:00.000Z',
    },
  })
  assert.equal(result.success, true)
  if (result.success) {
    assert.ok(Date.parse(result.quote.issuedAt) >= startedAt)
    assert.ok(Date.parse(result.quote.issuedAt) <= Date.now())
    assert.equal(Date.parse(result.quote.expiresAt) - Date.parse(result.quote.issuedAt), 300_000)
  }
})

test('production mode cannot issue quotes even when a catalogue is passed', () => {
  const source = `import { createLocalTicketQuote } from './lib/tickets/quotes.ts';
    const result = createLocalTicketQuote({}, { catalogue: null, principal: null });
    if (JSON.stringify(result) !== JSON.stringify({success:false,error:'quotes-unavailable'})) process.exit(1);`
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', source],
    {
      cwd: new URL('../../', import.meta.url),
      env: { ...process.env, NODE_ENV: 'production' },
      encoding: 'utf8',
    },
  )
  assert.equal(result.status, 0, result.stderr)
})
