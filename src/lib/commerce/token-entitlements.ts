/** Provider-free decisions only. Caller owns authoritative reads, locks and atomic writes.
 * Activated means bound, never issued. No cancellation or token revocation is inferred here.
 */
export type Membership = Readonly<{
  account: string; entitlementID: string; operationID: string; target: string;
  status: 'reserved' | 'confirmed'; membershipReference?: string;
}>;
export type PaidSnapshot = Readonly<{
  orderID: string; transactionID: string; snapshotID: string; buyer: string; event: string;
  quantity: number; ruleVersion: string; financialEvidence: string;
  capabilityDigests: readonly string[];
  // Already verified event-specific evidence supplied by the payment owner; no slot read here.
  holdersAdmitted?: boolean; buyerHoldsToken?: boolean;
}>;
export type Unit = Readonly<{
  id: string; orderID: string; transactionID: string; snapshotID: string; buyer: string; event: string;
  financialEvidence: string; ruleVersion: string; provenance: 'self' | 'gift';
  entitlement: Readonly<{ id: string; sourceUnitID: string; status: 'unactivated' | 'activated';
    disposition: 'pending-policy' | 'acquisition'; account?: string; activatedAt?: string;
    policyHold?: Readonly<{ reason: 'TOKEN_DISPOSITION_UNSELECTED'; affectedRight: string; pendingDecision: 'existing-holder-commercial-disposition' }> }>;
  admission: Readonly<{ id: string; unitID: string; event: string; account?: string; claimedAccount?: string;
    status: 'available' | 'claimed' | 'checked-in'; checkedInAt?: string; arrivalActionID?: string }>;
  capability: Readonly<{ unitID: string; entitlementID: string; buyer: string; digest: string; generation: number;
    consumed: boolean; rotations: readonly Readonly<{ requestID: string; expectedGeneration: number; digest: string; generation: number }>[] }>;
  financialHold?: boolean; benefitHold?: boolean;
}>;
export type Activation = Readonly<{
  unitID: string; commandID: string; account: string; proofAccount: string; verified: boolean;
  intentAccount: string; explicitIntent: boolean; action: string;
  actorMode: 'guest' | 'staff-guided' | 'staff-assisted'; trustedConsentAccount?: string;
  timingApproved: boolean; digest: string; generation: number; target: string; policyVersion: string; at: string;
}>;
export type ActivationIntent = Readonly<{
  commandID: string; operationID: string; entitlementID: string; unitID: string; account: string;
  target: string; policyVersion: string; activatedAt: string; requestIdentity: string;
}>;
export type Attendance = Readonly<{
  unitID?: string; event: string; account: string; proofAccount: string; verified: boolean;
  operatorAuthorized: boolean; ruleEligible: boolean; ruleVersion: string; actionID: string; at: string;
  holdersAdmitted?: boolean; financialHold?: boolean; benefitHold?: boolean;
}>;
export type AttendanceResult = Readonly<{
  id: string; event: string; account: string; checkedInAt: string; actionID: string; unitID?: string;
}>;
export type KernelState = Readonly<{
  orders: readonly Readonly<{ snapshot: PaidSnapshot; unitIDs: readonly string[]; selfUnitID?: string }>[];
  units: readonly Unit[]; memberships: readonly Membership[]; intents: readonly ActivationIntent[];
  holderAdmissions: readonly AttendanceResult[];
}>;
export type Refusal = 'INVALID_INPUT' | 'INTEGRITY' | 'UNAVAILABLE' | 'PROOF_REQUIRED' | 'INTENT_REQUIRED'
  | 'ASSISTANCE_PROOF_REQUIRED' | 'TIMING_REQUIRED' | 'FINANCIAL_HOLD' | 'SELF_BUYER_REQUIRED'
  | 'EVENT_ALREADY_BOUND' | 'ALREADY_HOLDS_TOKEN' | 'CAPABILITY_INVALID' | 'BUYER_REQUIRED'
  | 'ALREADY_ACTIVATED' | 'POLICY_REQUIRED' | 'OPERATOR_REQUIRED' | 'EVENT_MISMATCH'
  | 'EVENT_INELIGIBLE' | 'NOT_ACTIVATED' | 'REVIEW_REQUIRED' | 'HOLDER_ADMISSION_REQUIRED';
export type Decision<T> = Readonly<{ ok: true; state: KernelState; value: T }>
  | Readonly<{ ok: false; state: KernelState; code: Refusal }>;

