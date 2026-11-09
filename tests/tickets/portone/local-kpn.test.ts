import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { loadPortOneConfig, reviewedTestChannel } from '@/lib/tickets/portone/config'
import { createPortOneHandlers } from '@/lib/tickets/portone/http'

const reviewed = { storeId: 'store-cb510f04-39fc-487a-ab60-3bba06344687', channelKey: 'channel-key-23c1cd59-1efd-42b7-b3ec-192f1c7bd221' }
const env = { NODE_ENV: 'development', PORTONE_LOCAL_KPN_TEST: 'enabled', PORTONE_PAYMENT_MODE: 'sandbox',
  PORTONE_ORIGIN: 'http://localhost:3000', PORTONE_STORE_ID: reviewed.storeId, PORTONE_CHANNEL_KEY: reviewed.channelKey,
  PORTONE_API_SECRET: 'synthetic-api-secret', PORTONE_WEBHOOK_SECRET: Buffer.from('synthetic-webhook-secret-32-bytes!').toString('base64') }
const id = '019a313f-c922-7000-8000-000000000001'
const providerId = id.replaceAll('-', '')
const attemptId = '019a313f-c922-7000-8000-000000000002'
const catalogue = { orderName: 'Synthetic admission', unitAmount: 100, currency: 'KRW' as const,
  maximumQuantity: 4, saleStartsAt: '2020-01-01T00:00:00Z', saleEndsAt: '2099-01-01T00:00:00Z' }

test('reviewed KPN V2 TEST pair is exact and immutable, with no activation by default', () => {
  assert.deepEqual(reviewedTestChannel, reviewed)
  assert.equal(Object.isFrozen(reviewedTestChannel), true)
  for (const flag of [undefined, 'disabled']) {
    const config = loadPortOneConfig({ ...env, NODE_ENV: 'production', PORTONE_LOCAL_KPN_TEST: flag, PORTONE_ORIGIN: 'https://example.test', PORTONE_CHANNEL_KEY: 'other-channel' })
    assert.equal(config?.localKpnTestCheckout, false)
    assert.equal(Object.isFrozen(config), true)
  }
  assert.equal(loadPortOneConfig({}), null)
})

test('local KPN checkout requires explicit flag, development, sandbox, canonical HTTP loopback and the reviewed pair', () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000', 'http://localhost']) {
    assert.equal(loadPortOneConfig({ ...env, PORTONE_ORIGIN: origin })?.localKpnTestCheckout, true)
  }
  const invalid = [
    ...[undefined, 'test', 'production', 'Development', ''].map((NODE_ENV) => ({ NODE_ENV })),
    ...[undefined, 'disabled', 'live', ''].map((PORTONE_PAYMENT_MODE) => ({ PORTONE_PAYMENT_MODE })),
    ...[undefined, 'https://localhost:3000', 'https://example.test', 'http://example.test', 'http://localhost.evil.test:3000',
      'http://user@localhost:3000', 'http://user:pass@localhost:3000', 'http://localhost:3000/', 'http://localhost:3000/path',
      'http://localhost:3000?claim=enabled', 'http://localhost:3000#claim', 'http://LOCALHOST:3000', 'http://127.1:3000',
      'http://2130706433:3000', 'http://localhost:80', ' http://localhost:3000', 'file://localhost'].map((PORTONE_ORIGIN) => ({ PORTONE_ORIGIN })),
    { PORTONE_STORE_ID: 'store-other' }, { PORTONE_CHANNEL_KEY: 'channel-other' },
  ]
  for (const change of invalid) assert.throws(() => loadPortOneConfig({ ...env, ...change }), /^Error: PortOne configuration unavailable\.$/)
})

test('malformed local KPN flags fail closed even when payment mode would otherwise be disabled', () => {
  for (const flag of ['', 'true', '1', 'ENABLED', ' enabled', 'enabled ', 'disabled ', 'null', null, true]) {
    for (const mode of ['sandbox', 'disabled', undefined]) {
      assert.throws(() => loadPortOneConfig({ ...env, PORTONE_LOCAL_KPN_TEST: flag, PORTONE_PAYMENT_MODE: mode } as never), /^Error: PortOne configuration unavailable\.$/)
    }
  }
})

