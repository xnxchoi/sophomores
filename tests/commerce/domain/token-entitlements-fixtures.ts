import type { Activation, Decision, KernelState, PaidSnapshot } from '../../../src/lib/commerce/token-entitlements';

export const empty = (): KernelState => ({ orders: [], units: [], memberships: [], intents: [], holderAdmissions: [] });
export function paid(overrides: Partial<PaidSnapshot> = {}): PaidSnapshot {
  return { orderID: 'order', transactionID: 'tx-' + (overrides.orderID ?? 'order'), snapshotID: 'snapshot-' + (overrides.orderID ?? 'order'), buyer: 'buyer',
    event: 'event', quantity: 3, ruleVersion: 'rule-1', financialEvidence: 'paid:shipping-owner:buyer',
    capabilityDigests: ['digest-1', 'digest-2', 'digest-3'], ...overrides };
}
export function activation(overrides: Partial<Activation> = {}): Activation {
  return { unitID: 'order:2', commandID: 'activate-1', account: 'guest', proofAccount: 'guest',
    verified: true, intentAccount: 'guest', explicitIntent: true, action: 'POST', actorMode: 'guest',
    timingApproved: true, digest: 'digest-2', generation: 1, target: 'membership-target',
    policyVersion: 'policy-1', at: '2026-11-13T10:00:00Z', ...overrides };
}
export const holder = (account = 'holder') => ({ account, entitlementID: 'external-entitlement',
  operationID: 'external-operation', target: 'external-target', status: 'confirmed' as const, membershipReference: 'token-1' });

// Test-only optimistic store. Global revision deliberately over-conflicts; it is not a SQL/lock emulator.
export class Scheduler {
  private revision = 0;
  constructor(public state: KernelState = empty()) {}
  prepare<T>(decide: (state: KernelState) => Decision<T>) {
    return { revision: this.revision, decide, decision: decide(this.state) };
  }
  commit<T>(job: ReturnType<Scheduler['prepare']> & { decision: Decision<T> }): Decision<T> {
    const result = job.revision === this.revision ? job.decision : job.decide(this.state) as Decision<T>;
    if (result.ok && result.state !== this.state) { this.state = result.state; this.revision += 1; }
    return result;
  }
}