// Feature-local result/update composition, not a second store/lock/retry framework.
function reject(state: KernelState, code: Refusal): Decision<never> { return { ok: false, state, code }; }
function accept<T>(state: KernelState, value: T): Decision<T> { return { ok: true, state, value }; }
function replaceUnit(state: KernelState, unit: Unit): KernelState {
  return { ...state, units: state.units.map(u => u.id === unit.id ? unit : u) };
}
function occupied(state: KernelState, event: string, account: string, except?: string): boolean {
  return state.units.some(u => u.id !== except && u.event === event && u.admission.account === account)
    || state.holderAdmissions.some(a => a.event === event && a.account === account);
}

export function settlePaidUnits(state: KernelState, snapshot: PaidSnapshot): Decision<readonly Unit[]> {
  if (![snapshot.orderID, snapshot.transactionID, snapshot.snapshotID, snapshot.buyer, snapshot.event,
    snapshot.ruleVersion, snapshot.financialEvidence].every(v => typeof v === 'string' && v.length > 0)
    || !Number.isSafeInteger(snapshot.quantity) || snapshot.quantity < 1
    || snapshot.capabilityDigests.length !== snapshot.quantity
    || !snapshot.capabilityDigests.every(v => typeof v === 'string' && v.length > 0)) return reject(state, 'INVALID_INPUT');
  if (state.orders.some(o => o.snapshot.transactionID === snapshot.transactionID
    && o.snapshot.orderID !== snapshot.orderID)) return reject(state, 'INTEGRITY');
  const prior = state.orders.filter(o => o.snapshot.orderID === snapshot.orderID);
  const existing = state.units.filter(u => u.orderID === snapshot.orderID);
  if (prior.length || existing.length) {
    const identities = [snapshot, prior[0]?.snapshot].map(p => p && JSON.stringify([p.orderID, p.transactionID,
      p.snapshotID, p.buyer, p.event, p.quantity, p.ruleVersion, p.financialEvidence, p.capabilityDigests,
      p.holdersAdmitted ?? false, p.buyerHoldsToken ?? false]));
    if (prior.length !== 1 || identities[0] !== identities[1]
      || existing.length !== snapshot.quantity || prior[0].unitIDs.length !== snapshot.quantity) return reject(state, 'INTEGRITY');
    for (let i = 0; i < snapshot.quantity; i += 1) {
      const id = snapshot.orderID + ':' + (i + 1);
      const matches = existing.filter(u => u.id === id); const u = matches[0];
      if (matches.length !== 1 || prior[0].unitIDs[i] !== id || u.buyer !== snapshot.buyer || u.event !== snapshot.event
        || u.transactionID !== snapshot.transactionID || u.snapshotID !== snapshot.snapshotID
        || u.financialEvidence !== snapshot.financialEvidence || u.ruleVersion !== snapshot.ruleVersion
        || u.entitlement.id !== 'entitlement:' + id || u.entitlement.sourceUnitID !== id
        || u.admission.id !== 'admission:' + id || u.admission.unitID !== id || u.admission.event !== snapshot.event
        || u.capability.unitID !== id || u.capability.entitlementID !== u.entitlement.id || u.capability.buyer !== snapshot.buyer
        || u.provenance !== (prior[0].selfUnitID === id ? 'self' : 'gift')
        || (u.provenance === 'self' && u.admission.account !== snapshot.buyer)) return reject(state, 'INTEGRITY');
    }
    return accept(state, prior[0].unitIDs.map(id => existing.find(u => u.id === id)!));
  }
  const self = !occupied(state, snapshot.event, snapshot.buyer)
    && !(snapshot.holdersAdmitted === true && snapshot.buyerHoldsToken === true);
  const units: readonly Unit[] = Array.from({ length: snapshot.quantity }, (_, i) => {
    const id = snapshot.orderID + ':' + (i + 1); const reserved = self && i === 0;
    return { id, orderID: snapshot.orderID, transactionID: snapshot.transactionID, snapshotID: snapshot.snapshotID,
      buyer: snapshot.buyer, event: snapshot.event, financialEvidence: snapshot.financialEvidence, ruleVersion: snapshot.ruleVersion,
      provenance: reserved ? 'self' : 'gift',
      entitlement: { id: 'entitlement:' + id, sourceUnitID: id, status: 'unactivated', disposition: 'pending-policy',
        policyHold: { reason: 'TOKEN_DISPOSITION_UNSELECTED', affectedRight: 'entitlement:' + id,
          pendingDecision: 'existing-holder-commercial-disposition' } },
      admission: { id: 'admission:' + id, unitID: id, event: snapshot.event, status: 'available', ...(reserved ? { account: snapshot.buyer } : {}) },
      capability: { unitID: id, entitlementID: 'entitlement:' + id, buyer: snapshot.buyer,
        digest: snapshot.capabilityDigests[i], generation: 1, consumed: false, rotations: [] } };
  });
  const stored = { ...snapshot, capabilityDigests: [...snapshot.capabilityDigests] };
  return accept({ ...state, orders: [...state.orders, { snapshot: stored, unitIDs: units.map(u => u.id), ...(self ? { selfUnitID: units[0].id } : {}) }],
    units: [...state.units, ...units] }, units);
}

