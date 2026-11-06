import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHmac } from 'node:crypto'
import { Webhook } from '@portone/server-sdk'

test('installed official SDK verifies exact synthetic raw body and rejects body tampering and stale timestamp', async () => {
  const key = Buffer.from('synthetic-webhook-secret-32-bytes!')
  const secret = `whsec_${key.toString('base64')}`
  const raw = JSON.stringify({ type: 'Transaction.Paid', timestamp: new Date().toISOString(), data: {
    storeId: 'store-test', paymentId: '019a313f-c922-7000-8000-000000000001', transactionId: 'txn-test',
  } })
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const eventId = 'synthetic-test-event'
  const signature = createHmac('sha256', key).update(`${eventId}.${timestamp}.${raw}`).digest('base64')
  const headers = { 'webhook-id': eventId, 'webhook-timestamp': timestamp, 'webhook-signature': `v1,${signature}` }
  assert.deepEqual(await Webhook.verify(secret, raw, headers), JSON.parse(raw))
  await assert.rejects(() => Webhook.verify(secret, raw.replace('store-test', 'store-tampered'), headers))
  await assert.rejects(() => Webhook.verify(secret, raw, { ...headers, 'webhook-timestamp': '1' }))
})
