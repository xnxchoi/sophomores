import { EnglishMessages } from "../../fixtures/english-messages";
import { createRequire, registerHooks } from "node:module";
import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { EcommerceProvider, useEcommerce } from '@payloadcms/plugin-ecommerce/client/react'
import type { requestPayment } from '@portone/browser-sdk/v2'
import type { ShippingAddress } from '../../../src/lib/commerce/contracts'
import type { MemberStatus } from '@/lib/member-auth/client'
import { useEffect, type ReactNode } from 'react'
import { setCheckoutPayload } from '../../fixtures/commerce/checkout-route'
import { nativeEditionsPayload } from '../../fixtures/commerce/native-editions-payload'

let dom: JSDOM
let ui: typeof import('@testing-library/react/pure')
let Payment: typeof import('../../../src/components/commerce/payment').CommercePayment
let AccountGate: typeof import('../../../src/components/commerce/checkout').CommerceAccountGate
let IdentityBoundary: typeof import('../../../src/components/commerce/checkout').CommerceIdentityBoundary
const checkoutPagePath = '/src/app/(site)/shop/checkout/page.tsx'
const capabilities = { apple: false, google: false, kakao: false, emailOtp: false, magicLink: false, passkey: false }
const activeMember: MemberStatus = {
  authenticated: true, phoneBindingAuth: 'ready', emailVerified: true, phoneBound: true, member: true, capabilities
}
let membership = activeMember
const previous = new Map<string, PropertyDescriptor | undefined>()
const transactionID = '123e4567-e89b-42d3-a456-426614174000'
const paymentID = transactionID.replaceAll('-', '')
const orderID = '123e4567-e89b-42d3-a456-426614174001'
const intent = { version: 1, attemptID: '123e4567-e89b-42d3-a456-426614174002', cartID: 'cart-1', transactionID, paymentID }
/** Resume waits for payment discovery, which carries the saved attempt's refund terms. */
async function enabledResume() {
  const resume = await ui.screen.findByRole('button', { name: 'Resume same payment' })
  await ui.waitFor(() => assert.equal((resume as HTMLButtonElement).disabled, false))
  return resume
}
/** The retained attempt as discovery reports it, with the refund terms its frozen snapshot was bought under. */
const discoveredIntent = (refundTerms: unknown = { kind: 'until', cutoffAt: '2026-12-08T01:00:00.000Z' }) =>
  ({ transactionID, paymentID, cartID: 'cart-1', productID: 'product-1', quantity: 1, totalAmount: 10000, currency: 'KRW', status: 'pending', reviewHold: false, refundTerms })
const storageKey = 'sphmrs:commerce-payment:customer-1'
const address: ShippingAddress = { country: 'KR', recipientName: 'Recipient', phone: '01012345678', postalCode: '12345', addressLine1: 'Address' }
const sdkRequest = { storeId: 'store-1', channelKey: 'channel-1', paymentId: paymentID, orderName: 'Approved product', totalAmount: 10000,
  currency: 'KRW', redirectUrl: 'http://localhost/shop/payment', customer: { customerId: 'customer-1', email: 'member@example.test' } }
let calls: { path: string; body: Record<string, unknown> }[] = []
let cartAvailable = true
let confirmationStatus = 200
let resumeOutcome = 'status-only'
let preparationOutcome = 'prepared'
/** Refund terms the stand-in server answers with on a stale quote or resume (Review-B r3). */
let serverTerms: unknown
let accountStatus = 200
let accountID = 'customer-1'
let ownAccountRead: (() => Promise<Response>) | undefined
let providerAccountRead: (() => Promise<Response>) | undefined
let retirementStatus = 200
let resultOutcome = 'local-unresolved'
const newerIntent = { version: 1, attemptID: '123e4567-e89b-42d3-a456-426614174009', cartID: 'cart-1' }
let retiredTransactionID = transactionID
let discovered: { transactionID: string; paymentID: string; cartID: string; productID: string; quantity: number; totalAmount: number; currency: string; status: string; reviewHold: boolean; resolutionConflict?: boolean; orderName?: string | null; refundTerms?: unknown }[] = []

