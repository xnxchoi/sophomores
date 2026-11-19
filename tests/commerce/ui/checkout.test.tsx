import { EnglishMessages } from "../../fixtures/english-messages";
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { CommerceOfferView } from '../../../src/components/commerce/offer'

test('missing approved facts show no price, stock, delivery claim or payment control', () => {
  const html = renderToStaticMarkup(<EnglishMessages><CommerceOfferView offer={null} /></EnglishMessages>)
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

test('T003 keeps sign-in and missing phone proof on the shop journey before mounting purchase', () => {
  const checkout = readFileSync('src/components/commerce/checkout.tsx', 'utf8')
  const shop = readFileSync('src/app/(site)/shop/page.tsx', 'utf8')
  const memberClient = readFileSync('src/lib/member-auth/client.ts', 'utf8')
  const memberPaths = readFileSync('src/lib/member-auth/paths.ts', 'utf8')

  assert.equal(shop.includes('<CommerceOfferView offer={offer}>'), true, 'the configured offer remains the caller surface')
  assert.equal(shop.includes('offer && <CommerceAccountGate'), true, 'missing offer facts do not prompt account setup')
  assert.equal(checkout.includes('flow="signup" presentation="ticket-checkout"'), true, 'account entry stays inline and uses the purchase proof flow')
  assert.equal(checkout.includes('snapshot.status?.authenticated === true && snapshot.status.member'), true, 'only fresh authenticated member state can open purchase')
  assert.equal(checkout.includes('{started && <div hidden={!eligible} inert={!eligible}><CommerceSession'), true, 'checkout is withheld until proof is ready and retained after first readiness')
  assert.equal(memberClient.includes('context === "ticket-checkout" ? MEMBER_TICKET_CHECKOUT_PATH'), true, 'social return is fixed to the checkout route')
  assert.equal(memberPaths.includes('MEMBER_TICKET_CHECKOUT_PATH = "/tickets"'), true, 'the fixed return resolves through the canonical shop alias')
})

test('payment recovery persists identifiers only and never opens the SDK from an effect', () => {
  const source = readFileSync('src/components/commerce/payment.tsx', 'utf8')
  assert.equal(source.includes('navigator.locks.request'), true)
  assert.equal(source.includes('confirmOrder("portone"'), true)
  assert.equal(source.includes('/api/payments/portone/resume'), true)
  assert.equal(source.includes('JSON.stringify(intent)'), true)
  assert.equal(/sessionStorage\.setItem\([^\n]*(shippingAddress|paymentRequest)/.test(source), false)
})
