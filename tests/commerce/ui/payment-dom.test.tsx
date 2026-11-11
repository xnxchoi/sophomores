import { EnglishMessages } from "../../fixtures/english-messages";
import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { EcommerceProvider, useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import type { requestPayment } from '@portone/browser-sdk/v2'
import type { ShippingAddress } from '../../../src/lib/commerce/contracts'
import { useEffect, type ReactNode } from 'react'

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
let ownAccountRead: (() => Promise<Response>) | undefined
let providerAccountRead: (() => Promise<Response>) | undefined
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
  globalValue('localStorage', dom.window.localStorage)
  Object.defineProperty(dom.window.navigator, 'locks', { configurable: true, value: {
    request: async (_name: string, _options: unknown, callback: (lock: object) => Promise<void>) => callback({})
  } })
  globalValue('IS_REACT_ACT_ENVIRONMENT', true)
  globalValue('fetch', async (input: string | URL | Request, options?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const body = options?.body ? JSON.parse(String(options.body)) as Record<string, unknown> : {}
    calls.push({ path: url.pathname, body })
    if (url.pathname === '/api/users/me') {
      const override = url.searchParams.has('select[cart]') ? providerAccountRead : ownAccountRead
      if (override) return override()
    }
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
  ownAccountRead = undefined; providerAccountRead = undefined; dom.window.localStorage.clear()
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

function Provider({ children, syncLocalStorage = false }: { children: ReactNode; syncLocalStorage?: boolean }) {
  return <EcommerceProvider customersSlug="users" debug={false} enableVariants={false} syncLocalStorage={syncLocalStorage}
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

for (const expiredStatus of [401]) test(`authoritative ${expiredStatus} requests inline reauthentication without discarding mounted address`, async () => {
  let expired = 0
  ui.render(<EnglishMessages><Provider><IdentityBoundary verified onSessionExpired={() => { expired++ }}><input aria-label="Retained delivery address" defaultValue="Address in progress" /></IdentityBoundary></Provider></EnglishMessages>)
  const input = await ui.screen.findByRole('textbox', { name: 'Retained delivery address' }) as HTMLInputElement
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
  const original = await ui.screen.findByRole('textbox', { name: 'Private delivery address' }) as HTMLInputElement
  ui.fireEvent.change(original, { target: { value: 'Previous account address' } })
  accountID = 'customer-2'
  ui.fireEvent.focus(dom.window as unknown as Window)
  await ui.waitFor(() => assert.equal(original.isConnected, false))
  await ui.waitFor(() => assert.equal((ui.screen.getByRole('textbox', { name: 'Private delivery address' }) as HTMLInputElement).value, ''))
})


function identityState() {
  const surface = document.querySelector<HTMLElement>('[data-commerce-identity-state]')
  return { kind: surface?.dataset.commerceIdentityState, blocked: surface?.hidden, inert: surface?.hasAttribute('inert') }
}

let refreshProvider: () => Promise<void> = async () => { throw new Error('Provider probe is not mounted') }
let clearProviderSession: () => void = () => { throw new Error('Provider probe is not mounted') }
function ProviderRefreshProbe() {
  const { onLogin, clearSession } = useEcommerce()
  useEffect(() => { refreshProvider = onLogin; clearProviderSession = clearSession }, [onLogin, clearSession])
  return null
}

async function identityFixture(syncLocalStorage = false) {
  let expired = 0
  const onSessionExpired = () => { expired++ }
  const view = (verified = true) => <EnglishMessages><Provider syncLocalStorage={syncLocalStorage}><ProviderRefreshProbe /><IdentityBoundary verified={verified} onSessionExpired={onSessionExpired}><input aria-label="Identity private address" defaultValue="" /></IdentityBoundary></Provider></EnglishMessages>
  const rendered = ui.render(view())
  const input = await ui.screen.findByRole('textbox', { name: 'Identity private address' }) as HTMLInputElement
  await ui.waitFor(() => assert.equal(calls.filter((call) => call.path === '/api/users/me').length >= 2, true))
  ui.fireEvent.change(input, { target: { value: 'Private account A address' } })
  return { input, expired: () => expired, rerender: (verified: boolean) => rendered.rerender(view(verified)) }
}

for (const [status, kind] of [[403, 'forbidden'], [429, 'rate-limited'], [404, 'http-error'], [503, 'http-error']] as const) {
  test(`own-account HTTP ${status} is ${kind}, never proof of expired authentication`, async () => {
    const f = await identityFixture()
    ownAccountRead = async () => Response.json({ user: null }, { status })
    ui.fireEvent.focus(dom.window as unknown as Window)
    await ui.screen.findByRole('button', { name: 'Retry account check' })
    assert.equal(f.expired(), 0)
    assert.deepEqual(identityState(), { kind, blocked: true, inert: true })
    assert.equal(f.input.isConnected, true)
    assert.equal(f.input.value, 'Private account A address')
  })
}

for (const body of [{}, { user: {} }, { user: { id: '' } }, { user: { id: [] } }, { user: 'anonymous' }]) {
  test('malformed own-account receipts are contract failure without auth reset: ' + JSON.stringify(body), async () => {
    const f = await identityFixture()
    ownAccountRead = async () => Response.json(body)
    ui.fireEvent.focus(dom.window as unknown as Window)
    await ui.screen.findByRole('button', { name: 'Retry account check' })
    assert.deepEqual(identityState(), { kind: 'malformed-receipt', blocked: true, inert: true })
    assert.equal(f.expired(), 0)
    assert.equal(f.input.isConnected, true)
  })
}

for (const aborted of [false, true]) {
  test('own-account transport failure retains its cause without reauthentication: abort=' + aborted, async () => {
    const f = await identityFixture()
    ownAccountRead = async () => { throw aborted ? new DOMException('Aborted test read', 'AbortError') : new Error('Transport test failure') }
    ui.fireEvent.focus(dom.window as unknown as Window)
    await ui.screen.findByRole('button', { name: 'Retry account check' })
    assert.deepEqual(identityState(), { kind: aborted ? 'transport-aborted' : 'transport-error', blocked: true, inert: true })
    assert.equal(f.expired(), 0)
    assert.equal(f.input.isConnected, true)
  })
}

test('a valid anonymous receipt requests authentication but never unmasks private commerce', async () => {
  const f = await identityFixture()
  ownAccountRead = async () => Response.json({ user: null })
  ui.fireEvent.focus(dom.window as unknown as Window)
  await ui.waitFor(() => assert.equal(f.expired(), 1))
  assert.deepEqual(identityState(), { kind: 'authentication-required', blocked: true, inert: true })
  assert.equal(f.input.isConnected, true)
})

test('same-account authoritative confirmation retains the exact mounted input and in-progress value', async () => {
  const f = await identityFixture()
  ui.fireEvent.focus(dom.window as unknown as Window)
  await ui.waitFor(() => assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false }))
  assert.equal(f.input.isConnected, true)
  assert.equal(f.input.value, 'Private account A address')
})

for (const outcome of ['rejected', 'fulfilled-anonymous', 'fulfilled-wrong-user'] as const) {
  test('provider synchronization ' + outcome + ' cannot confirm own account or retain another account private DOM', async () => {
    const f = await identityFixture()
    ownAccountRead = async () => Response.json({ user: { id: 'customer-2' } })
    providerAccountRead = async () => outcome === 'rejected' ? Response.json({ error: 'Synthetic sync failure' }, { status: 503 }) : Response.json({ user: outcome === 'fulfilled-anonymous' ? null : { id: 'customer-3' } })
    ui.fireEvent.focus(dom.window as unknown as Window)
    await ui.screen.findByRole('button', { name: 'Retry account check' })
    assert.deepEqual(identityState(), { kind: outcome === 'rejected' ? 'synchronization-error' : 'synchronization-unconfirmed', blocked: true, inert: true })
    assert.equal(f.input.isConnected, false, 'confirmed different own account must isolate prior private DOM even when sync fails')
    assert.equal(document.body.textContent?.includes('Your inputs are retained.'), false)
    assert.equal(f.expired(), 0)
    providerAccountRead = async () => Response.json({ user: { id: 'customer-2' } })
    ui.fireEvent.click(ui.screen.getByRole('button', { name: 'Retry account check' }))
    await ui.waitFor(() => assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false }))
    assert.equal((ui.screen.getByRole('textbox', { name: 'Identity private address' }) as HTMLInputElement).value, '')
  })
}

