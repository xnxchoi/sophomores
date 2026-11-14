import { createLocalReq } from 'payload'
import { once } from 'node:events'
import { setTimeout } from 'node:timers/promises'
import { admitReconciliation, debitProviderGet, endReconciliation, accountedProviderGet } from '../../../src/lib/commerce/portone/accounting'
import { openReconciliationDatabase } from './reconciliation-postgres-fixture'
import type { ReconciliationIdentity } from '../../../src/lib/commerce/portone/accounting'

async function main() {
const identity = JSON.parse(process.env.I2_PROOF_IDENTITY ?? 'null') as ReconciliationIdentity
const mode = process.env.I2_PROOF_MODE ?? ''
if (!identity || !process.send || !['admit', 'barrier-admit', 'debit-crash', 'lock-crash', 'automatic', 'gate-confirm', 'gate-resume'].includes(mode)) throw new Error('Explicit isolated proof invocation required')
const db = await openReconciliationDatabase()
try {
  const user = { id: identity.customerID, collection: 'users', email: 'fixture@fixture.invalid' } as import('payload').TypedUser
  const req = await createLocalReq({ user }, db.payload)
  if (mode.startsWith('gate-') || mode === 'barrier-admit') { process.send({ decision: 'ready' }); await once(process, 'message') }
  let result = await admitReconciliation(req, identity, mode === 'gate-resume' ? 'resume' : 'confirm', db.payload, { automatic: mode === 'automatic' })
  for (let retry = 0; result.decision === 'busy' && mode.startsWith('gate-') && retry < 100; retry++) {
    await setTimeout(10)
    result = await admitReconciliation(req, identity, mode === 'gate-resume' ? 'resume' : 'confirm')
  }
  if (result.decision === 'started' && mode.startsWith('gate-')) {
    // Admission races across processes; dispatch is coordinated, never retried by the fixture.
    process.send({ decision: 'admitted' })
    await once(process, 'message')
    const count = mode === 'gate-resume' ? 1 : 2
    for (let i = 0; i < count; i++) await accountedProviderGet(req, identity.paymentID, async () => ({ synthetic: true }))
    await endReconciliation(req, 'completed')
    process.send({ decision: result.decision, debited: count })
  } else if (result.decision === 'started' && (mode === 'debit-crash' || mode === 'lock-crash')) {
    await debitProviderGet(req, identity.paymentID)
    if (mode === 'lock-crash') {
      const { inPaymentTransaction } = await import('../../../src/lib/commerce/_shared/transaction')
      const { assertReconciliationFence } = await import('../../../src/lib/commerce/portone/accounting')
      await inPaymentTransaction(req, async () => {
        await assertReconciliationFence(req)
        process.send!({ decision: result.decision, debited: 1 })
        await new Promise<void>(() => {})
      })
    } else { process.send({ decision: result.decision, debited: 1 }); await new Promise<void>(() => {}) }
  } else if (result.decision === 'started' && mode === 'barrier-admit') {
    process.send({ decision: result.decision })
    await once(process, 'message')
    await endReconciliation(req, 'completed')
  } else process.send({ decision: result.decision })
} finally { await db.close() }
}
void main().catch(error => { console.error(error instanceof Error ? error.message.slice(0, 180) : 'Proof worker failed'); process.exitCode = 1 })