export function activateUnit(state: KernelState, input: Activation): Decision<ActivationIntent> {
  if (![input.commandID, input.unitID, input.account, input.target, input.policyVersion, input.at].every(Boolean)) return reject(state, 'INVALID_INPUT');
  if (!input.verified || input.proofAccount !== input.account) return reject(state, 'PROOF_REQUIRED');
  if (input.action !== 'POST' || !input.explicitIntent || input.intentAccount !== input.account) return reject(state, 'INTENT_REQUIRED');
  if (input.actorMode === 'staff-assisted' && input.trustedConsentAccount !== input.account) return reject(state, 'ASSISTANCE_PROOF_REQUIRED');
  const identity = JSON.stringify([input.unitID, input.commandID, input.account, input.proofAccount,
    input.verified, input.intentAccount, input.explicitIntent, input.action, input.actorMode,
    input.trustedConsentAccount ?? null, input.timingApproved, input.digest, input.generation,
    input.target, input.policyVersion, input.at]);
  const prior = state.intents.find(i => i.commandID === input.commandID);
  if (prior && prior.account === input.account) {
    if (prior.requestIdentity !== identity) return reject(state, 'INTEGRITY');
    return accept(state, prior);
  }
  if (state.memberships.some(m => m.account === input.account)) return reject(state, 'ALREADY_HOLDS_TOKEN');
  if (prior) return reject(state, 'UNAVAILABLE');
  const unit = state.units.find(u => u.id === input.unitID);
  if (!unit) return reject(state, 'UNAVAILABLE');
  if (unit.entitlement.status === 'activated' && unit.entitlement.account !== input.account) return reject(state, 'UNAVAILABLE');
  if (unit.entitlement.status === 'activated') return reject(state, 'ALREADY_ACTIVATED');
  if (unit.admission.status === 'checked-in') return reject(state, 'REVIEW_REQUIRED');
  if (!input.timingApproved) return reject(state, 'TIMING_REQUIRED');
  if (unit.financialHold || unit.benefitHold) return reject(state, 'FINANCIAL_HOLD');
  if (unit.provenance === 'self' && unit.buyer !== input.account) return reject(state, 'SELF_BUYER_REQUIRED');
  if (occupied(state, unit.event, input.account, unit.id)) return reject(state, 'EVENT_ALREADY_BOUND');
  if (unit.capability.consumed || unit.capability.digest !== input.digest || unit.capability.generation !== input.generation) return reject(state, 'CAPABILITY_INVALID');
  const intent: ActivationIntent = { commandID: input.commandID, operationID: 'membership:' + unit.entitlement.id,
    entitlementID: unit.entitlement.id, unitID: unit.id, account: input.account, target: input.target,
    policyVersion: input.policyVersion, activatedAt: input.at, requestIdentity: identity };
  const activated: Unit = { ...unit,
    entitlement: { ...unit.entitlement, status: 'activated', disposition: 'acquisition', account: input.account, activatedAt: input.at, policyHold: undefined },
    admission: { ...unit.admission, account: input.account, claimedAccount: input.account, status: 'claimed' },
    capability: { ...unit.capability, consumed: true } };
  return accept({ ...replaceUnit(state, activated), intents: [...state.intents, intent],
    memberships: [...state.memberships, { account: input.account, entitlementID: unit.entitlement.id,
      operationID: intent.operationID, target: input.target, status: 'reserved' }] }, intent);
}

export function regenerateActivationCode(state: KernelState, input: Readonly<{
  unitID: string; buyer: string; requestID: string; expectedGeneration: number; replacementDigest: string;
}>): Decision<Readonly<{ generation: number }>> {
  const unit = state.units.find(u => u.id === input.unitID);
  if (!unit) return reject(state, 'UNAVAILABLE');
  if (unit.buyer !== input.buyer) return reject(state, 'BUYER_REQUIRED');
  if (!input.requestID || !input.replacementDigest || !Number.isSafeInteger(input.expectedGeneration)) return reject(state, 'INVALID_INPUT');
  if (unit.financialHold || unit.benefitHold) return reject(state, 'FINANCIAL_HOLD');
  const prior = unit.capability.rotations.find(r => r.requestID === input.requestID);
  if (prior) {
    if (prior.digest !== input.replacementDigest || prior.expectedGeneration !== input.expectedGeneration) return reject(state, 'INTEGRITY');
    return accept(state, { generation: prior.generation });
  }
  if (unit.entitlement.status === 'activated' || unit.capability.consumed) return reject(state, 'ALREADY_ACTIVATED');
  if (unit.capability.generation !== input.expectedGeneration || unit.capability.digest === input.replacementDigest) return reject(state, 'CAPABILITY_INVALID');
  const generation = unit.capability.generation + 1;
  return accept(replaceUnit(state, { ...unit, capability: { ...unit.capability, generation, digest: input.replacementDigest,
    rotations: [...unit.capability.rotations, { requestID: input.requestID, expectedGeneration: input.expectedGeneration,
      digest: input.replacementDigest, generation }] } }), { generation });
}