function globalValue(key: string, value: unknown) {
  if (!previous.has(key)) previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
}
let cssHook: ReturnType<typeof registerHooks>;
before(async () => {
  cssHook = registerHooks({
    resolve(specifier, context, next) {
      if (context.parentURL && new URL(context.parentURL).pathname.endsWith(checkoutPagePath)
        && ['payload', '@payload-config', 'next/server', 'next-intl/server',
          '@/lib/commerce/catalogue', '@/lib/member-auth/public-capabilities.server'].includes(specifier)) {
        return { url: new URL('../../fixtures/commerce/checkout-route.ts', import.meta.url).href, shortCircuit: true }
      }
      if (specifier === "@/components/core/Link/Link") return {
        url: "data:text/javascript," + encodeURIComponent(
          'import { createElement } from ' + JSON.stringify(createRequire(import.meta.url).resolve("react")) +
          '; export const Link = ({ prefetch, ...props }) => createElement("a", props);'
        ), shortCircuit: true,
      };
      return next(specifier, context);
    },
    load(url, context, next) {
    if (url.startsWith("data:text/javascript,")) return {
      format: "module", source: decodeURIComponent(url.slice("data:text/javascript,".length)), shortCircuit: true,
    };
    if (url.endsWith(".module.css")) return { format: "module", source: "export default {};", shortCircuit: true };
    return next(url, context);
  } });
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/shop', pretendToBeVisual: true })
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'MutationObserver', 'Event']) {
    globalValue(key, key === 'window' ? dom.window : dom.window[key as keyof typeof dom.window])
  }
  globalValue('self', dom.window)
  // Browsers have these; jsdom does not. Arc ExpandableCard and AnimatedCounter only observe, so inert stand-ins are enough.
  class InertObserver { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } }
  globalValue('ResizeObserver', InertObserver)
  globalValue('IntersectionObserver', InertObserver)
  // Arc Button's label swap measures the outgoing label (motion popLayout), as browsers allow.
  globalValue('getComputedStyle', dom.window.getComputedStyle.bind(dom.window))
  globalValue('localStorage', dom.window.localStorage)
  Object.defineProperty(dom.window.navigator, 'locks', { configurable: true, value: {
    request: async (_name: string, _options: unknown, callback: (lock: object) => Promise<void>) => callback({})
  } })
  globalValue('IS_REACT_ACT_ENVIRONMENT', true)
  globalValue('fetch', async (input: string | URL | Request, options?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const body = options?.body ? JSON.parse(String(options.body)) as Record<string, unknown> : {}
    calls.push({ path: url.pathname, body })
    if (url.pathname === '/api/member/status') return Response.json({ success: true, data: membership })
    if (url.pathname === '/api/member/identify' && options?.method === 'DELETE') return Response.json({ success: true })
    if (url.pathname === '/api/users/me') {
      const override = url.searchParams.has('select[cart]') ? providerAccountRead : ownAccountRead
      if (override) return override()
    }
    if (url.pathname === '/api/users/me') return accountStatus === 200 ? Response.json({ user: { id: accountID, collection: 'users', cart: { docs: cartAvailable ? ['cart-1'] : [] } } }) : Response.json({ user: null }, { status: accountStatus })
    if (url.pathname === '/api/addresses') return Response.json({ docs: [] })
    if (url.origin === 'http://localhost' && url.pathname === '/api/payments/portone/pending') return Response.json({ attempts: discovered })
    if (url.pathname === '/api/carts/cart-1') return Response.json({ id: 'cart-1', currency: 'KRW', items: [{ id: 'item-1', product: 'product-1', quantity: 1 }] })
    if (url.pathname.endsWith('/initiate') && preparationOutcome === 'guest-quote-changed') return Response.json({ message: 'Guest quote changed', outcome: preparationOutcome, ...(serverTerms ? { refundTerms: serverTerms } : {}) })
    if (url.pathname.endsWith('/initiate')) return Response.json({ transactionID, paymentID, outcome: preparationOutcome, ...(preparationOutcome === 'prepared' ? { paymentRequest: sdkRequest } : {}) })
    if (url.pathname.endsWith('/confirm-order')) return confirmationStatus === 200 ? Response.json({ orderID, transactionID }) : Response.json({ message: 'Unconfirmed' }, { status: confirmationStatus })
    if (url.pathname.endsWith('/resume') && resumeOutcome === 'terms-changed') return Response.json({ message: 'Refund terms changed', transactionID, paymentID, outcome: resumeOutcome, refundTerms: serverTerms })
    if (url.pathname.endsWith('/resume')) return Response.json({ transactionID, paymentID, outcome: resumeOutcome, ...(resumeOutcome === 'resumable' ? { paymentRequest: sdkRequest } : {}) })
    if (url.pathname.endsWith('/retire')) return Response.json({ outcome: 'retired', transactionID: retiredTransactionID, paymentID }, { status: retirementStatus })
    if (url.pathname.endsWith('/result')) {
      if (resultOutcome === 'lost') throw new TypeError('Failed to fetch')
      // 'stale': another tab saved a newer attempt before this answer arrived.
      if (resultOutcome === 'stale') dom.window.sessionStorage.setItem(storageKey, JSON.stringify(newerIntent))
      const [outcome, status] = resultOutcome === 'stale' ? ['local-terminal', 'cancelled'] : resultOutcome.split(':')
      return Response.json(outcome === 'local-terminal' ? { outcome, status: status ?? 'cancelled' } : { outcome })
    }
    throw new Error('Unexpected commerce test request: ' + url.pathname)
  })
  ui = await import('@testing-library/react/pure')
  ui.configure({ getElementError: (message) => new Error(message ?? 'Element not found') })
  Payment = (await import('../../../src/components/commerce/payment')).CommercePayment
  AccountGate = (await import('../../../src/components/commerce/checkout')).CommerceAccountGate
  IdentityBoundary = (await import('../../../src/components/commerce/checkout')).CommerceIdentityBoundary
})
afterEach(() => {
  membership = activeMember
  retirementStatus = 200; retiredTransactionID = transactionID; resultOutcome = 'local-unresolved'
  ownAccountRead = undefined; providerAccountRead = undefined; dom.window.localStorage.clear()
  ui.cleanup(); dom.window.sessionStorage.clear(); calls = []; cartAvailable = true; confirmationStatus = 200; resumeOutcome = 'status-only'; preparationOutcome = 'prepared'; serverTerms = undefined; discovered = []; accountStatus = 200; accountID = 'customer-1'
})

