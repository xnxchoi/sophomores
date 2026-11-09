import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classifyPaymentRisk, minimalPaymentRiskProof, validatePaidPayment } from '../../../src/lib/commerce/portone/proof'

const expected = { paymentID: '91b6495b479b430698f183b729807aea', customerID: 'customer-1',
  storeID: 'store-reviewed', channelKey: 'channel-reviewed', totalAmount: 45000, currency: 'KRW' as const }
const paid = () => ({ id: expected.paymentID, storeId: expected.storeID, status: 'PAID',
  channel: { key: expected.channelKey, type: 'TEST' }, customer: { id: expected.customerID },
  currency: 'KRW', amount: { total: 45000, paid: 45000, cancelled: 0 }, disputes: [] })

test('only authoritative fully paid, reviewed TEST channel evidence permits settlement', () => {
  assert.doesNotThrow(() => validatePaidPayment(paid(), expected))
  const mutations = [
    { status: 'READY' }, { status: 'CANCELLED' }, { status: 'FAILED' },
    { id: '91b6495b479b430698f183b729807aeb' }, { storeId: 'other' },
    { channel: { key: 'other', type: 'TEST' } }, { channel: { key: expected.channelKey, type: 'LIVE' } },
    { customer: { id: 'other' } }, { currency: 'USD' },
    { amount: { total: 45001, paid: 45001, cancelled: 0 } },
    { amount: { total: 45000, paid: 44000, cancelled: 0 } },
    { amount: { total: 45000, paid: 45000, cancelled: 1 } },
    { disputes: [{}] }, { disputes: undefined }, { disputes: null },
  ]
  for (const mutation of mutations) assert.throws(() => validatePaidPayment({ ...paid(), ...mutation }, expected))
})

test('payment identifiers and amount ranges are validated independently of caller expectations', () => {
  assert.throws(() => validatePaidPayment({ ...paid(), id: 'invalid' }, { ...expected, paymentID: 'invalid' }))
  assert.throws(() => validatePaidPayment({ ...paid(), amount: { total: 1.5, paid: 1.5, cancelled: 0 } }, { ...expected, totalAmount: 1.5 }))
  assert.throws(() => validatePaidPayment(null, expected))
})

test('risk classification never trusts a signed event alone and isolates complete cancellation', () => {
  assert.equal(classifyPaymentRisk(paid(), expected), 'clear')
  assert.equal(classifyPaymentRisk({ ...paid(), disputes: [{}] }, expected), 'hold')
  assert.equal(classifyPaymentRisk({ ...paid(), amount: { total: 45000, paid: 44000, cancelled: 1000 } }, expected), 'hold')
  assert.equal(classifyPaymentRisk({ ...paid(), status: 'PARTIAL_CANCELLED' }, expected), 'hold')
  assert.equal(classifyPaymentRisk({ ...paid(), status: 'CANCELLED', amount: { total: 45000, paid: 45000, cancelled: 45000 } }, expected), 'full-cancel')
  assert.equal(classifyPaymentRisk({ ...paid(), status: 'CANCELLED', amount: { total: 45000, paid: 45001, cancelled: 45000 } }, expected), 'hold')
  for (const patch of [{ storeId: 'other' }, { customer: { id: 'other' } }, { channel: { type: 'LIVE', key: expected.channelKey } },
    { currency: 'USD' }, { id: 'invalid' }, { amount: { total: 1, paid: 1, cancelled: 0 } }, { status: 'READY' }]) {
    assert.throws(() => classifyPaymentRisk({ ...paid(), ...patch }, expected))
  }
})

test('retained risk proof strips provider card data and dispute contents', () => {
  const proof = minimalPaymentRiskProof({ ...paid(), method: { card: { number: 'private-card' } },
    disputes: [{ providerSecret: 'private-dispute' }], customData: 'private-custom' })
  assert.equal(JSON.stringify(proof).includes('private'), false)
  assert.equal(classifyPaymentRisk(proof, expected), 'hold')
  assert.equal(classifyPaymentRisk(minimalPaymentRiskProof(paid()), expected), 'clear')
})
