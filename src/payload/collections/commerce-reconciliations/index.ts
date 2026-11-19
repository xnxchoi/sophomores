import { ledgerCollection } from '@/lib/commerce/_shared/collection'
import { commerceServerWrite } from '@/lib/commerce/access'
import { attemptAccountingSchema, gateSchema, reconciliationEventSchema, reconciliationCatchupSchema, settlementObservationSchema, reconciliationEventScope } from '@/lib/commerce/portone/accounting'
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
    else if (scope === 'reconciliation-provider-global') gateSchema.parse(data.state)
    else throw new Error('Invalid reconciliation scope')
    return data
  }],
  beforeDelete: [() => { throw new Error('Reconciliation records cannot be deleted') }] },
}