test('explicit review mode renders a settled notice without mounting the commerce session or requesting auth', async () => {
  ui.render(<EnglishMessages><AccountGate initialCapabilities={capabilities} signInOffInReview>
    <span>Private cart contents</span>
  </AccountGate></EnglishMessages>)
  await ui.screen.findByText('Customer sign-in is off in this review copy.')
  assert.equal(ui.screen.getByRole('link', { name: 'Shop' }).getAttribute('href'), '/shop')
  assert.equal(ui.screen.queryByRole('textbox') === null, true)
  assert.equal(ui.screen.queryByText('Private cart contents') === null, true)
  assert.deepEqual(calls, [])
})

test('the checkout route keeps published details visible while identity is checked, fails and retries', async () => {
  const { default: CheckoutPage } = await import('@/app/(site)/shop/checkout/page')
  let failCheck!: (response: Response) => void
  const firstCheck = new Promise<Response>((resolve) => { failCheck = resolve })
  ownAccountRead = () => firstCheck
  ui.render(<EnglishMessages>{await CheckoutPage()}</EnglishMessages>)

  const assertPublicDetails = () => {
    const details = ui.within(ui.screen.getByRole('region', { name: 'Published checkout fixture' }))
    assert.ok(details.getByRole('heading', { name: 'Published checkout fixture' }))
    assert.ok(details.getByText('Dispatches after the launch'))
    assert.ok(details.getByText('₩3,000'))
    // Policy links moved from the summary to the page footer (checkout redesign, 21 Nov); still on the page.
    // The quiet foot row (spec §7); terms, privacy and refunds live in the business footer.
    assert.equal(ui.screen.getByRole('link', { name: 'Check payment status' }).getAttribute('href'), '/shop/payment')
  }
  const assertPrivateCheckoutBlocked = () => {
    assert.equal(ui.screen.queryByRole('textbox', { name: 'Recipient name' }) === null, true)
    assert.equal(ui.screen.queryByRole('button', { name: 'Pay by card' }) === null, true)
  }
  await ui.waitFor(() => assert.equal(calls.filter((call) => call.path === '/api/users/me').length >= 2, true))
  await ui.screen.findByText('Checking your account…')
  assertPublicDetails()
  assertPrivateCheckoutBlocked()

  await ui.act(async () => failCheck(Response.json({}, { status: 429 })))
  const retry = await ui.screen.findByRole('button', { name: 'Retry account check' })
  assertPublicDetails()
  assertPrivateCheckoutBlocked()

  let confirmCheck!: (response: Response) => void
  const retryCheck = new Promise<Response>((resolve) => { confirmCheck = resolve })
  ownAccountRead = () => retryCheck
  ui.fireEvent.click(retry)
  await ui.screen.findByText('Checking your account…')
  assertPublicDetails()
  assertPrivateCheckoutBlocked()

  const bar = ui.screen.getAllByRole('progressbar')
  assert.equal(bar.length === 1 && bar[0]!.getAttribute('aria-label') === 'Step 2 of 3: Delivery', true)
  await ui.act(async () => confirmCheck(Response.json({ user: { id: accountID } })))
  await ui.screen.findByRole('textbox', { name: 'Recipient name' })
  // The account check and the checkout share the one mounted step bar.
  assert.equal(ui.screen.getAllByRole('progressbar').length === 1 && ui.screen.getAllByRole('progressbar')[0] === bar[0], true)
  // In checkout the summary is an Arc ExpandableCard titled with the product name; the published rows stay visible.
  assert.equal(ui.screen.getAllByText('Published checkout fixture').length > 0, true)
  assert.equal(ui.screen.getAllByText('Dispatches after the launch').length > 0, true)
  assert.equal(ui.screen.getAllByText('₩3,000').length > 0, true)
  assert.equal(calls.some((call) => call.path.endsWith('/initiate')), false)
})

