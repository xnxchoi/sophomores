import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ShippingAddressForm } from '../../../src/components/commerce/shipping-address'
import type { ShippingAddress } from '../../../src/lib/commerce/contracts'

const address: ShippingAddress = {
  country: 'KR', recipientName: '', phone: '', postalCode: '', addressLine1: '',
}

test('shipping remains manually enterable without loading a third-party address script', () => {
  const html = renderToStaticMarkup(<ShippingAddressForm value={address} onChange={() => {}} />)
  for (const label of ['Recipient', 'Delivery phone', 'Postcode', 'Address', 'Detailed address']) {
    assert.equal(html.includes(label), true)
  }
  assert.equal(html.includes('Search address'), true)
  assert.equal(html.includes('country'), true)
  assert.equal(html.includes('<script'), false, 'provider loads only after an explicit search action')
  assert.equal(html.includes('addressLine2'), true, 'a detailed address has its own field')
})

test('an optional detailed address is not silently synthesized or made mandatory', () => {
  const html = renderToStaticMarkup(<ShippingAddressForm value={{ ...address, recipientName: 'Guest' }} onChange={() => {}} />)
  assert.equal(/name="addressLine2"[^>]*required/.test(html), false)
  assert.equal(html.includes('value="Guest"'), true)
  assert.equal(html.includes('value="KR"'), true)
})
