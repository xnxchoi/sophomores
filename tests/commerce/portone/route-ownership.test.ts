import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

test('canonical Payload payment endpoints have no obsolete static Next route shadow', () => {
  for (const action of ['prepare', 'complete', 'resume', 'webhook']) {
    assert.equal(existsSync(new URL(`../../../src/app/api/payments/portone/${action}/route.ts`, import.meta.url)), false, action)
  }
  const route = readFileSync(new URL('../../../src/app/(payload)/api/[...slug]/route.ts', import.meta.url), 'utf8')
  assert.equal(route.includes('POST = REST_POST(configPromise)'), true)
  const runtime = readFileSync(new URL('../../../src/lib/tickets/portone/runtime.ts', import.meta.url), 'utf8')
  assert.equal(runtime.includes('createPortOneHandlers'), false)
})
