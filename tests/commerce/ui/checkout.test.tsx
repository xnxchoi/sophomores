import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { CommerceOfferView } from '../../../src/components/commerce/offer'

test('missing approved facts show no price, stock, delivery claim or payment control', () => {
  const html = renderToStaticMarkup(<CommerceOfferView offer={null} />)
  assert.equal(html.includes('Purchasing is not open'), true)
  assert.equal(html.includes('₩'), false)
  assert.equal(html.includes('Pay now'), false)
  assert.equal(html.includes('shipping name'), false)
})

test('commerce uses official provider without cross-account browser cart persistence', () => {
  const source = readFileSync('src/components/commerce/checkout.tsx', 'utf8')
  assert.equal(source.includes('@payloadcms/plugin-ecommerce/client/react'), true)
  assert.equal(source.includes('syncLocalStorage={false}'), true)
  assert.equal(source.includes('presentation="ticket-checkout"'), true)
  assert.equal(source.includes('parseMemberStatus'), true)
})

test('payment recovery persists identifiers only and never opens the SDK from an effect', () => {
  const source = readFileSync('src/components/commerce/payment.tsx', 'utf8')
  assert.equal(source.includes('navigator.locks.request'), true)
  assert.equal(source.includes('confirmOrder("portone"'), true)
  assert.equal(source.includes('/api/payments/portone/resume'), true)
  assert.equal(source.includes('JSON.stringify(intent)'), true)
  assert.equal(/sessionStorage\.setItem\([^\n]*(shippingAddress|paymentRequest)/.test(source), false)
})
