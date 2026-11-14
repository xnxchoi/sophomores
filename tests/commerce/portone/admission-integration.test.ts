import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { postgresAdapter } from '@payloadcms/db-postgres'
import type { Endpoint, PayloadRequest } from 'payload'
import { commercePlugin } from '../../../src/lib/commerce/ecommerce'
import { withSignedRiskEvidence, accountedProviderGet } from '../../../src/lib/commerce/portone/accounting'

test('pending/result GET bypasses and unrelated endpoint behavior are unchanged', async () => {
  let called = 0
  const endpoints: Endpoint[] = [
    { path: '/payments/test/pending', method: 'get', handler: () => { called++; return Response.json({ marker: 'pending' }) } },
    { path: '/payments/portone/result', method: 'get', handler: () => { called++; return Response.json({ marker: 'result' }) } },
    { path: '/payments/test/webhooks', method: 'post', handler: () => { called++; return Response.json({ marker: 'webhook' }) } },
    { path: '/unrelated', method: 'get', handler: () => { called++; return Response.json({ marker: 'unrelated' }) } },
  ]
  const config = await commercePlugin({ collections: [], endpoints, secret: randomUUID(), db: postgresAdapter({ pool: {} }) })
  for (const path of endpoints.map(endpoint => endpoint.path)) {
    const endpoint = config.endpoints!.find(endpoint => endpoint.path === path)!
    assert.equal((await endpoint.handler({} as PayloadRequest)).status, 200)
  }
  assert.equal(called, 4)
  const carts = config.collections!.find(collection => collection.slug === 'carts')!
  assert.equal((carts.endpoints as Endpoint[]).some(endpoint => endpoint.path.includes('merge')), false)
  const paymentPaths = config.endpoints!.filter(endpoint => endpoint.path.startsWith('/payments/portone/')).map(endpoint => endpoint.method + ' ' + endpoint.path).sort()
  assert.deepEqual(paymentPaths, ['get /payments/portone/pending', 'get /payments/portone/result', 'get /payments/portone/result', 'post /payments/portone/confirm-order', 'post /payments/portone/initiate', 'post /payments/portone/resume', 'post /payments/portone/retire', 'post /payments/portone/webhooks'])
})

test('forged context cannot grant risk budget or dispatch an unaccounted transport', async () => {
  const req = { context: { signedRisk: true }, data: { reserve: 4 } } as unknown as PayloadRequest
  await assert.rejects(withSignedRiskEvidence(req, { id: 'forged', type: 'Transaction.Cancelled' }, async () => undefined))
  let gets = 0
  await assert.rejects(accountedProviderGet(req, 'a'.repeat(32), async () => { gets++; return {} }))
  assert.equal(gets, 0)
})