test('legacy checkout is closed: an existing cart and a valid address leave Pay disabled; a retained attempt stays checkable', async () => {
  const { default: CheckoutPage } = await import('@/app/(site)/shop/checkout/page')
  ui.render(<EnglishMessages>{await CheckoutPage()}</EnglishMessages>)
  const field = (name: string) => ui.screen.findByRole<HTMLInputElement>('textbox', { name })
  ui.fireEvent.change(await field('Recipient name'), { target: { value: 'Recipient' } })
  ui.fireEvent.change(await field('Phone number for delivery'), { target: { value: '01012345678' } })
  ui.fireEvent.change(await field('Postcode'), { target: { value: '12345' } })
  ui.fireEvent.change(await field('Address'), { target: { value: 'Address' } })
  // The cart already holds the product and the address is valid, but the server allows nothing for a legacy offer, so
  // the step bar stays on Delivery: Payment would point at a Pay button that can't be used.
  await ui.waitFor(() => assert.equal(ui.screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Address' })[0]!.value, 'Address'))
  assert.equal(ui.screen.getAllByRole('progressbar')[0]!.getAttribute('aria-label'), 'Step 2 of 3: Delivery')
  const pay = await ui.screen.findByRole<HTMLButtonElement>('button', { name: 'Pay by card' })
  assert.equal(pay.disabled, true)
  ui.fireEvent.click(pay)
  assert.equal(calls.some((call) => call.path.endsWith('/initiate')), false)
  ui.cleanup()
  // Recovery is separate from purchase entry: a retained attempt can still be checked.
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  ui.render(<EnglishMessages>{await CheckoutPage()}</EnglishMessages>)
  const check = await ui.screen.findByRole<HTMLButtonElement>('button', { name: 'Check payment' })
  assert.equal(check.disabled, false)
  // A retained attempt is at Payment even with no allowance: its recovery actions are what's on screen.
  await ui.waitFor(() => assert.equal(ui.screen.getAllByRole('progressbar')[0]!.getAttribute('aria-label'), 'Step 3 of 3: Payment'))
})

test('a native product goes to its own display-only checkout through the real E1 loaders, never the legacy cart or payment', async () => {
  const { default: CheckoutPage } = await import('@/app/(site)/shop/checkout/page')
  setCheckoutPayload(nativeEditionsPayload())
  try {
    ui.render(<EnglishMessages>{await CheckoutPage({ searchParams: Promise.resolve({ product: 'personal' }) })}</EnglishMessages>)
    await ui.screen.findByRole('heading', { name: 'Édition personnelle' })
    // The price shows in the facts and again in the Release pending row.
    assert.ok(ui.screen.getAllByText('₩82,000').length >= 1)
    assert.ok(ui.screen.getByText('Includes the book, one membership token and one free Member Ticket.'))
    assert.ok(ui.screen.getByText('Personalised with your membership. No refunds.'))
    assert.ok(ui.screen.getByText('Release pending'))
    // One way back to the product: the page's top link, not a second copy inside the summary.
    assert.deepEqual(ui.screen.getAllByRole('link', { name: 'Product details' }).map((link) => link.getAttribute('href')), ['/shop/products/personal'])
    // One way to Help too: the page's top "Visit Help", not a second link inside the summary.
    assert.equal(ui.screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/help').length, 1)
    assert.equal(ui.screen.queryByRole('button', { name: 'Pay by card' }) === null, true)
    assert.equal(ui.screen.queryByRole('textbox', { name: 'Email address' }) === null, true)
    assert.equal(calls.some(({ path }) => path.startsWith('/api/carts') || path.startsWith('/api/payments')), false)
    ui.cleanup()
    // An unknown or legacy ID is not a native product: nothing is shown as for sale.
    ui.render(<EnglishMessages>{await CheckoutPage({ searchParams: Promise.resolve({ product: 'product-1' }) })}</EnglishMessages>)
    await ui.screen.findByText('Purchasing is not open.')
    assert.equal(ui.screen.queryByText('₩82,000') === null && ui.screen.queryByRole('button', { name: 'Pay by card' }) === null, true)
  } finally {
    setCheckoutPayload({})
  }
})

test('the checkout route gates private checkout on fresh membership and retains same-account delivery on restoration', async () => {
  const { default: CheckoutPage } = await import('@/app/(site)/shop/checkout/page')
  const phoneUnbound = { ...activeMember, phoneBound: false, member: false }
  membership = { ...phoneUnbound, authenticated: false, emailVerified: false, phoneBindingAuth: 'anonymous' }
  ui.render(<EnglishMessages>{await CheckoutPage()}</EnglishMessages>)
  const delivery = () => ui.screen.queryByRole('textbox', { name: 'Recipient name' })
  const assertCheckoutBlocked = () => {
    assert.equal(delivery() === null, true)
    assert.equal(ui.screen.queryByRole('button', { name: 'Pay by card' }) === null, true)
  }
  const assertNoCommerceReads = () => {
    assert.equal(calls.some(({ path }) => path === '/api/member/status'), true)
    assert.deepEqual(calls.filter(({ path }) => !['/api/member/status', '/api/member/identify'].includes(path)), [])
  }
  const refresh = async (status: MemberStatus) => {
    membership = status
    const reads = calls.filter(({ path }) => path === '/api/member/status').length
    await ui.act(async () => { dom.window.dispatchEvent(new dom.window.Event('focus')) })
    await ui.waitFor(() => assert.ok(calls.filter(({ path }) => path === '/api/member/status').length > reads))
  }

  await ui.screen.findByRole('textbox', { name: 'Email address' })
  await ui.waitFor(assertNoCommerceReads)
  assertCheckoutBlocked()
  // One step bar for the whole checkout: the same node from account to checkout and back; a hidden retained session never moves it.
  const bars = () => ui.screen.getAllByRole('progressbar')
  const bar = bars()[0]!
  const step = () => bar.getAttribute('aria-label')
  assert.equal(bars().length, 1)
  assert.equal(step(), 'Step 1 of 3: Account')
  await refresh(phoneUnbound)
  await ui.screen.findByRole('heading', { name: 'Verify your phone to finish' })
  assertCheckoutBlocked()
  assertNoCommerceReads()

  await refresh(activeMember)
  const recipient = await ui.screen.findByRole<HTMLInputElement>('textbox', { name: 'Recipient name' })
  await ui.waitFor(() => assert.equal(step(), 'Step 2 of 3: Delivery'))
  assert.equal(bars().length === 1 && bars()[0] === bar, true)
  ui.fireEvent.change(recipient, { target: { value: 'Same-account delivery draft' } })
  assert.equal(recipient.value, 'Same-account delivery draft')
  await refresh(phoneUnbound)
  await ui.screen.findByRole('heading', { name: 'Verify your phone to finish' })
  assertCheckoutBlocked()
  assert.equal(recipient.isConnected, true)
  await ui.waitFor(() => assert.equal(step(), 'Step 1 of 3: Account'))
  assert.equal(bars().length === 1 && bars()[0] === bar, true)

  await refresh(activeMember)
  const restored = await ui.screen.findByRole<HTMLInputElement>('textbox', { name: 'Recipient name' })
  assert.equal(restored === recipient, true)
  assert.equal(restored.value, 'Same-account delivery draft')
  assert.equal(calls.some((call) => call.path.endsWith('/initiate')), false)
})

test('a verified failed attempt is retired only after an explicit confirm, unlocks checkout and never opens payment', async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  discovered = [discoveredIntent()]
  resumeOutcome = 'retirable'
  let opens = 0
  render(async () => { opens++; return undefined })
  ui.fireEvent.click(await enabledResume())
  const cancel = await ui.screen.findByRole('button', { name: 'Cancel this attempt' })
  assert.equal(calls.some((call) => call.path.endsWith('/retire')), false)
  ui.fireEvent.click(cancel)
  // Cancelling is irreversible, so the button asks first; nothing is retired until the confirm press.
  assert.equal((await ui.screen.findAllByText('Cancel this attempt?')).length > 0, true)
  assert.equal(calls.some((call) => call.path.endsWith('/retire')), false)
  await ui.act(() => new Promise((resolve) => setTimeout(resolve, 320))) // past ConfirmMorph's 280 ms double-tap guard
  discovered = [] // once retired, discovery no longer lists it
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: 'Cancel attempt' }))
  const pay = await ui.screen.findByRole('button', { name: 'Pay by card' })
  await ui.waitFor(() => assert.equal((pay as HTMLButtonElement).disabled, false))
  assert.equal(dom.window.sessionStorage.getItem(storageKey), null)
  assert.deepEqual(calls.find((call) => call.path.endsWith('/retire'))?.body, { transactionID, paymentID })
  assert.equal(opens, 0)
  assert.equal(calls.some((call) => call.path.endsWith('/initiate')), false)
})

