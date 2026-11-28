import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

test('canonical Payload payment endpoints have no obsolete static Next route shadow', () => {
  // The canonical endpoints (initiate, confirm-order, resume, retire, webhooks) and the retired names alike.
  for (const action of ['initiate', 'confirm-order', 'resume', 'retire', 'webhooks', 'prepare', 'complete', 'webhook']) {
    for (const base of ['../../../src/app/api/payments/portone/', '../../../src/app/(payload)/api/payments/portone/']) {
      assert.equal(existsSync(new URL(`${base}${action}/route.ts`, import.meta.url)), false, base + action)
    }
  }
  const route = readFileSync(new URL('../../../src/app/(payload)/api/[...slug]/route.ts', import.meta.url), 'utf8')
  // The catch-all hands every POST to Payload's own REST_POST; the cart wrappers only bound and mark cart requests.
  assert.match(route, /^export const POST = privateCartResponse\(boundCartWrites\(REST_POST\(configPromise\)\)\);$/m)
  assert.equal(route.match(/REST_POST\(/g)?.length, 1)
  const runtime = readFileSync(new URL('../../../src/lib/tickets/portone/runtime.ts', import.meta.url), 'utf8')
  assert.equal(runtime.includes('createPortOneHandlers'), false)
})
