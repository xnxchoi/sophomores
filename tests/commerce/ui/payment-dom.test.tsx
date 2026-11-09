import { EnglishMessages } from "../../fixtures/english-messages";
import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { EcommerceProvider } from '@payloadcms/plugin-ecommerce/client/react'
import type { requestPayment } from '@portone/browser-sdk/v2'
import type { ShippingAddress } from '../../../src/lib/commerce/contracts'
import type { ReactNode } from 'react'

let dom: JSDOM
let ui: typeof import('@testing-library/react/pure')
let Payment: typeof import('../../../src/components/commerce/payment').CommercePayment
let IdentityBoundary: typeof import('../../../src/components/commerce/checkout').CommerceIdentityBoundary
const previous = new Map<string, PropertyDescriptor | undefined>()
const transactionID = '123e4567-e89b-42d3-a456-426614174000'
const paymentID = transactionID.replaceAll('-', '')
const orderID = '123e4567-e89b-42d3-a456-426614174001'
const intent = { version: 1, attemptID: '123e4567-e89b-42d3-a456-426614174002', cartID: 'cart-1', transactionID, paymentID }
const storageKey = 'sphmrs:commerce-payment:customer-1'
const address: ShippingAddress = { country: 'KR', recipientName: 'Recipient', phone: '01012345678', postalCode: '12345', addressLine1: 'Address' }
const sdkRequest = { storeId: 'store-1', channelKey: 'channel-1', paymentId: paymentID, orderName: 'Approved product', totalAmount: 10000,
  currency: 'KRW', redirectUrl: 'http://localhost/shop/payment', customer: { customerId: 'customer-1', email: 'member@example.test' } }
let calls: { path: string; body: Record<string, unknown> }[] = []
let cartAvailable = true
let confirmationStatus = 200
let resumeOutcome = 'status-only'
let preparationOutcome = 'prepared'
let accountStatus = 200
let accountID = 'customer-1'
let retirementStatus = 200
let retiredTransactionID = transactionID
let discovered: { transactionID: string; paymentID: string; cartID: string; productID: string; quantity: number; totalAmount: number; currency: string; status: string; reviewHold: boolean; resolutionConflict?: boolean }[] = []

function globalValue(key: string, value: unknown) {
  if (!previous.has(key)) previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
}
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/shop', pretendToBeVisual: true })
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'MutationObserver', 'Event']) {
    globalValue(key, key === 'window' ? dom.window : dom.window[key as keyof typeof dom.window])
  }
  globalValue('self', dom.window)
  Object.defineProperty(dom.window.navigator, 'locks', { configurable: true, value: {
    request: async (_name: string, _options: unknown, callback: (lock: object) => Promise<void>) => callback({})
  } })
  globalValue('IS_REACT_ACT_ENVIRONMENT', true)
  globalValue('fetch', async (input: string | URL | Request, options?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const body = options?.body ? JSON.parse(String(options.body)) as Record<string, unknown> : {}
    calls.push({ path: url.pathname, body })
    if (url.pathname === '/api/users/me') return accountStatus === 200 ? Response.json({ user: { id: accountID, collection: 'users', cart: { docs: cartAvailable ? ['cart-1'] : [] } } }) : Response.json({ user: null }, { status: accountStatus })
    if (url.pathname === '/api/addresses') return Response.json({ docs: [] })
    if (url.pathname.endsWith('/pending')) return Response.json({ attempts: discovered })
    if (url.pathname === '/api/carts/cart-1') return Response.json({ id: 'cart-1', currency: 'KRW', items: [{ id: 'item-1', product: 'product-1', quantity: 1 }] })
    if (url.pathname.endsWith('/initiate')) return Response.json({ transactionID, paymentID, outcome: preparationOutcome, ...(preparationOutcome === 'prepared' ? { paymentRequest: sdkRequest } : {}) })
    if (url.pathname.endsWith('/confirm-order')) return confirmationStatus === 200 ? Response.json({ orderID, transactionID }) : Response.json({ message: 'Unconfirmed' }, { status: confirmationStatus })
    if (url.pathname.endsWith('/resume')) return Response.json({ transactionID, paymentID, outcome: resumeOutcome, ...(resumeOutcome === 'resumable' ? { paymentRequest: sdkRequest } : {}) })
    if (url.pathname.endsWith('/retire')) return Response.json({ outcome: 'retired', transactionID: retiredTransactionID, paymentID }, { status: retirementStatus })
    throw new Error('Unexpected commerce test request: ' + url.pathname)
  })
  ui = await import('@testing-library/react/pure')
  ui.configure({ getElementError: (message) => new Error(message ?? 'Element not found') })
  Payment = (await import('../../../src/components/commerce/payment')).CommercePayment
  IdentityBoundary = (await import('../../../src/components/commerce/checkout')).CommerceIdentityBoundary
})
afterEach(() => {
  retirementStatus = 200; retiredTransactionID = transactionID
  ui.cleanup(); dom.window.sessionStorage.clear(); calls = []; cartAvailable = true; confirmationStatus = 200; resumeOutcome = 'status-only'; preparationOutcome = 'prepared'; discovered = []; accountStatus = 200; accountID = 'customer-1'
})

