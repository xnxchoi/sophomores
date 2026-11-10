import { EnglishMessages } from "../../fixtures/english-messages";
import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { JSDOM } from 'jsdom'

let dom: JSDOM
let ui: typeof import('@testing-library/react/pure')
let Admissions: typeof import('../../../src/components/commerce/order-admissions').OrderAdmissions
let Claim: typeof import('../../../src/components/commerce/invitation-claim').ClaimInvitation
let Invitation: typeof import('../../../src/components/commerce/invitation-claim').InvitationClaim
let MemberAuthProviders: typeof import('../../member-auth/fixtures/providers').MemberAuthProviders
const previous = new Map<string, PropertyDescriptor | undefined>()
let actions: Record<string, unknown>[] = []
let claimed = false
let admissionsUnavailable = false
let claimResponse: Promise<Response> | undefined
let requests: { path: string; method: string; credentials?: RequestCredentials; cache?: RequestCache; headers: Headers }[] = []
const capabilities = { emailOtp: true, magicLink: false, google: false, passkey: false }
const orderID = '123e4567-e89b-42d3-a456-426614174001'
const admissionID = '123e4567-e89b-42d3-a456-426614174002'
const token = 'a'.repeat(43)
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/shop/orders/' + orderID, pretendToBeVisual: true })
  for (const key of ['window', 'self', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Element', 'Node', 'NodeFilter', 'NodeList', 'MutationObserver', 'CustomEvent', 'Event', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    const value = key === 'window' || key === 'self' ? dom.window : dom.window[key as keyof typeof dom.window]
    Object.defineProperty(globalThis, key, { value: typeof value === 'function' && ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'].includes(key) ? value.bind(dom.window) : value, configurable: true, writable: true })
  }
  dom.window.matchMedia = () => ({ matches: false, media: '', onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false } })
  dom.window.scrollTo = () => {}
  dom.window.document.elementFromPoint = () => null
  Object.defineProperty(dom.window.HTMLElement.prototype, 'scrollIntoView', { value() {} })
  for (const [key, value] of Object.entries({ IS_REACT_ACT_ENVIRONMENT: true, ResizeObserver: class { observe() {} unobserve() {} disconnect() {} }, fetch: async (input: string | URL | Request, options?: RequestInit) => {
    const path = new URL(String(input), 'http://localhost').pathname
    requests.push({ path: String(input), method: options?.method ?? 'GET', credentials: options?.credentials, cache: options?.cache, headers: new Headers(options?.headers) })
    if (path === '/api/member/status') return Response.json({ success: true, data: { authenticated: true, phoneBindingAuth: 'ready', emailVerified: true, phoneBound: true, member: true, capabilities } })
    if (path === '/api/users/me') return Response.json({ user: { id: 'guest-member', collection: 'users', cart: { docs: [] } } })
    if (path === '/api/addresses') return Response.json({ docs: [] })
    if (path.endsWith('/admissions')) return admissionsUnavailable ? Response.json({}, { status: 503 }) : Response.json([{ admissionID, unit: 1, name: 'Guest', status: claimed ? 'claimed' : 'available', claimed, reviewRequired: false }])
    if (path === '/api/commerce/guest-operations') {
      const action = JSON.parse(String(options?.body)); actions.push(action)
      if (action.action === 'claim' && claimResponse) return claimResponse
      return Response.json(action.action === 'issue-claim' ? { token, expiresAt: '2099-01-01T00:00:00Z' } : action.action === 'claim' ? { admissionID } : { success: true })
    }
    throw new Error('Unexpected guest UI request')
  } })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  }
  ui = await import('@testing-library/react/pure')
  ui.configure({ getElementError: (message) => new Error(message ?? 'Element not found') })
  Admissions = (await import('../../../src/components/commerce/order-admissions')).OrderAdmissions
  Claim = (await import('../../../src/components/commerce/invitation-claim')).ClaimInvitation
  Invitation = (await import('../../../src/components/commerce/invitation-claim')).InvitationClaim
  MemberAuthProviders = (await import('../../member-auth/fixtures/providers')).MemberAuthProviders
})
afterEach(() => {
  ui.cleanup(); actions = []; requests = []; claimed = false; admissionsUnavailable = false; claimResponse = undefined
  dom.window.sessionStorage.clear(); dom.window.localStorage.clear()
  dom.window.history.replaceState(null, '', '/shop/orders/' + orderID)
})
after(() => {
  dom.window.close()
  for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key) }
})