export function assessGiftLinkEligibility(state: KernelState, input: Readonly<{
  unitID: string; buyer: string; noNameProposal?: boolean;
}>): Decision<Readonly<{ unitID: string }>> {
  const unit = state.units.find(u => u.id === input.unitID);
  if (!unit) return reject(state, 'UNAVAILABLE');
  if (unit.buyer !== input.buyer) return reject(state, 'BUYER_REQUIRED');
  if (unit.financialHold || unit.benefitHold) return reject(state, 'FINANCIAL_HOLD');
  if (unit.provenance !== 'gift' || unit.admission.account || unit.entitlement.status !== 'unactivated') return reject(state, 'UNAVAILABLE');
  if (!input.noNameProposal) return reject(state, 'POLICY_REQUIRED');
  return accept(state, { unitID: unit.id });
}

export function recordAttendance(state: KernelState, input: Attendance): Decision<AttendanceResult> {
  if (!input.actionID || !input.at || !input.event || !input.account || !input.ruleVersion) return reject(state, 'INVALID_INPUT');
  if (!input.operatorAuthorized) return reject(state, 'OPERATOR_REQUIRED');
  if (!input.verified || input.proofAccount !== input.account) return reject(state, 'PROOF_REQUIRED');
  if (!input.ruleEligible) return reject(state, 'EVENT_INELIGIBLE');
  if (input.financialHold || input.benefitHold) return reject(state, 'FINANCIAL_HOLD');
  if (!input.unitID) return attendHolder(state, input);
  const unit = state.units.find(u => u.id === input.unitID);
  if (!unit) return reject(state, 'UNAVAILABLE');
  if (unit.event !== input.event) return reject(state, 'EVENT_MISMATCH');
  if (unit.ruleVersion !== input.ruleVersion) return reject(state, 'EVENT_INELIGIBLE');
  if (unit.financialHold || unit.benefitHold) return reject(state, 'FINANCIAL_HOLD');
  if (unit.entitlement.status !== 'activated' || !unit.admission.claimedAccount) {
    return reject(state, unit.admission.status === 'checked-in' ? 'REVIEW_REQUIRED' : 'NOT_ACTIVATED');
  }
  if (unit.entitlement.account !== input.account || unit.admission.account !== input.account
    || unit.admission.claimedAccount !== input.account) return reject(state, 'PROOF_REQUIRED');
  if (occupied(state, unit.event, input.account, unit.id)) return reject(state, 'REVIEW_REQUIRED');
  if (unit.admission.status === 'checked-in') {
    if (!unit.admission.checkedInAt || !unit.admission.arrivalActionID) return reject(state, 'REVIEW_REQUIRED');
    return accept(state, { id: unit.admission.id, unitID: unit.id, event: unit.event, account: input.account,
      checkedInAt: unit.admission.checkedInAt, actionID: unit.admission.arrivalActionID });
  }
  const result = { id: unit.admission.id, unitID: unit.id, event: unit.event, account: input.account,
    checkedInAt: input.at, actionID: input.actionID };
  return accept(replaceUnit(state, { ...unit, admission: { ...unit.admission, status: 'checked-in',
    checkedInAt: input.at, arrivalActionID: input.actionID } }), result);
}

function attendHolder(state: KernelState, input: Attendance): Decision<AttendanceResult> {
  if (input.holdersAdmitted !== true) return reject(state, 'HOLDER_ADMISSION_REQUIRED');
  if (!state.memberships.some(m => m.account === input.account && m.status === 'confirmed' && m.membershipReference)) return reject(state, 'HOLDER_ADMISSION_REQUIRED');
  const prior = state.holderAdmissions.find(a => a.event === input.event && a.account === input.account);
  if (prior) return accept(state, prior);
  if (occupied(state, input.event, input.account)) return reject(state, 'EVENT_ALREADY_BOUND');
  const result = { id: 'holder-admission:' + JSON.stringify([input.event, input.account]), event: input.event,
    account: input.account, checkedInAt: input.at, actionID: input.actionID };
  return accept({ ...state, holderAdmissions: [...state.holderAdmissions, result] }, result);
}

/** Gross obligations only: cancellation/release accounting remains exclusively P2b's owner. */
export function capacityCount(state: KernelState, event: string): number {
  return state.units.filter(u => u.event === event).length + state.holderAdmissions.filter(a => a.event === event).length;
}
