import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadPortOneConfig, reviewedTestChannel } from '@/lib/tickets/portone/config'
import { readFileSync } from 'node:fs'

// The legacy ticket PortOne server was retired (owner, 23 Nov). The config and transport it shared stay.
const config = { mode: "test" as const, localKpnTestCheckout: false, origin: 'http://localhost:3000', storeId: 'store-test', channelKey: 'channel-test', apiSecret: 'test-api-secret', webhookSecret: `whsec_${Buffer.from('synthetic-webhook-secret-32-bytes!').toString('base64')}` }

test('configuration is disabled by default and rejects partial, live, malformed, or insecure settings', () => {
  assert.equal(loadPortOneConfig({}), null)
  assert.equal(Object.isFrozen(reviewedTestChannel), true, 'console-reviewed public TEST identity is immutable, not activation')
  assert.equal(loadPortOneConfig({ PORTONE_PAYMENT_MODE: 'disabled' }), null)
  for (const env of [{ PORTONE_PAYMENT_MODE: 'live' }, { PORTONE_PAYMENT_MODE: 'sandbox' }]) {
    assert.throws(() => loadPortOneConfig(env), /PortOne configuration unavailable/)
  }
  const env = { PORTONE_PAYMENT_MODE: 'sandbox', PORTONE_ORIGIN: config.origin, PORTONE_STORE_ID: config.storeId, PORTONE_CHANNEL_KEY: config.channelKey, PORTONE_API_SECRET: config.apiSecret, PORTONE_WEBHOOK_SECRET: config.webhookSecret }
  assert.deepEqual(loadPortOneConfig(env), config)
  for (const extra of [{ PORTONE_ORIGIN: 'http://public.example' }, { PORTONE_ORIGIN: 'https://example.com/path' }, { PORTONE_API_SECRET: ' ' }, { PORTONE_WEBHOOK_SECRET: config.apiSecret }, { PORTONE_WEBHOOK_SECRET: 'plain-not-base64' }]) {
    assert.throws(() => loadPortOneConfig({ ...env, ...extra }), /PortOne configuration unavailable/)
  }
})

test('source-only transport contract fixes provider host and encodes ids with native abort deadline', () => {
  // No network is made here. Actual provider/transport acceptance remains gated.
  const source = readFileSync(new URL('../../../src/lib/tickets/portone/runtime.ts', import.meta.url), 'utf8')
  assert.match(source, /https:\/\/api\.portone\.io\/payments\//)
  assert.match(source, /encodeURIComponent\(input\.paymentId\)/)
  assert.match(source, /signal: AbortSignal\.timeout\(5000\)/)
  assert.match(source, /redirect: 'error'/)
  assert.match(source, /Authorization: `PortOne \$\{config\.apiSecret\}`/)
  assert.equal(/status: 410/.test(source), true)
  assert.equal(/createPortOneHandlers/.test(source), false)
  const adapter = readFileSync(new URL('../../../src/lib/commerce/portone/adapter.ts', import.meta.url), 'utf8')
  // Sunday launch: the env channel of the validated test|live mode replaces the pinned TEST channel.
  assert.equal(/config\.mode !== 'test' && config\.mode !== 'live'/.test(adapter), true)
  assert.equal(/reviewedTestChannel/.test(adapter), false)
  assert.doesNotMatch(source, /console\.(log|warn|error).*apiSecret/)
})
