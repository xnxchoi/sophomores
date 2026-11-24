import { ledgerCollection } from '@/lib/commerce/_shared/collection'
import { commerceServerWrite } from '@/lib/commerce/access'
import { attemptAccountingSchema, gateSchema, reconciliationEventSchema, reconciliationCatchupSchema, settlementObservationSchema, reconciliationEventScope, paidReviewCaseSchema, paidReviewScope, paidDispositionSchema, paidDispositionScope, paymentContradictionSchema, paymentContradictionScope } from '@/lib/commerce/portone/accounting'
import { isVerifiedPaymentCancellation } from '@/lib/commerce/portone/review'
import { refundRequestSchema, refundRequestScope } from '@/lib/commerce/portone/refund'
import type { CollectionConfig } from 'payload'

/** Independent of plugin settlement, so pre-dispatch debits survive its rollback. */
export const CommerceReconciliations: CollectionConfig = {
  ...ledgerCollection('commerce-reconciliations', [
    { name: 'scope', type: 'text', required: true, unique: true },
    { name: 'state', type: 'json', required: true },
  ]),
  lockDocuments: false,
  hooks: { beforeChange: [({ req, data, originalDoc, operation }) => {
    if (!commerceServerWrite(req)) throw new Error('Reconciliation ledger is server-owned')
    if (operation === 'update' && data.scope !== undefined && data.scope !== originalDoc.scope) throw new Error('Reconciliation scope is immutable')
    const scope = String(data.scope ?? originalDoc?.scope)
    if (scope.startsWith('reconciliation-attempt:')) attemptAccountingSchema.parse(data.state)
    else if (/^reconciliation-event:[a-f0-9-]{36}:[a-f0-9]{64}$/.test(scope)) {
      if (operation !== 'create') throw new Error('Ingress evidence is immutable')
      const event = reconciliationEventSchema.parse(data.state)
      if (scope !== reconciliationEventScope(event.identity.transactionID, event.event.id)) throw new Error('Ingress evidence scope mismatch')
    }
    else if (/^reconciliation-(?:completion:[a-f0-9-]{36}:[a-f0-9-]{36}|risk:[a-f0-9-]{36}:[a-f0-9-]{36}:[a-f0-9]{64})$/.test(scope)) {
      if (operation !== 'create') throw new Error('Catch-up evidence is immutable')
      const marker = reconciliationCatchupSchema.parse(data.state)
      const expected = marker.risk ? `reconciliation-risk:${marker.identity.transactionID}:${marker.token}:${marker.risk.hash}`
        : `reconciliation-completion:${marker.identity.transactionID}:${marker.token}`
      if (scope !== expected || Boolean(marker.risk) === Boolean(marker.outcome)) throw new Error('Invalid catch-up evidence')
    }
    else if (scope.startsWith('reconciliation-observation:')) {
      if (operation !== 'create') throw new Error('Provider observation is immutable')
      const evidence = settlementObservationSchema.parse(data.state)
      if (scope !== `reconciliation-observation:${evidence.identity.transactionID}:${evidence.token}:${evidence.sequence}`) {
        throw new Error('Provider observation scope mismatch')
      }
    }
    else if (scope.startsWith('reconciliation-paid-review:')) {
      if (operation !== 'create') throw new Error('Paid review evidence is immutable')
      const evidence = paidReviewCaseSchema.parse(data.state)
      if (scope !== paidReviewScope(evidence.identity.transactionID)) throw new Error('Paid review scope mismatch')
    }
    else if (scope.startsWith('reconciliation-paid-disposition:')) {
      if (operation !== 'create') throw new Error('Payment disposition is immutable')
      const disposition = paidDispositionSchema.parse(data.state)
      if (scope !== paidDispositionScope(disposition.identity.transactionID, disposition.sequence)) throw new Error('Payment disposition scope mismatch')
      // Only the verified-cancellation write itself may record its disposition.
      if (!isVerifiedPaymentCancellation(req, disposition.identity.transactionID)) throw new Error('Verified cancellation required')
    }
    else if (scope.startsWith('reconciliation-paid-contradiction:')) {
      if (operation !== 'create') throw new Error('Payment contradiction is immutable')
      const contradiction = paymentContradictionSchema.parse(data.state)
      if (scope !== paymentContradictionScope(contradiction.identity.transactionID, contradiction.sequence)) throw new Error('Payment contradiction scope mismatch')
    }
    else if (scope.startsWith('reconciliation-refund-request:')) {
      // Staff refund (portone/refund.ts): written once, before PortOne is asked to cancel.
      if (operation !== 'create') throw new Error('Refund request is immutable')
      const request = refundRequestSchema.parse(data.state)
      if (scope !== refundRequestScope(request.transactionID)) throw new Error('Refund request scope mismatch')
    }
    else if (scope === 'reconciliation-provider-global') gateSchema.parse(data.state)
    else throw new Error('Invalid reconciliation scope')
    return data
  }],
  beforeDelete: [() => { throw new Error('Reconciliation records cannot be deleted') }] },
}