test('a verified failed attempt is retired only by explicit click, unlocks checkout and never opens payment', async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  resumeOutcome = 'retirable'
  let opens = 0
  render(async () => { opens++; return undefined })
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: 'Resume same payment' }))
  const cancel = await ui.screen.findByRole('button', { name: 'Cancel this attempt' })
  assert.equal(calls.some((call) => call.path.endsWith('/retire')), false)
  ui.fireEvent.click(cancel)
  const pay = await ui.screen.findByRole('button', { name: 'Pay by card' })
  await ui.waitFor(() => assert.equal((pay as HTMLButtonElement).disabled, false))
  assert.equal(dom.window.sessionStorage.getItem(storageKey), null)
  assert.deepEqual(calls.find((call) => call.path.endsWith('/retire'))?.body, { transactionID, paymentID })
  assert.equal(opens, 0)
  assert.equal(calls.some((call) => call.path.endsWith('/initiate')), false)
})

for (const failure of ['unavailable', 'mismatch']) test(`retirement ${failure} preserves the retained attempt`, async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  resumeOutcome = 'retirable'
  if (failure === 'unavailable') retirementStatus = 409
  else retiredTransactionID = orderID
  render(async () => undefined, true)
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: 'Resume same payment' }))
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: 'Cancel this attempt' }))
  await ui.screen.findByText('Payment could not be confirmed. Your attempt is retained; check it before trying again.')
  assert.deepEqual(JSON.parse(dom.window.sessionStorage.getItem(storageKey)!), intent)
})
after(() => {
  dom.window.close()
  for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key) }
})

function Provider({ children }: { children: ReactNode }) {
  return <EcommerceProvider customersSlug="users" debug={false} enableVariants={false} syncLocalStorage={false}
    currenciesConfig={{ defaultCurrency: 'KRW', supportedCurrencies: [{ code: 'KRW', decimals: 0, label: 'Korean Won', symbol: '₩' }] }}
    paymentMethods={[{ name: 'portone', label: 'Card', initiatePayment: true, confirmOrder: true }]}>
    {children}
  </EcommerceProvider>
}
function render(sdk: typeof requestPayment, recovery = false) {
  ui.render(<EnglishMessages><Provider><Payment shippingAddress={address} recovery={recovery} requestPayment={sdk} /></Provider></EnglishMessages>)
}

