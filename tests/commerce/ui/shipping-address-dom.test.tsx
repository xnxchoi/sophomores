import { EnglishMessages } from "../../fixtures/english-messages";
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { useState } from 'react'
import { JSDOM } from 'jsdom'
import type { ShippingAddress } from '../../../src/lib/commerce/contracts'

let dom: JSDOM
let ui: typeof import('@testing-library/react/pure')
let Address: typeof import('../../../src/components/commerce/shipping-address').ShippingAddressForm
const previous = new Map<string, PropertyDescriptor | undefined>()
let complete: ((result: { zonecode: string; roadAddress: string }) => void) | undefined
let last: ShippingAddress
before(async () => {
  dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/shop', pretendToBeVisual: true })
  for (const key of ['window', 'self', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'MutationObserver', 'Event']) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { value: key === 'window' || key === 'self' ? dom.window : dom.window[key as keyof typeof dom.window], configurable: true, writable: true })
  }
  previous.set('IS_REACT_ACT_ENVIRONMENT', Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'))
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, configurable: true, writable: true })
  Object.defineProperty(dom.window, 'daum', { configurable: true, value: { Postcode: class {
    constructor(options: { oncomplete: typeof complete }) { complete = options.oncomplete }
    embed(element: HTMLElement) { element.textContent = 'Official address search' }
  } } })
  ui = await import('@testing-library/react/pure')
  ui.configure({ getElementError: (message) => new Error(message ?? 'Element not found') })
  Address = (await import('../../../src/components/commerce/shipping-address')).ShippingAddressForm
})
after(() => {
  ui.cleanup(); dom.window.close()
  for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key) }
})

function Harness() {
  const [value, setValue] = useState<ShippingAddress>({ country: 'KR', recipientName: '', phone: '', postalCode: '', addressLine1: '' })
  return <Address value={value} onChange={(next) => { last = next; setValue(next) }} />
}

test('Kakao is explicit, manual fields stay usable and a delayed completion preserves current recipient input', async () => {
  ui.render(<EnglishMessages><Harness /></EnglishMessages>)
  assert.equal(dom.window.document.querySelector('script[src*="postcode"]') === null, true)
  const recipient = ui.screen.getByRole('textbox', { name: 'Recipient' }) as HTMLInputElement
  ui.fireEvent.change(recipient, { target: { value: 'Before search' } })
  ui.fireEvent.click(ui.screen.getByRole('button', { name: 'Search address' }))
  await ui.waitFor(() => assert.equal(dom.window.document.querySelector('script[src*="postcode"]') !== null, true))
  ui.fireEvent.load(dom.window.document.querySelector('script[src*="postcode"]')!)
  await ui.waitFor(() => assert.equal(typeof complete, 'function'))
  ui.fireEvent.change(recipient, { target: { value: 'Updated while searching' } })
  await ui.act(async () => { complete!({ zonecode: '12345', roadAddress: 'Selected road' }) })
  assert.equal(recipient.value, 'Updated while searching')
  assert.equal(last.recipientName, 'Updated while searching')
  assert.equal((ui.screen.getByRole('textbox', { name: 'Address' }) as HTMLInputElement).value, 'Selected road')
  assert.equal((ui.screen.getByRole('textbox', { name: 'Postcode' }) as HTMLInputElement).value, '12345')
  assert.equal(dom.window.document.activeElement === ui.screen.getByRole('textbox', { name: 'Detailed address' }), true)
  await ui.act(async () => { complete!({ zonecode: '99999', roadAddress: 'Late provider callback' }) })
  assert.equal(last.addressLine1, 'Selected road', 'a completed/closed search ignores late provider callbacks')
})
