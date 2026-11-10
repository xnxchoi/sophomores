import messages from "../../../messages/en.json"
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

test('buyer admission management uses canonical owner operations and never requires guest registration for admission', () => {
  const source = readFileSync('src/components/commerce/order-admissions.tsx', 'utf8')
  assert.equal(source.includes('/api/commerce/orders/'), true)
  assert.equal(source.includes('/api/commerce/guest-operations'), true)
  assert.equal(source.includes('assign-name'), true)
  assert.equal(source.includes('issue-claim'), true)
  assert.equal(messages.Customer.components_commerce_order_admissions.eachCoinIncludesOneAdmissionAddTheGuestS.includes('Registration is optional'), true)
  assert.equal(source.includes('sessionStorage'), false)
  assert.equal(source.includes('localStorage'), false)
  assert.equal(source.includes('token='), true)
})

test('optional claim token comes from fragment, is removed from URL and remains ephemeral through inline registration', () => {
  const source = readFileSync('src/components/commerce/invitation-claim.tsx', 'utf8')
  assert.equal(source.includes('window.location.hash'), true)
  assert.equal(source.includes('window.history.replaceState'), true)
  assert.equal(source.includes('CommerceAccountGate'), true)
  assert.equal(source.includes('inlineEmailOnly'), true)
  assert.equal(source.includes('action: "claim"'), true)
  assert.equal(source.includes('sessionStorage'), false)
  assert.equal(source.includes('localStorage'), false)
  assert.equal(source.includes('console.'), false)
})