test('synchronous void clearSession failure is synchronization failure, never read failure or false completion', async (t) => {
  const f = await identityFixture(true)
  const removeItem = dom.window.Storage.prototype.removeItem
  let failOnce = true
  t.mock.method(dom.window.Storage.prototype, 'removeItem', function (this: Storage, key: string) {
    if (failOnce) { failOnce = false; throw new Error('Synthetic clearSession failure') }
    removeItem.call(this, key)
  })
  ownAccountRead = async () => Response.json({ user: { id: 'customer-2' } })
  ui.fireEvent.focus(dom.window as unknown as Window)
  await ui.screen.findByRole('button', { name: 'Retry account check' })
  assert.deepEqual(identityState(), { kind: 'synchronization-error', blocked: true, inert: true })
  assert.equal(f.input.isConnected, false)
  assert.equal(f.expired(), 0)
})

test('initial verified gate with no provider user still reads own account and cannot accept fulfilled-no-user synchronization', async () => {
  ownAccountRead = async () => Response.json({ user: { id: 'customer-1' } })
  providerAccountRead = async () => Response.json({ user: null })
  let expired = 0
  ui.render(<EnglishMessages><Provider><IdentityBoundary verified onSessionExpired={() => { expired++ }}><input aria-label="Initially unconfirmed address" /></IdentityBoundary></Provider></EnglishMessages>)
  await ui.screen.findByRole('button', { name: 'Retry account check' })
  assert.deepEqual(identityState(), { kind: 'synchronization-unconfirmed', blocked: true, inert: true })
  assert.equal(expired, 0)
})

