import { EnglishMessages } from "../../fixtures/english-messages";
import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { JSDOM } from 'jsdom'

let dom: JSDOM
let ui: typeof import('@testing-library/react/pure')
let Admissions: typeof import('../../../src/components/commerce/order-admissions').OrderAdmissions
let Claim: typeof import('../../../src/components/commerce/invitation-claim').ClaimInvitation
const previous = new Map<string, PropertyDescriptor | undefined>()
let actions: Record<string, unknown>[] = []
let claimed = false
const orderID = '123e4567-e89b-42d3-a456-426614174001'
const admissionID = '123e4567-e89b-42d3-a456-426614174002'
const token = 'a'.repeat(43)
before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/shop/orders/' + orderID, pretendToBeVisual: true })
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'MutationObserver', 'Event']) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { value: key === 'window' ? dom.window : dom.window[key as keyof typeof dom.window], configurable: true, writable: true })
  }
  for (const [key, value] of Object.entries({ IS_REACT_ACT_ENVIRONMENT: true, fetch: async (input: string, options?: RequestInit) => {
    if (input.endsWith('/admissions')) return Response.json([{ admissionID, unit: 1, name: 'Guest', status: claimed ? 'claimed' : 'available', claimed, reviewRequired: false }])
    if (input === '/api/commerce/guest-operations') {
      const action = JSON.parse(String(options?.body)); actions.push(action)
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
})
afterEach(() => { ui.cleanup(); actions = []; claimed = false })
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