function fixture() {
  const config = loadPortOneConfig(env)!
  const calls: string[] = []
  const deps = { config, catalogue, localKpnTestCheckout: config.localKpnTestCheckout,
    publicationReady: () => false, verifyTestChannel: async () => true, eligibleOwner: async () => id as string | null,
    prepare: async () => { calls.push('prepare'); return { paymentId: providerId } },
    resume: async () => { calls.push('resume'); return { paymentId: providerId } },
    complete: async () => { calls.push('complete'); return { status: 'paid' } },
    verifyWebhook: async () => ({ type: 'Transaction.Paid', data: { paymentId: providerId, storeId: config.storeId } }) }
  return { config, calls, deps }
}
function request(action: 'prepare' | 'resume' | 'complete' | 'webhook', options: { headers?: Record<string, string>; body?: unknown; url?: string } = {}) {
  return new Request(options.url ?? `${env.PORTONE_ORIGIN}/api/payments/portone/${action}`, { method: 'POST',
    headers: { origin: env.PORTONE_ORIGIN, 'content-type': 'application/json', ...options.headers },
    body: JSON.stringify(options.body ?? (action === 'prepare' ? { quantity: 1, attemptId } : { paymentId: providerId, ...(action === 'resume' ? { attemptId } : {}) })) })
}

test('server-derived local KPN flag allows unpublished prepare/resume but never unverified channels or absent catalogue', async () => {
  for (const action of ['prepare', 'resume'] as const) {
    const f = fixture()
    assert.equal((await createPortOneHandlers(f.deps)[action](request(action))).status, 200)
    assert.deepEqual(f.calls, [action])
    for (const change of [{ verifyTestChannel: async () => false }, { catalogue: null }, { config: null },
      { localKpnTestCheckout: false }, { localKpnTestCheckout: undefined }]) {
      const blocked = fixture()
      assert.equal((await createPortOneHandlers({ ...blocked.deps, ...change })[action](request(action))).status, 503)
      assert.equal(blocked.calls.length, 0)
    }
  }
})

test('local checkout retains eligibility, canonical Host/Origin, CSRF, query/RSC and strict body boundaries', async () => {
  for (const action of ['prepare', 'resume'] as const) {
    const blockedRequests: NonNullable<Parameters<typeof request>[1]>[] = [{ headers: { origin: 'http://evil.test' } }, { headers: { host: 'evil.test' } },
      { headers: { 'sec-fetch-site': 'cross-site' } }, { headers: { rsc: '1' } },
      { url: `${env.PORTONE_ORIGIN}/api/payments/portone/${action}?localKpnTestCheckout=true` }];
    for (const change of blockedRequests) {
      const f = fixture()
      assert.equal((await createPortOneHandlers(f.deps)[action](request(action, change))).status, 403)
      assert.equal(f.calls.length, 0)
    }
    const unauthorized = fixture()
    unauthorized.deps.eligibleOwner = async () => null
    assert.equal((await createPortOneHandlers(unauthorized.deps)[action](request(action))).status, 403)
    assert.equal(unauthorized.calls.length, 0)
    for (const claim of [{ localKpnTestCheckout: true }, { PORTONE_LOCAL_KPN_TEST: 'enabled' }, { publicationReady: true }]) {
      const f = fixture()
      assert.equal((await createPortOneHandlers(f.deps)[action](request(action, {
        body: { ...(action === 'prepare' ? { quantity: 1 } : { paymentId: providerId }), attemptId, ...claim } }))).status, 400)
      assert.equal(f.calls.length, 0)
    }
    const spoof = fixture()
    assert.equal((await createPortOneHandlers({ ...spoof.deps, localKpnTestCheckout: undefined })[action](request(action, {
      headers: { 'portone-local-kpn-test': 'enabled', 'x-local-kpn-test': 'enabled' } }))).status, 503)
    assert.equal(spoof.calls.length, 0)
  }
})

test('local publication exception retains per-account rate limits and never gates recovery', async () => {
  const f = fixture(); const handlers = createPortOneHandlers(f.deps)
  for (let index = 0; index < 10; index++) assert.equal((await handlers[index % 2 ? 'resume' : 'prepare'](request(index % 2 ? 'resume' : 'prepare'))).status, 200)
  const limited = await handlers.prepare(request('prepare'))
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get('Retry-After'), '60')
  const recovery = fixture()
  const off = createPortOneHandlers({ ...recovery.deps, localKpnTestCheckout: false, catalogue: null })
  assert.equal((await off.complete(request('complete'))).status, 200)
  assert.equal((await off.webhook(request('webhook', { headers: {
    'webhook-id': 'synthetic-event', 'webhook-timestamp': '123', 'webhook-signature': 'synthetic-signature' } }))).status, 200)
  assert.deepEqual(recovery.calls, ['complete', 'complete'])
})

test('legacy runtime stays retired while canonical commerce retains verified active membership gates', () => {
  const source = readFileSync('src/lib/tickets/portone/runtime.ts', 'utf8')
  assert.equal(/status: 410/.test(source), true)
  assert.equal(/createPortOneHandlers/.test(source), false)
  const authority = readFileSync('src/lib/commerce/access.ts', 'utf8')
  assert.equal(/principal\?\.emailVerified/.test(authority), true)
  assert.equal(/runtime\.repository\.isActiveMember\(principal\.userId\)/.test(authority), true)
})