test('SDK cancellation keeps exact attempt and address, makes no second charge, and never claims paid', async () => {
  confirmationStatus = 409
  let opens = 0
  const sdk: typeof requestPayment = async () => { opens++; return { transactionType: 'PAYMENT', txId: 'provider-test-transaction', paymentId: paymentID, code: 'FAILURE', message: 'User cancelled' } }
  render(sdk)
  const pay = await ui.screen.findByRole('button', { name: 'Pay by card' })
  await ui.waitFor(() => assert.equal((pay as HTMLButtonElement).disabled, false))
  ui.fireEvent.click(pay)
  await ui.screen.findByText('Payment is not confirmed. Check this attempt before trying again.')
  assert.equal(opens, 1)
  assert.equal(calls.filter((call) => call.path.endsWith('/initiate')).length, 1)
  assert.equal(ui.screen.queryByText(/Payment confirmed/) === null, true)
  const saved = JSON.parse(dom.window.sessionStorage.getItem(storageKey)!)
  assert.equal(saved.transactionID, transactionID)
  assert.equal(saved.paymentID, paymentID)
  assert.equal(Object.keys(saved).sort().join(','), 'attemptID,cartID,paymentID,transactionID,version')
  assert.equal(calls.find((call) => call.path.endsWith('/initiate'))?.body.shippingAddress !== undefined, true)
  assert.equal(dom.window.sessionStorage.getItem(storageKey)!.includes('Recipient'), false)
})

test('restoring an attempt never automatically requests a payment or confirmation', async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  let opens = 0
  render(async () => { opens++; return undefined }, true)
  await ui.screen.findByRole('button', { name: 'Check payment' })
  assert.equal(opens, 0)
  assert.equal(calls.some((call) => call.path.endsWith('/confirm-order') || call.path.endsWith('/initiate')), false)
})

test('authoritative confirmation retires the matching retained attempt and permits a later checkout', async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  render(async () => undefined, true)
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: 'Check payment' }))
  await ui.screen.findByText('Payment confirmed. Your order has been received.')
  assert.equal(dom.window.sessionStorage.getItem(storageKey), null)
  ui.cleanup()
  render(async () => undefined)
  const pay = await ui.screen.findByRole('button', { name: 'Pay by card' })
  await ui.waitFor(() => assert.equal((pay as HTMLButtonElement).disabled, false))
})

test('confirming an older attempt preserves a different concurrently retained attempt', async () => {
  const newer = { ...intent, transactionID: orderID, paymentID: orderID.replaceAll('-', '') }
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  resumeOutcome = 'resumable'
  render(async () => {
    dom.window.sessionStorage.setItem(storageKey, JSON.stringify(newer))
    return undefined
  }, true)
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: 'Resume same payment' }))
  await ui.screen.findByText('Payment confirmed. Your order has been received.')
  assert.deepEqual(JSON.parse(dom.window.sessionStorage.getItem(storageKey)!), newer)
})

test('a reused preparation is status-only and never opens the SDK', async () => {
  preparationOutcome = 'status-only'
  let opens = 0
  render(async () => { opens++; return undefined })
  const pay = await ui.screen.findByRole('button', { name: 'Pay by card' })
  await ui.waitFor(() => assert.equal((pay as HTMLButtonElement).disabled, false))
  ui.fireEvent.click(pay)
  await ui.screen.findByText('An existing attempt was found. Check its status before continuing.')
  assert.equal(opens, 0)
})

test('READY/status-only resume never reopens; explicit verified resumable opens exactly the same payment once', async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  let opens = 0
  const ids: string[] = []
  render(async (request) => { opens++; ids.push(request.paymentId); return undefined }, true)
  const resume = await ui.screen.findByRole('button', { name: 'Resume same payment' })
  ui.fireEvent.click(resume)
  await ui.screen.findByText('This attempt cannot be reopened. Check payment status or contact support.')
  assert.equal(opens, 0)
  assert.equal(ui.screen.queryByRole('button', { name: 'Cancel this attempt' }) === null, true)
  resumeOutcome = 'resumable'
  ui.fireEvent.click(resume)
  await ui.screen.findByText('Payment confirmed. Your order has been received.')
  assert.equal(opens, 1)
  assert.deepEqual(ids, [paymentID])
  assert.equal(calls.some((call) => call.path.endsWith('/initiate')), false)
})

test('3.92.1 hook cartID guard does not block same official endpoint recovery with retained canonical cart', async () => {
  cartAvailable = false
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  let opens = 0
  render(async () => { opens++; return undefined }, true)
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: 'Check payment' }))
  await ui.screen.findByText('Payment confirmed. Your order has been received.')
  const confirmation = calls.find((call) => call.path.endsWith('/confirm-order'))
  assert.deepEqual(confirmation?.body, { transactionID, paymentID, cartID: 'cart-1' })
  assert.equal(opens, 0)
  assert.equal(calls.some((call) => call.path.endsWith('/initiate')), false)
})

