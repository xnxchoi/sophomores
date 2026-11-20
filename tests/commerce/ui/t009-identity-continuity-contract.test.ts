import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

const checkout = readFileSync('src/components/commerce/checkout.tsx', 'utf8')
const payment = readFileSync('src/components/commerce/payment.tsx', 'utf8')

test('T009 own-account refresh fails closed and preserves identity-specific states', () => {
  assert.equal(checkout.includes('if (response.status === 401) { setState({ kind: "authentication-required" })'), true)
  assert.equal(checkout.includes('response.status === 403 ? "forbidden" : response.status === 429 ? "rate-limited" : "http-error"'), true)
  assert.equal(checkout.includes('body = await response.text()'), true)
  assert.equal(checkout.includes('"malformed-receipt" | "transport-error" | "transport-aborted"'), true)
  assert.equal(checkout.includes('if (!result.user) { setState({ kind: "authentication-required" })'), true)
  assert.equal(checkout.includes('window.addEventListener("focus", onReturn); document.addEventListener("visibilitychange", onReturn)'), true)
  assert.equal(checkout.includes('const blocked = !verified || state.kind !== "confirmed" || state.customerID !== String(customerID ?? "")'), true)
  assert.equal(checkout.includes('<div hidden={blocked} inert={blocked} key={identity.generation}'), true)
})

test('T009 retained purchase attempts are member-keyed and require matching provider identity', () => {
  assert.equal(payment.includes('const storageKey = user ? "sphmrs:commerce-payment:" + user.id : null'), true)
  assert.equal(payment.includes('request.customer.customerId !== String(user.id)'), true)
})