test('a stale own-account response after verification restarts cannot unmask or restore previous account DOM', async () => {
  const f = await identityFixture()
  let finish: (response: Response) => void = () => { throw new Error('Read was not started') }
  ownAccountRead = () => new Promise<Response>((resolve) => { finish = resolve })
  ui.fireEvent.focus(dom.window as unknown as Window)
  await ui.waitFor(() => assert.equal(identityState().blocked, true))
  f.rerender(false)
  accountID = 'customer-2'
  ownAccountRead = async () => Response.json({ user: { id: 'customer-2' } })
  f.rerender(true)
  await ui.waitFor(() => assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false }))
  assert.equal(f.input.isConnected, false)
  const current = ui.screen.getByRole('textbox', { name: 'Identity private address' }) as HTMLInputElement
  await ui.act(async () => { finish(Response.json({ user: { id: 'customer-1' } })) })
  assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false })
  assert.equal(current.isConnected, true)
  assert.equal(current.value, '')
})


test('focus events while an own-account read is pending do not duplicate the operation', async () => {
  const f = await identityFixture()
  let reads = 0
  let finish: (response: Response) => void = () => { throw new Error('Read was not started') }
  ownAccountRead = () => { reads++; return new Promise<Response>((resolve) => { finish = resolve }) }
  ui.fireEvent.focus(dom.window as unknown as Window)
  ui.fireEvent.focus(dom.window as unknown as Window)
  ui.fireEvent.focus(dom.window as unknown as Window)
  assert.equal(reads, 1)
  assert.equal(identityState().blocked, true)
  await ui.act(async () => { finish(Response.json({ user: { id: 'customer-1' } })) })
  await ui.waitFor(() => assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false }))
  assert.equal(f.input.isConnected, true)
  assert.equal(f.input.value, 'Private account A address')
})

