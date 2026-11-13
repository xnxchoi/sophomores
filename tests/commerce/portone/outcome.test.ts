import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classifyReconciliationPayment } from '../../../src/lib/commerce/portone/proof'
import { projectPaymentObservation } from '../../../src/lib/commerce/portone/outcome'

const expected = { paymentID: '91b6495b479b430698f183b729807aea', customerID: 'buyer', storeID: 'store', channelKey: 'channel', totalAmount: 100, currency: 'KRW' as const }
const payment = (status: string) => ({ id: expected.paymentID, storeId: expected.storeID, channel: { key: expected.channelKey, type: 'TEST' },
  customer: { id: expected.customerID }, status, currency: 'KRW', amount: { total: 100, paid: status === 'PAID' ? 100 : 0, cancelled: 0 }, disputes: [] })

test('exact PAID is provider evidence, not a local order or permission to retry', () => {
  assert.deepEqual(classifyReconciliationPayment(payment('PAID'), expected, 'unresolved'), { kind: 'provider-paid' })
  assert.deepEqual(projectPaymentObservation({ kind: 'provider-paid' }), { outcome: 'provider-paid', automatic: 'stopped' })
})

test('FAILED is verified only against exact identity and absent contradictory local evidence', () => {
  assert.deepEqual(classifyReconciliationPayment(payment('FAILED'), expected, 'unresolved'), { kind: 'verified-failure' })
  for (const state of ['succeeded', 'terminal', 'held'] as const) assert.deepEqual(classifyReconciliationPayment(payment('FAILED'), expected, state), { kind: 'review-required' })
  for (const change of [{ id: '00000000000000000000000000000000' }, { storeId: 'other' }, { channel: { key: 'other', type: 'TEST' } },
    { customer: { id: 'other' } }, { currency: 'USD' }, { amount: { total: 200, paid: 0, cancelled: 0 } }, { amount: { total: 100, paid: 1, cancelled: 0 } }]) {
    assert.deepEqual(classifyReconciliationPayment({ ...payment('FAILED'), ...change }, expected, 'unresolved'), { kind: 'integrity-stop' })
  }
})

test('READY, typed not-found and unsupported wire statuses remain distinct with no aliases', () => {
  assert.deepEqual(classifyReconciliationPayment({ type: 'PAYMENT_NOT_FOUND' }, expected, 'unresolved'), { kind: 'provider-not-found' })
  assert.deepEqual(classifyReconciliationPayment(payment('READY'), expected, 'unresolved'), { kind: 'provider-ready' })
  for (const status of ['PENDING', 'PAY_PENDING', 'VIRTUAL_ACCOUNT_ISSUED', 'paid', 'FUTURE']) {
    assert.deepEqual(classifyReconciliationPayment(payment(status), expected, 'unresolved'), { kind: 'provider-unsupported', status })
  }
  for (const raw of [{ status: 404 }, { type: 'PAYMENT_NOT_FOUND', private: 'data' }, { status: 'FAILED' }, null]) {
    assert.deepEqual(classifyReconciliationPayment(raw, expected, 'unresolved'), { kind: 'integrity-stop' })
  }
})

test('holds, cancellation, dispute and contradictory PAID stop; absence does not clear local evidence', () => {
  for (const status of ['CANCELLED', 'PARTIAL_CANCELLED']) assert.deepEqual(classifyReconciliationPayment(payment(status), expected, 'unresolved'), { kind: 'review-required' })
  assert.deepEqual(classifyReconciliationPayment({ ...payment('PAID'), disputes: [{}] }, expected, 'unresolved'), { kind: 'review-required' })
  for (const state of ['terminal', 'held'] as const) assert.deepEqual(classifyReconciliationPayment(payment('PAID'), expected, state), { kind: 'review-required' })
  for (const state of ['succeeded', 'terminal', 'held'] as const) assert.deepEqual(classifyReconciliationPayment({ type: 'PAYMENT_NOT_FOUND' }, expected, state), { kind: 'review-required' })
})

test('explicit known stops project without financial inference, cooldown or automatic continuation', () => {
  for (const kind of ['integrity-stop', 'authentication-required', 'authority-stop', 'configuration-stop', 'rate-stop', 'budget-stop', 'completion-unknown',
    'local-unresolved', 'provider-ready', 'provider-not-found', 'review-required', 'verified-failure', 'unavailable'] as const) {
    assert.deepEqual(projectPaymentObservation({ kind }), { outcome: kind, automatic: 'stopped' })
  }
  assert.deepEqual(projectPaymentObservation({ kind: 'provider-unsupported', status: 'PAY_PENDING' }), { outcome: 'provider-unsupported', status: 'PAY_PENDING', automatic: 'stopped' })
})

test('transport observations feed the same stop projection without elevating receipt into confirmed', () => {
  assert.deepEqual(projectPaymentObservation({ kind: 'transport-unknown', phase: 'body' }), { outcome: 'transport-unknown', phase: 'body', automatic: 'stopped' })
  assert.deepEqual(projectPaymentObservation({ kind: 'receipt-integrity', reason: 'json' }), { outcome: 'receipt-integrity', reason: 'json', automatic: 'stopped' })
  assert.deepEqual(projectPaymentObservation({ kind: 'stale' }), { outcome: 'stale', automatic: 'stopped' })
  assert.deepEqual(projectPaymentObservation({ kind: 'confirmation-receipt', transactionID: 'private', orderID: 'private' }), { outcome: 'local-read-required', automatic: 'stopped' })
})