test('buyer can name an admission without guest signup and explicitly create a fragment-only private claim link', async () => {
  ui.render(<EnglishMessages><Admissions orderID={orderID} /></EnglishMessages>)
  const name = await ui.screen.findByRole('textbox', { name: 'Guest name for admission 1' })
  ui.fireEvent.change(name, { target: { value: 'Named visitor' } })
  ui.fireEvent.click(ui.screen.getByRole('button', { name: 'Save guest name' }))
  await ui.screen.findByText('Guest name saved.')
  assert.deepEqual(actions[0], { action: 'assign-name', admissionID, guestName: 'Named visitor' })
  assert.equal(actions.some((action) => action.action === 'issue-claim'), false)
  ui.fireEvent.click(ui.screen.getByRole('button', { name: 'Create private claim link' }))
  const link = await ui.screen.findByRole('textbox', { name: 'Private guest claim link' }) as HTMLInputElement
  assert.equal(link.value, 'http://localhost/shop/invitations/claim#token=' + token)
  assert.equal(new URL(link.value).search, '')
  assert.equal(dom.window.sessionStorage.length, 0)
})

test('claimed admissions expose neither buyer name editing nor another claim token', async () => {
  claimed = true
  ui.render(<EnglishMessages><Admissions orderID={orderID} /></EnglishMessages>)
  const name = await ui.screen.findByRole('textbox', { name: 'Guest name for admission 1' }) as HTMLInputElement
  assert.equal(name.disabled, true)
  assert.equal(ui.screen.queryByRole('button', { name: 'Save guest name' }) === null, true)
  assert.equal(ui.screen.queryByRole('button', { name: 'Create private claim link' }) === null, true)
})

test('optional guest-package claim is explicit and sends bearer only in the canonical POST body', async () => {
  let completed = 0
  ui.render(<EnglishMessages><Claim token={token} onClaimed={() => { completed++ }} /></EnglishMessages>)
  assert.equal(actions.length, 0)
  const claim = ui.screen.getByRole('button', { name: 'Claim my guest package' })
  ui.fireEvent.click(claim); ui.fireEvent.click(claim)
  await ui.waitFor(() => assert.equal(completed, 1))
  assert.deepEqual(actions, [{ action: 'claim', token }])
  assert.equal(dom.window.location.href.includes(token), false)
  assert.equal(dom.window.sessionStorage.length, 0)
})

test('admissions load failure names the purchasing account and retries only when asked', async () => {
  admissionsUnavailable = true
  ui.render(<EnglishMessages><Admissions orderID={orderID} /></EnglishMessages>)
  await ui.screen.findByText('We couldn’t load these admissions. Check that you’re signed in with the purchasing account, then try again.')
  assert.equal(requests.length, 1)
  assert.equal(actions.length, 0)
  admissionsUnavailable = false
  ui.fireEvent.click(ui.screen.getByRole('button', { name: 'Retry admissions' }))
  await ui.screen.findByRole('textbox', { name: 'Guest name for admission 1' })
  assert.equal(requests.length, 2)
  assert.equal(actions.length, 0)
})

