import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadPortOneConfig } from '../../../src/lib/tickets/portone/config'
import { adapterConfig } from '../../../src/lib/commerce/portone/adapter'
import { classifyPaymentRisk, validatePaidPayment } from '../../../src/lib/commerce/portone/proof'
import { payloadEnvironmentSchema } from '../../../src/payload/configuration'

// Synthetic, non-provider values only.
const keys = { PORTONE_API_SECRET: 'synthetic-api-secret',
  PORTONE_WEBHOOK_SECRET: `whsec_${Buffer.from('synthetic-webhook-secret-32-bytes!').toString('base64')}` }
const testEnv = { PORTONE_PAYMENT_MODE: 'sandbox', PORTONE_ORIGIN: 'http://localhost:3000',
  PORTONE_STORE_ID: 'store-test-fixture', PORTONE_CHANNEL_KEY: 'channel-test-fixture', ...keys }
const liveEnv = { PORTONE_PAYMENT_MODE: 'live', PORTONE_ORIGIN: 'https://shop.example.test',
  PORTONE_STORE_ID: 'store-live-fixture', PORTONE_CHANNEL_KEY: 'channel-live-fixture', ...keys }
const base = { DATABASE_URI: 'postgres://fixture@localhost:4141/sopho', PAYLOAD_SECRET: 'a'.repeat(64) }

test('test and live modes each load their own channel from env', () => {
  for (const PORTONE_PAYMENT_MODE of ['sandbox', 'test']) {
    const config = loadPortOneConfig({ ...testEnv, PORTONE_PAYMENT_MODE })!
    assert.equal(config.mode, 'test')
    assert.equal(config.storeId, 'store-test-fixture')
    assert.equal(config.channelKey, 'channel-test-fixture')
  }
  const live = loadPortOneConfig(liveEnv)!
  assert.equal(live.mode, 'live')
  assert.equal(live.storeId, 'store-live-fixture')
  assert.equal(live.channelKey, 'channel-live-fixture')
  // No pinned reviewed channel: the configured channel itself is authoritative.
  assert.equal(adapterConfig({ config: live }), live)
  assert.equal(adapterConfig({ config: loadPortOneConfig(testEnv) }).channelKey, 'channel-test-fixture')
})

test('disabled stays the default and unknown modes are rejected', () => {
  assert.equal(loadPortOneConfig({}), null)
  assert.equal(loadPortOneConfig({ PORTONE_PAYMENT_MODE: 'disabled' }), null)
  assert.throws(() => loadPortOneConfig({ ...testEnv, PORTONE_PAYMENT_MODE: 'production' }), /PortOne configuration unavailable/)
  assert.throws(() => adapterConfig({ config: null }))
})

test('live mode with missing keys fails the boot environment schema', () => {
  assert.equal(payloadEnvironmentSchema.safeParse(base).success, true)
  assert.equal(payloadEnvironmentSchema.safeParse({ ...base, PORTONE_PAYMENT_MODE: 'disabled' }).success, true)
  assert.equal(payloadEnvironmentSchema.safeParse({ ...base, ...liveEnv }).success, true)
  for (const missing of ['PORTONE_STORE_ID', 'PORTONE_CHANNEL_KEY', 'PORTONE_API_SECRET', 'PORTONE_WEBHOOK_SECRET', 'PORTONE_ORIGIN']) {
    const result = payloadEnvironmentSchema.safeParse({ ...base, ...liveEnv, [missing]: undefined })
    assert.equal(result.success, false, missing)
    assert.equal(result.error?.issues[0]?.path.join('.'), 'PORTONE_PAYMENT_MODE')
  }
  assert.equal(payloadEnvironmentSchema.safeParse({ ...base, PORTONE_PAYMENT_MODE: 'production' }).success, false)
})

test('payment proof must match the configured mode', () => {
  const expected = { paymentID: '91b6495b479b430698f183b729807aea', customerID: 'customer-1', storeID: 'store-1',
    channelKey: 'channel-1', totalAmount: 45000, currency: 'KRW' as const }
  const paid = (type: string) => ({ id: expected.paymentID, storeId: 'store-1', status: 'PAID', channel: { key: 'channel-1', type },
    customer: { id: 'customer-1' }, currency: 'KRW', amount: { total: 45000, paid: 45000, cancelled: 0 }, disputes: [] })
  assert.doesNotThrow(() => validatePaidPayment(paid('LIVE'), { ...expected, mode: 'live' }))
  assert.doesNotThrow(() => validatePaidPayment(paid('TEST'), { ...expected, mode: 'test' }))
  assert.throws(() => validatePaidPayment(paid('TEST'), { ...expected, mode: 'live' }))
  assert.throws(() => validatePaidPayment(paid('LIVE'), { ...expected, mode: 'test' }))
  assert.equal(classifyPaymentRisk(paid('LIVE'), { ...expected, mode: 'live' }), 'clear')
  assert.throws(() => classifyPaymentRisk(paid('TEST'), { ...expected, mode: 'live' }))
  assert.throws(() => classifyPaymentRisk(paid('LIVE'), { ...expected, mode: 'test' }))
})