for (const failure of ['unavailable', 'mismatch']) test(`retirement ${failure} preserves the retained attempt`, async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  discovered = [discoveredIntent()]
  resumeOutcome = 'retirable'
  if (failure === 'unavailable') retirementStatus = 409
  else retiredTransactionID = orderID
  render(async () => undefined, true)
  ui.fireEvent.click(await enabledResume())
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: 'Cancel this attempt' }))
  await ui.act(() => new Promise((resolve) => setTimeout(resolve, 320))) // past ConfirmMorph's 280 ms double-tap guard
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: 'Cancel attempt' }))
  // The failure is a toast; the confirm shows its error face instead of "Cancelled".
  assert.equal((await ui.screen.findAllByText('Payment could not be confirmed. Your attempt is retained; check it before trying again.')).length > 0, true)
  assert.equal((await ui.screen.findAllByText('Couldn’t cancel')).length > 0, true)
  assert.deepEqual(JSON.parse(dom.window.sessionStorage.getItem(storageKey)!), intent)
})
after(() => {
  cssHook?.deregister()
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
// Auth's recovery rule: a saved attempt is cleared only on server-confirmed terminal evidence for the same pair, never on a
// lost response or an unresolved or review result (e.g. a retire that landed before the tab reloaded).
for (const [outcome, cleared] of [['local-terminal', true], ['local-terminal:failed', true], ['local-unresolved', false], ['review-required', false], ['lost', false]] as const) {
  test(`a saved attempt is cleared only when the server reports it terminal (${outcome})`, async () => {
    dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
    resultOutcome = outcome
    render(async () => undefined)
    await ui.waitFor(() => assert.equal(calls.some((call) => call.path.endsWith('/result')), true))
    if (cleared) {
      await ui.waitFor(() => assert.equal(dom.window.sessionStorage.getItem(storageKey), null))
      await ui.screen.findByRole('button', { name: 'Pay by card' })
      // The message follows the server's status, not always "cancelled".
      await ui.screen.findByText(outcome === 'local-terminal:failed' ? 'This payment didn’t go through. You can choose payment again.' : 'Attempt cancelled. You can choose payment again.')
    } else {
      await ui.act(() => new Promise((resolve) => setTimeout(resolve, 50)))
      assert.deepEqual(JSON.parse(dom.window.sessionStorage.getItem(storageKey)!), intent)
      assert.equal(ui.screen.queryByRole('button', { name: 'Pay by card' }) === null, true)
    }
  })
}

test('a terminal answer for an older attempt never clears or announces over a newer saved attempt', async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  resultOutcome = 'stale'
  render(async () => undefined)
  await ui.waitFor(() => assert.equal(calls.some((call) => call.path.endsWith('/result')), true))
  await ui.act(() => new Promise((resolve) => setTimeout(resolve, 50)))
  assert.deepEqual(JSON.parse(dom.window.sessionStorage.getItem(storageKey)!), newerIntent)
  assert.equal(ui.screen.queryByText('Attempt cancelled. You can choose payment again.') === null, true)
})

test('recovery rows show the order name the server froze for each attempt', async () => {
  discovered = [{ transactionID, paymentID, cartID: 'cart-1', productID: 'product-1', quantity: 1, totalAmount: 82000, currency: 'KRW', status: 'pending', reviewHold: false, orderName: 'PREVIEW Édition personnelle' , refundTerms: { kind: 'none', reason: 'personalised-edition' } }]
  render(async () => undefined, true)
  await ui.screen.findByText('PREVIEW Édition personnelle')
  // Each recovery row says what refund rule that attempt was bought under (Review-B r2: shop/payment resume included).
  assert.ok(ui.screen.getByText('Personalised with your membership. No refunds.'))
})

function render(sdk: typeof requestPayment, recovery = false, guestQuote?: import("@/lib/commerce/contracts").GuestCheckoutQuote, offerTicketEmailConsent = false) {
  ui.render(<EnglishMessages><Provider><Payment shippingAddress={address} recovery={recovery} guestQuote={guestQuote} offerTicketEmailConsent={offerTicketEmailConsent} requestPayment={sdk} /></Provider></EnglishMessages>)
}

for (const consent of [false, true]) {
  test(`ticket email choice is optional and only explicit consent is submitted (${consent})`, async () => {
    preparationOutcome = 'status-only'
    render(async () => { throw new Error("SDK must not open") }, false, undefined, true)
    const checkbox = ui.screen.getByRole('checkbox', { name: /share my checkout email with Unlock/i }) as HTMLInputElement
    assert.equal(checkbox.checked, false)
    if (consent) ui.fireEvent.click(checkbox)
    const pay = await ui.screen.findByRole('button', { name: 'Pay by card' })
    await ui.waitFor(() => assert.equal((pay as HTMLButtonElement).disabled, false))
    ui.fireEvent.click(pay)
    await ui.screen.findByText('An existing attempt was found. Check its status before continuing.')
    const body = calls.find(call => call.path.endsWith('/initiate'))?.body
    assert.ok(body)
    assert.equal(body.ticketEmailConsent, consent ? "unlock-ticket-email-v1" : undefined)
    assert.equal(Object.hasOwn(body, "email"), false)
  })
}

test('a stale Guest quote never opens the SDK or retains a rejected fresh attempt', async () => {
  preparationOutcome = 'guest-quote-changed'
  let opens = 0
  const quote = { productID: orderID, quantity: 2, totalAmount: 20_000, refundTerms: { kind: 'until', cutoffAt: '2026-12-08T01:00:00.000Z' } } as const
  render(async () => { opens++; return undefined }, false, quote)
  const pay = await ui.screen.findByRole('button', { name: 'Pay by card' })
  await ui.waitFor(() => assert.equal((pay as HTMLButtonElement).disabled, false))
  ui.fireEvent.click(pay)
  await ui.screen.findByText('Your guest ticket selection or price changed. Reload and review the total before paying.')
  assert.deepEqual(calls.find(call => call.path.endsWith('/initiate'))?.body.guestQuote, quote)
  assert.equal(opens, 0)
  assert.equal(dom.window.sessionStorage.getItem(storageKey), null)
})

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
  discovered = [discoveredIntent()]
  resumeOutcome = 'resumable'
  render(async () => {
    dom.window.sessionStorage.setItem(storageKey, JSON.stringify(newer))
    return undefined
  }, true)
  const resume = await ui.screen.findByRole('button', { name: 'Resume same payment' })
  await ui.waitFor(() => assert.equal((resume as HTMLButtonElement).disabled, false))
  ui.fireEvent.click(resume)
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
  discovered = [discoveredIntent()]
  let opens = 0
  const ids: string[] = []
  render(async (request) => { opens++; ids.push(request.paymentId); return undefined }, true)
  const resume = await ui.screen.findByRole('button', { name: 'Resume same payment' })
  await ui.waitFor(() => assert.equal((resume as HTMLButtonElement).disabled, false))
  // The saved attempt's own refund terms are on screen before Resume can reopen the payment window (Review-B r2).
  const terms = await ui.screen.findByText(/^Refundable until .+ \(Seoul time\)\.$/)
  assert.equal(terms.compareDocumentPosition(resume) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING, dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
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
  discovered = [{ transactionID, paymentID, cartID: 'cart-1', productID: 'product-1', quantity: 1, totalAmount: 10000, currency: 'KRW', status: 'pending', reviewHold: false , refundTerms: { kind: 'none', reason: 'personalised-edition' } }]
  let opens = 0
  render(async () => { opens++; return undefined }, true)
  ui.fireEvent.click(await ui.screen.findByRole('button', { name: /10,000 KRW.*View attempt/ }))
  await ui.screen.findByRole('button', { name: 'Check payment' })
  assert.equal(JSON.parse(dom.window.sessionStorage.getItem(storageKey)!).transactionID, transactionID)
  assert.equal(opens, 0)
  assert.equal(calls.some((call) => call.path.endsWith('/confirm-order') || call.path.endsWith('/initiate')), false)
})