for (const outcome of ['success', 'http failure', 'network failure', 'malformed success'] as const) {
  test(`gift exploration is success-only through a real invitation claim: ${outcome}`, async () => {
    let respond!: (response: Response) => void
    let reject!: (error: Error) => void
    claimResponse = new Promise<Response>((resolve, rejectResponse) => { respond = resolve; reject = rejectResponse })
    dom.window.history.replaceState(null, '', '/shop/invitations/claim#token=' + token)
    ui.render(<Invitation initialCapabilities={capabilities} />, { wrapper: MemberAuthProviders })
    assert.equal(ui.screen.queryByRole('link', { name: 'Explore Sophomores' }) === null, true)
    const claim = await ui.screen.findByRole('button', { name: 'Claim my guest package' }) as HTMLButtonElement
    await ui.waitFor(() => assert.equal(requests.some((request) => new URL(request.path, 'http://localhost').pathname === '/api/addresses'), true))
    assert.equal(dom.window.location.hash, '')
    assert.equal(actions.length, 0, 'loading the invitation never claims it')
    const beforeClaim = requests.length
    ui.fireEvent.click(claim); ui.fireEvent.click(claim)
    assert.equal(claim.disabled, true)
    assert.equal(ui.screen.queryByRole('link', { name: 'Explore Sophomores' }) === null, true)
    assert.deepEqual(actions, [{ action: 'claim', token }])
    await ui.act(async () => {
      if (outcome === 'network failure') reject(new Error('Synthetic connection failure'))
      else respond(outcome === 'success' ? Response.json({ admissionID })
        : outcome === 'http failure' ? Response.json({}, { status: 409 }) : Response.json({ admissionID: 'not-an-admission' }))
    })
    if (outcome === 'success') {
      await ui.screen.findByRole('heading', { name: 'You’ve claimed your gift. Welcome to Sophomores.' })
      const explore = ui.screen.getByRole('link', { name: 'Explore Sophomores' }) as HTMLAnchorElement
      assert.equal(explore.getAttribute('href'), '/')
      assert.equal(ui.screen.queryByRole('button', { name: 'Claim my guest package' }) === null, true)
    } else {
      await ui.screen.findByText('The invitation could not be claimed. It may be expired, already claimed, or your account may already have a package for this event. Contact the buyer if needed.')
      assert.equal(ui.screen.queryByRole('link', { name: 'Explore Sophomores' }) === null, true)
      assert.equal(ui.screen.queryByRole('heading', { name: 'You’ve claimed your gift. Welcome to Sophomores.' }) === null, true)
      assert.equal(claim.disabled, false)
    }
    assert.equal(requests.length, beforeClaim + 1, 'claim result and exploration add no background requests')
    const claimRequest = requests.at(-1)!
    assert.equal(claimRequest.path, '/api/commerce/guest-operations')
    assert.equal(claimRequest.method, 'POST')
    assert.equal(claimRequest.credentials, 'include')
    assert.equal(claimRequest.cache, 'no-store')
    assert.equal(claimRequest.headers.get('Content-Type'), 'application/json')
    assert.equal(requests.some((request) => request.path.includes(token) || [...request.headers.values()].some((value) => value.includes(token))), false)
    assert.equal(dom.window.document.body.innerHTML.includes(token), false)
    assert.equal(dom.window.location.href.includes(token), false)
    assert.equal(dom.window.sessionStorage.length, 0)
    assert.equal(dom.window.localStorage.length, 0)
  })
}

for (const fragment of ['', '#token=invalid', '#token=' + token + '&extra=value']) {
  test(`invalid invitation does not reveal gift exploration or send requests (${fragment ? 'malformed fragment' : 'missing fragment'})`, async () => {
    dom.window.history.replaceState(null, '', '/shop/invitations/claim' + fragment)
    ui.render(<Invitation initialCapabilities={capabilities} />, { wrapper: MemberAuthProviders })
    await ui.screen.findByText('This invitation link is missing or invalid. Ask the buyer for a private claim link.')
    assert.equal(ui.screen.queryByRole('link', { name: 'Explore Sophomores' }) === null, true)
    assert.equal(ui.screen.queryByRole('button', { name: 'Claim my guest package' }) === null, true)
    assert.equal(requests.length, 0)
    assert.equal(dom.window.location.hash, '')
  })
}