test('a hidden document defers its own-account read until visibility returns', async (t) => {
  await identityFixture()
  let reads = 0
  ownAccountRead = async () => { reads++; return Response.json({ user: { id: 'customer-1' } }) }
  const previousVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState')
  t.after(() => { if (previousVisibility) Object.defineProperty(document, 'visibilityState', previousVisibility); else Reflect.deleteProperty(document, 'visibilityState') })
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  ui.fireEvent.focus(dom.window as unknown as Window)
  assert.equal(reads, 0)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  ui.fireEvent(document, new dom.window.Event('visibilitychange'))
  await ui.waitFor(() => assert.equal(reads, 1))
  await ui.waitFor(() => assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false }))
})

test('an unverified gate does not read or expose commerce and needs fresh proof when enabled', async () => {
  let ownReads = 0
  ownAccountRead = async () => { ownReads++; return Response.json({ user: { id: 'customer-1' } }) }
  const view = (verified: boolean) => <EnglishMessages><Provider><IdentityBoundary verified={verified} onSessionExpired={() => {}}><input aria-label="Deferred verified commerce" /></IdentityBoundary></Provider></EnglishMessages>
  const rendered = ui.render(view(false))
  await ui.waitFor(() => assert.equal(calls.some((call) => call.path === '/api/users/me'), true))
  assert.equal(ownReads, 0)
  assert.equal(identityState().blocked, true)
  rendered.rerender(view(true))
  await ui.screen.findByRole('textbox', { name: 'Deferred verified commerce' })
  assert.equal(ownReads > 0, true)
  assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false })
})


test('invalid JSON in a successful own-account response is malformed, not expired authentication', async () => {
  const f = await identityFixture()
  ownAccountRead = async () => new Response('not-json', { status: 200 })
  ui.fireEvent.focus(dom.window as unknown as Window)
  await ui.screen.findByRole('button', { name: 'Retry account check' })
  assert.deepEqual(identityState(), { kind: 'malformed-receipt', blocked: true, inert: true })
  assert.equal(f.expired(), 0)
  assert.equal(f.input.isConnected, true)
})

test('a finite numeric own/provider account ID is actual matching identity, not missing bootstrap state', async () => {
  ownAccountRead = async () => Response.json({ user: { id: 0 } })
  providerAccountRead = async () => Response.json({ user: { id: 0 } })
  ui.render(<EnglishMessages><Provider><IdentityBoundary verified onSessionExpired={() => { throw new Error('Numeric ID is not anonymous') }}><input aria-label="Numeric identity address" /></IdentityBoundary></Provider></EnglishMessages>)
  await ui.screen.findByRole('textbox', { name: 'Numeric identity address' })
  assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false })
})


for (const outcome of ['fulfilled-wrong-user', 'rejected'] as const) {
  test('settled ' + outcome + ' cannot accept a later provider ID using stale canonical identity', async () => {
    await identityFixture()
    ownAccountRead = async () => Response.json({ user: { id: 'customer-2' } })
    providerAccountRead = async () => outcome === 'rejected' ? Response.json({ error: 'Synthetic sync failure' }, { status: 503 }) : Response.json({ user: { id: 'customer-3' } })
    ui.fireEvent.focus(dom.window as unknown as Window)
    await ui.waitFor(() => assert.equal(identityState().kind, outcome === 'rejected' ? 'synchronization-error' : 'synchronization-unconfirmed'))
    let freshOwnReads = 0
    let laterProviderReads = 0
    ownAccountRead = async () => { freshOwnReads++; return Response.json({ user: { id: 'customer-3' } }) }
    providerAccountRead = async () => { laterProviderReads++; return Response.json({ user: { id: 'customer-2' } }) }
    await ui.act(async () => { await refreshProvider() })
    await ui.waitFor(() => assert.equal(freshOwnReads > 0, true, 'later provider identity needs a new canonical read'))
    await ui.act(async () => {})
    assert.equal(identityState().blocked, true)
    assert.equal(identityState().kind === 'confirmed', false)
    assert.equal(laterProviderReads, 1, 'read-only post-sync reconciliation cannot recurse into provider login')
  })
}