test('a resolution conflict is manual review only, never resumable or retirable', async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  discovered = [{ transactionID, paymentID, cartID: 'cart-1', productID: 'product-1', quantity: 1, totalAmount: 10000, currency: 'KRW', status: 'cancelled', reviewHold: false, resolutionConflict: true , refundTerms: { kind: 'none', reason: 'personalised-edition' } }]
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

test('without the saved attempt\'s refund terms, Resume stays off and says why; Check stays available', async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  resumeOutcome = 'resumable'
  let opens = 0
  render(async () => { opens++; return undefined }, true)
  await ui.screen.findByText("This attempt's refund terms can't be confirmed, so it can't be resumed. Check payment status instead.")
  assert.equal((ui.screen.getByRole('button', { name: 'Resume same payment' }) as HTMLButtonElement).disabled, true)
  await ui.waitFor(() => assert.equal((ui.screen.getByRole('button', { name: 'Check payment' }) as HTMLButtonElement).disabled, false))
  assert.equal(opens, 0)
  assert.equal(calls.some((call) => call.path.endsWith('/resume')), false)
})

test('resume sends the terms on screen; when the server finds others it shows them and opens nothing until a new press', async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  discovered = [discoveredIntent()]
  resumeOutcome = 'terms-changed'
  serverTerms = { kind: 'closed', cutoffAt: '2026-12-08T01:00:00.000Z' }
  let opens = 0
  render(async () => { opens++; return undefined }, true)
  ui.fireEvent.click(await enabledResume())
  // The cutoff passed while the page was open: the new terms replace the old ones before anything can open.
  await ui.screen.findByText('The refund terms changed. Check them, then resume again.')
  assert.ok(await ui.screen.findByText(/^Refunds for this event closed .+ \(Seoul time\)\.$/))
  assert.equal(ui.screen.queryByText(/^Refundable until/) === null, true)
  assert.equal(opens, 0)
  assert.deepEqual(calls.find((call) => call.path.endsWith('/resume'))?.body.refundTerms, { kind: 'until', cutoffAt: '2026-12-08T01:00:00.000Z' })
  // The next press sends the terms now on screen; with them current, the same payment opens once.
  resumeOutcome = 'resumable'
  ui.fireEvent.click(await enabledResume())
  await ui.screen.findByText('Payment confirmed. Your order has been received.')
  assert.equal(opens, 1)
  assert.deepEqual(calls.filter((call) => call.path.endsWith('/resume')).at(-1)?.body.refundTerms, serverTerms)
})

