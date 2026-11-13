import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readConfirmTransport } from '../../../src/lib/commerce/portone/confirm-transport'
const transactionID = '91b6495b-479b-4306-98f1-83b729807aea'
const orderID = '91b6495b-479b-4306-98f1-83b729807aeb'
const expected = { transactionID, orderID }
const read = (response: Response, isCurrent = () => true) => readConfirmTransport(async () => response, expected, isCurrent)

test('native transport distinguishes missing headers from lost body after successful headers', async () => {
  assert.deepEqual(await readConfirmTransport(async () => { throw new TypeError('network') }, expected), { kind: 'transport-unknown', phase: 'headers' })
  const response = new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('disconnect')) } }), { status: 200 })
  assert.deepEqual(await read(response), { kind: 'transport-unknown', phase: 'body' })
  const aborted = new Response(new ReadableStream({ start(controller) { controller.error(new DOMException('aborted', 'AbortError')) } }))
  assert.deepEqual(await read(aborted), { kind: 'transport-unknown', phase: 'body' })
})

test('consumed invalid JSON, schema and identity receipts have distinct integrity reasons', async () => {
  const broken = new Response('{', { status: 200 })
  assert.deepEqual(await read(broken), { kind: 'receipt-integrity', reason: 'json' }); assert.equal(broken.bodyUsed, true)
  assert.deepEqual(await read(Response.json({ orderID })), { kind: 'receipt-integrity', reason: 'schema' })
  assert.deepEqual(await read(Response.json({ orderID, transactionID: orderID })), { kind: 'receipt-integrity', reason: 'identity' })
  assert.deepEqual(await read(Response.json({ orderID: transactionID, transactionID })), { kind: 'receipt-integrity', reason: 'identity' })
})

test('matching receipt still requires canonical local result; HTTP alone never asserts paid or failed', async () => {
  assert.deepEqual(await read(Response.json({ orderID, transactionID, message: 'ok' })), { kind: 'confirmation-receipt', orderID, transactionID })
  for (const status of [200, 400, 404, 409, 500, 503]) {
    const data = await read(Response.json({ message: 'not proof' }, { status }))
    assert.equal(data.kind, 'receipt-integrity')
  }
  assert.deepEqual(await read(Response.json({ orderID, transactionID }, { status: 500 })), { kind: 'receipt-integrity', reason: 'status' })
})

test('official error envelope maps auth/rate/authority stops but never classifies failed payment', async () => {
  for (const [status, kind] of [[401, 'authentication-required'], [403, 'authentication-required'], [429, 'rate-stop'], [409, 'authority-stop'], [503, 'completion-unknown']] as const) {
    const result = await read(Response.json({ success: false, error: { code: 'COMMERCE_REJECTED', message: 'hidden' } }, { status }))
    assert.deepEqual(result, { kind })
  }
})

test('generation is checked after headers and body, on rejections and before publishing', async () => {
  let current = false
  assert.deepEqual(await read(Response.json({ orderID, transactionID }), () => current), { kind: 'stale' })
  current = true
  const response = new Response(new ReadableStream({ pull(controller) { current = false; controller.enqueue(new TextEncoder().encode(JSON.stringify({ orderID, transactionID }))); controller.close() } }))
  assert.deepEqual(await read(response, () => current), { kind: 'stale' })
  assert.deepEqual(await readConfirmTransport(async () => { throw new Error('stale network') }, expected, () => false), { kind: 'stale' })
})
