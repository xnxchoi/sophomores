import assert from 'node:assert/strict'
import { test } from 'node:test'
import { orderIdFromPaymentId, paymentIdFromOrderId, providerPaymentId } from '@/lib/tickets/portone/payment-id'

test('KPN uses strict hex payment IDs while preserving internal UUID identity', () => {
  const orderId = '019a313f-c922-7000-8000-000000000001'
  const paymentId = '019a313fc92270008000000000000001'
  assert.equal(paymentIdFromOrderId(orderId), paymentId)
  assert.equal(orderIdFromPaymentId(paymentId), orderId)
  for (const invalid of [orderId, paymentId.toUpperCase(), 'a'.repeat(32), paymentId + '0', '../' + paymentId]) {
    assert.equal(providerPaymentId.safeParse(invalid).success, false)
    assert.throws(() => orderIdFromPaymentId(invalid))
  }
})


test('v4 order UUIDs round-trip through canonical lowercase hex references', () => {
  const orderId = '91b6495b-479b-4306-98f1-83b729807aea'
  const paymentId = '91b6495b479b430698f183b729807aea'
  assert.equal(paymentIdFromOrderId(orderId), paymentId)
  assert.equal(orderIdFromPaymentId(paymentId), orderId)
  // Order UUID input accepts canonical UUID casing; external IDs have one spelling.
  assert.equal(paymentIdFromOrderId(orderId.toUpperCase()), paymentId)
  assert.equal(providerPaymentId.safeParse(paymentId.toUpperCase()).success, false)
  assert.throws(() => orderIdFromPaymentId(paymentId.toUpperCase()))
})

test('hex syntax alone does not authorize an invalid UUID version or variant', () => {
  for (const invalid of [
    '91b6495b479bf30698f183b729807aea', // Reserved version f.
    '91b6495b479b430618f183b729807aea', // Non-RFC variant 1.
    '91b6495b479b4306c8f183b729807aea', // Reserved variant c.
  ]) {
    assert.equal(providerPaymentId.safeParse(invalid).success, false)
    assert.throws(() => orderIdFromPaymentId(invalid))
  }
  assert.throws(() => paymentIdFromOrderId('91b6495b-479b-f306-98f1-83b729807aea'))
  assert.throws(() => paymentIdFromOrderId('91b6495b-479b-4306-18f1-83b729807aea'))
})