test('unknown confirmation stays recoverable and does not charge automatically', async () => {
  confirmationStatus = 503
  cartAvailable = false
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  let opens = 0
  render(async () => { opens++; return undefined }, true)
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: 'Check payment' }))
  await ui.screen.findByText('Payment could not be confirmed. Your attempt is retained; check it before trying again.')
  assert.equal(opens, 0)
  assert.equal(JSON.parse(dom.window.sessionStorage.getItem(storageKey)!).transactionID, transactionID)
})

test('a new tab discovers canonical pending metadata without PII or opening payment', async () => {
  discovered = [{ transactionID, paymentID, cartID: 'cart-1', productID: 'product-1', quantity: 1, totalAmount: 10000, currency: 'KRW', status: 'pending', reviewHold: false }]
  let opens = 0
  render(async () => { opens++; return undefined }, true)
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: /1 coin.*View attempt/ }))
  await ui.screen.findByRole('button', { name: 'Check payment' })
  assert.equal(JSON.parse(dom.window.sessionStorage.getItem(storageKey)!).transactionID, transactionID)
  assert.equal(opens, 0)
  assert.equal(calls.some((call) => call.path.endsWith('/confirm-order') || call.path.endsWith('/initiate')), false)
})

test('a resolution conflict is manual review only, never resumable or retirable', async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  discovered = [{ transactionID, paymentID, cartID: 'cart-1', productID: 'product-1', quantity: 1, totalAmount: 10000, currency: 'KRW', status: 'cancelled', reviewHold: false, resolutionConflict: true }]
  render(async () => { throw new Error('Conflict must never open payment') }, true)
  await ui.screen.findByText('This payment needs review. Contact support before trying again.')
  assert.equal((ui.screen.getByRole('button', { name: 'Resume same payment' }) as HTMLButtonElement).disabled, true)
  assert.equal(ui.screen.queryByRole('button', { name: 'Cancel this attempt' }) === null, true)
  assert.deepEqual(JSON.parse(dom.window.sessionStorage.getItem(storageKey)!), intent)
  assert.equal(calls.some((call) => call.path.endsWith('/resume') || call.path.endsWith('/retire')), false)
})

for (const expiredStatus of [401, 403]) test(`authoritative ${expiredStatus} requests inline reauthentication without discarding mounted address`, async () => {
  let expired = 0
  ui.render(<EnglishMessages><Provider><IdentityBoundary verified onSessionExpired={() => { expired++ }}><input aria-label="Retained delivery address" defaultValue="Address in progress" /></IdentityBoundary></Provider></EnglishMessages>)
  const input = ui.screen.getByRole('textbox', { name: 'Retained delivery address' }) as HTMLInputElement
  await ui.waitFor(() => assert.equal(calls.filter((call) => call.path === '/api/users/me').length >= 2, true))
  accountStatus = expiredStatus
  ui.fireEvent.focus(dom.window as unknown as Window)
  await ui.waitFor(() => assert.equal(expired, 1))
  assert.equal(input.isConnected, true)
  assert.equal(input.value, 'Address in progress')
})

test('an actual account switch remounts private checkout inputs rather than exposing the previous address', async () => {
  ui.render(<EnglishMessages><Provider><IdentityBoundary verified onSessionExpired={() => {}}><input aria-label="Private delivery address" defaultValue="" /></IdentityBoundary></Provider></EnglishMessages>)
  await ui.waitFor(() => assert.equal(calls.filter((call) => call.path === '/api/users/me').length >= 2, true))
  const original = ui.screen.getByRole('textbox', { name: 'Private delivery address' }) as HTMLInputElement
  ui.fireEvent.change(original, { target: { value: 'Previous account address' } })
  accountID = 'customer-2'
  ui.fireEvent.focus(dom.window as unknown as Window)
  await ui.waitFor(() => assert.equal(original.isConnected, false))
  await ui.waitFor(() => assert.equal((ui.screen.getByRole('textbox', { name: 'Private delivery address' }) as HTMLInputElement).value, ''))
})