test('a guest Pay with stale refund terms opens nothing, hands the page the new terms and asks for a new press', async () => {
  preparationOutcome = 'guest-quote-changed'
  serverTerms = { kind: 'until', cutoffAt: '2026-12-09T01:00:00.000Z' }
  const changed: unknown[] = []
  let opens = 0
  const quote = { productID: orderID, quantity: 1, totalAmount: 10_000, refundTerms: { kind: 'until', cutoffAt: '2026-12-08T01:00:00.000Z' } } as const
  ui.render(<EnglishMessages><Provider><Payment shippingAddress={address} guestQuote={quote} onRefundTermsChanged={(terms) => changed.push(terms)}
    requestPayment={async () => { opens++; return undefined }} /></Provider></EnglishMessages>)
  const pay = await ui.screen.findByRole('button', { name: 'Pay by card' })
  await ui.waitFor(() => assert.equal((pay as HTMLButtonElement).disabled, false))
  ui.fireEvent.click(pay)
  // The event start moved: the server's terms differ from the quote's. Nothing opens; the page gets the new terms.
  await ui.screen.findByText('The refund terms changed. Check them, then pay again.')
  assert.deepEqual(changed, [serverTerms])
  assert.equal(opens, 0)
  assert.deepEqual(calls.find((call) => call.path.endsWith('/initiate'))?.body.guestQuote, quote)
  assert.equal(dom.window.sessionStorage.getItem(storageKey), null)
})

