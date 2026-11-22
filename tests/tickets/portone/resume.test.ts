import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getResumePayment } from '@/lib/tickets/portone/runtime'

// The legacy ticket resume handlers were retired (owner, 23 Nov); the shared provider read stays.
const id = '019a313f-c922-7000-8000-000000000001'
const providerId = id.replaceAll('-', '')
const config = { mode: "test" as const, localKpnTestCheckout: false, origin: 'http://localhost:3000', storeId: 'store-test', channelKey: 'channel-test', apiSecret: 'synthetic', webhookSecret: 'synthetic' }
const ownerId = '019a313f-c922-7000-8000-000000000002'
const failed = { id: providerId, status: 'FAILED', storeId: config.storeId, channel: { key: config.channelKey, type: 'TEST' }, customer: { id: ownerId }, currency: 'KRW', amount: { total: 200, paid: 0, cancelled: 0 } }

test('native transport authorizes absence only on exact scoped typed 404', async () => {
  const original = globalThis.fetch
  try {
    for (const [status, body, accepted] of [[404, { type: 'PAYMENT_NOT_FOUND' }, true], [200, { type: 'PAYMENT_NOT_FOUND' }, false], [404, { type: 'OTHER' }, false], [404, {}, false], [503, { type: 'PAYMENT_NOT_FOUND' }, false], [200, failed, true]] as const) {
      globalThis.fetch = async (url, init) => {
        assert.equal(new URL(String(url)).searchParams.get('storeId'), config.storeId)
        assert.equal(init?.redirect, 'error')
        assert.ok(init?.signal)
        return Response.json(body, { status })
      }
      if (accepted) await getResumePayment(config, { paymentId: providerId, storeId: config.storeId })
      else await assert.rejects(() => getResumePayment(config, { paymentId: providerId, storeId: config.storeId }))
    }
    globalThis.fetch = async () => new Response('not-json', { status: 404 })
    await assert.rejects(() => getResumePayment(config, { paymentId: providerId, storeId: config.storeId }))
    globalThis.fetch = async () => { throw new DOMException('Timed out', 'TimeoutError') }
    await assert.rejects(() => getResumePayment(config, { paymentId: providerId, storeId: config.storeId }))
  } finally { globalThis.fetch = original }
})