test('a stale pending synchronization cannot retire a newer attempt guard or reveal its private state', async () => {
  const f = await identityFixture()
  let finishOld: (response: Response) => void = () => { throw new Error('Old sync not started') }
  let finishNew: (response: Response) => void = () => { throw new Error('New sync not started') }
  ownAccountRead = async () => Response.json({ user: { id: 'customer-2' } })
  providerAccountRead = () => new Promise<Response>((resolve) => { finishOld = resolve })
  ui.fireEvent.focus(dom.window as unknown as Window)
  await ui.waitFor(() => assert.equal(identityState().kind, 'synchronizing'))
  f.rerender(false)
  let freshReads = 0
  ownAccountRead = async () => { freshReads++; return Response.json({ user: { id: 'customer-3' } }) }
  providerAccountRead = () => new Promise<Response>((resolve) => { finishNew = resolve })
  f.rerender(true)
  await ui.waitFor(() => assert.equal(identityState().kind, 'synchronizing'))
  const beforeOldCompletion = freshReads
  await ui.act(async () => { finishOld(Response.json({ user: { id: 'customer-2' } })) })
  assert.equal(identityState().blocked, true)
  assert.equal(identityState().kind, 'synchronizing')
  assert.equal(freshReads, beforeOldCompletion, 'old sync completion cannot clear the newer guard and provoke a stale recheck')
  await ui.act(async () => { finishNew(Response.json({ user: { id: 'customer-3' } })) })
  await ui.waitFor(() => assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false }))
  assert.equal(f.input.isConnected, false)
  assert.equal((ui.screen.getByRole('textbox', { name: 'Identity private address' }) as HTMLInputElement).value, '')
})


for (const failure of ['403', 'malformed', 'transport'] as const) {
  test('observed non-null provider switch isolates previous private DOM even when own-account read is ' + failure, async () => {
    const f = await identityFixture()
    ownAccountRead = async () => {
      if (failure === 'transport') throw new TypeError('Synthetic transport failure')
      return failure === '403' ? Response.json({ user: null }, { status: 403 }) : Response.json({ user: { invalid: true } })
    }
    providerAccountRead = async () => Response.json({ user: { id: 'customer-2' } })
    await ui.act(async () => { await refreshProvider() })
    await ui.waitFor(() => assert.equal(identityState().kind, failure === '403' ? 'forbidden' : failure === 'malformed' ? 'malformed-receipt' : 'transport-error'))
    assert.equal(identityState().blocked, true)
    assert.equal(f.input.isConnected, false, 'observed different non-null provider must not retain previous account DOM')
    assert.equal(document.body.textContent?.includes('Your inputs are retained.'), false)
    assert.equal(f.expired(), 0)
  })
}


test('provider null during same-account synchronization does not remount the retained input', async () => {
  const f = await identityFixture()
  await ui.act(async () => { clearProviderSession() })
  await ui.waitFor(() => assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false }))
  assert.equal(f.input.isConnected, true)
  assert.equal(f.input.value, 'Private account A address')
  assert.equal(f.expired(), 0)
})