test('a closed guest event says so on the saved attempt before Resume', async () => {
  dom.window.sessionStorage.setItem(storageKey, JSON.stringify(intent))
  discovered = [discoveredIntent({ kind: 'closed', cutoffAt: '2026-11-20T01:00:00.000Z' })]
  render(async () => undefined, true)
  assert.ok(await ui.screen.findByText(/^Refunds for this event closed .+ \(Seoul time\)\.$/))
})

test('guest tickets state the event refund cutoff before Pay, or plainly that refunds have closed', async () => {
  const { GuestTicketPurchase } = await import('@/components/commerce/guest-ticket-purchase')
  const cases = [[{ kind: 'until', cutoffAt: '2026-12-08T01:00:00.000Z' }, /^Refundable until .+ \(Seoul time\)\.$/],
    [{ kind: 'closed', cutoffAt: '2026-11-20T01:00:00.000Z' }, /^Refunds for this event closed .+ \(Seoul time\)\.$/],
    [{ kind: 'closed', cutoffAt: null }, /^Refunds for this event have closed\.$/]] as const
  for (const [refundTerms, text] of cases) {
    ui.render(<EnglishMessages><GuestTicketPurchase customerID="customer-1" productID="product-1" title="Guest ticket" priceKRW={10000}
      available={1} limit={1} locale="en" refundTerms={refundTerms} /></EnglishMessages>)
    const line = await ui.screen.findByText(text)
    const pay = await ui.screen.findByRole('button', { name: 'Pay by card' })
    assert.equal(line.compareDocumentPosition(pay) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING, dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
    assert.match(line.className, /\btext-sm\b/); assert.match(line.className, /\btext-foreground\b/)
    ui.cleanup()
  }
})