for (const aborted of [false, true]) {
  test('successful headers followed by native body stream failure preserve transport cause: abort=' + aborted, async () => {
    const f = await identityFixture()
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined
    const response = new Response(new ReadableStream<Uint8Array>({ start(value) { controller = value; value.enqueue(new TextEncoder().encode('{"user":')) } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    let unexpectedProviderReads = 0
    providerAccountRead = async () => { unexpectedProviderReads++; return Response.json({ user: { id: 'customer-1' } }) }
    ownAccountRead = async () => response
    ui.fireEvent.focus(dom.window as unknown as Window)
    await ui.waitFor(() => assert.equal(response.bodyUsed, true, 'native body consumption starts after successful headers'))
    await ui.act(async () => { controller!.error(aborted ? new DOMException('Synthetic stream abort', 'AbortError') : new TypeError('Synthetic stream transport failure')) })
    await ui.waitFor(() => assert.deepEqual(identityState(), { kind: aborted ? 'transport-aborted' : 'transport-error', blocked: true, inert: true }))
    assert.equal(f.expired(), 0)
    assert.equal(f.input.isConnected, true)
    assert.equal(f.input.value, 'Private account A address')
    assert.equal(unexpectedProviderReads, 0)
  })
}

for (const [kind, body] of [['invalid JSON', 'not-json'], ['invalid schema', JSON.stringify({ user: { id: [] } })]] as const) {
  test('successfully consumed native body with ' + kind + ' remains malformed rather than transport failure', async () => {
    const f = await identityFixture()
    const response = new Response(new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode(body)); controller.close() } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    ownAccountRead = async () => response
    ui.fireEvent.focus(dom.window as unknown as Window)
    await ui.waitFor(() => assert.deepEqual(identityState(), { kind: 'malformed-receipt', blocked: true, inert: true }))
    assert.equal(response.bodyUsed, true)
    assert.equal(f.expired(), 0)
    assert.equal(f.input.isConnected, true)
  })
}

for (const [status, kind] of [[401, 'authentication-required'], [403, 'forbidden'], [429, 'rate-limited'], [503, 'http-error']] as const) {
  test('HTTP ' + status + ' takes precedence over a failed native body that must not be consumed', async () => {
    const f = await identityFixture()
    const response = new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('Synthetic unread body failure')) } }), { status })
    ownAccountRead = async () => response
    ui.fireEvent.focus(dom.window as unknown as Window)
    await ui.waitFor(() => assert.deepEqual(identityState(), { kind, blocked: true, inert: true }))
    assert.equal(response.bodyUsed, false)
    assert.equal(f.expired(), status === 401 ? 1 : 0)
    assert.equal(f.input.isConnected, true)
  })
}

for (const aborted of [false, true]) {
  test('late native body failure from a superseded own-account attempt cannot replace fresh identity: abort=' + aborted, async () => {
    const f = await identityFixture()
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined
    const response = new Response(new ReadableStream<Uint8Array>({ start(value) { controller = value } }), { status: 200 })
    ownAccountRead = async () => response
    ui.fireEvent.focus(dom.window as unknown as Window)
    await ui.waitFor(() => assert.equal(response.bodyUsed, true))
    f.rerender(false)
    ownAccountRead = async () => Response.json({ user: { id: 'customer-2' } })
    providerAccountRead = async () => Response.json({ user: { id: 'customer-2' } })
    f.rerender(true)
    await ui.waitFor(() => assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false }))
    await ui.act(async () => { controller!.error(aborted ? new DOMException('Late stream abort', 'AbortError') : new TypeError('Late stream failure')) })
    assert.deepEqual(identityState(), { kind: 'confirmed', blocked: false, inert: false })
    assert.equal(f.input.isConnected, false)
    assert.equal(f.expired(), 0)
  })
}

test('a native body failure after boundary unmount is ignored without new identity work', async () => {
  await identityFixture()
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined
  const response = new Response(new ReadableStream<Uint8Array>({ start(value) { controller = value } }), { status: 200 })
  ownAccountRead = async () => response
  ui.fireEvent.focus(dom.window as unknown as Window)
  await ui.waitFor(() => assert.equal(response.bodyUsed, true))
  const before = calls.length
  ui.cleanup()
  await ui.act(async () => { controller!.error(new TypeError('Unmounted stream failure')) })
  assert.equal(calls.length, before)
  assert.equal(document.querySelector('[data-commerce-identity-state]') === null, true)
})
