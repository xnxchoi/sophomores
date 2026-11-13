import assert from 'node:assert/strict';
import test from 'node:test';
import { activation, empty, holder, paid, Scheduler } from './token-entitlements-fixtures';
import type { Decision, KernelState } from '../../../src/lib/commerce/token-entitlements';
const load = () => import('../../../src/lib/commerce/token-entitlements');
function success<T>(d: Decision<T>): T { if (!d.ok) assert.fail(d.code); return d.value; }
function refusal<T>(d: Decision<T>, code: string, state: KernelState) {
  assert.equal(d.ok, false); if (d.ok) throw Error('expected refusal'); assert.equal(d.code, code);
  assert.equal(d.state, state); assert.deepEqual(Object.keys(d).sort(), ['code', 'ok', 'state']);
}
async function allocated() { const k = await load(); return k.settlePaidUnits(empty(), paid()).state; }

// Model test list rows 1–13; owner-answer branches are explicit, not implicit defaults.
test('01 unselected policies and past event still allocate all units exactly once', async () => {
  const k = await load(); const snapshot = paid(); const d = k.settlePaidUnits(empty(), snapshot);
  assert.equal(success(d).length, 3); assert.equal(d.state.memberships.length, 0); assert.equal(d.state.intents.length, 0);
  assert.equal(d.state.units[0].entitlement.disposition, 'acquisition');
  assert.equal(d.state.units.every(u => u.entitlement.policyHold === undefined), true);
  assert.equal(d.state.units[0].admission.account, 'buyer');
  assert.deepEqual(k.settlePaidUnits(d.state, snapshot), { ok: true, state: d.state, value: d.state.units });
});
test('02 first quantity three, repeat before activation, same and different events', async () => {
  const k = await load(); let s = await allocated();
  s = k.settlePaidUnits(s, paid({ orderID: 'repeat' })).state;
  assert.deepEqual(s.units.slice(3).map(u => u.provenance), ['gift','gift','gift']);
  s = k.settlePaidUnits(s, paid({ orderID: 'other', event: 'other' })).state;
  assert.equal(s.units.filter(u => u.provenance === 'self').length, 2); assert.equal(s.memberships.length, 0);
});
for (const reverse of [false, true]) test('03 concurrent first orders stale-read re-evaluation ' + reverse, async () => {
  const k = await load(); const f = new Scheduler();
  const jobs = [f.prepare(s => k.settlePaidUnits(s, paid())), f.prepare(s => k.settlePaidUnits(s, paid({ orderID: 'second' })))];
  if (reverse) jobs.reverse(); jobs.forEach(j => success(f.commit(j)));
  assert.equal(f.state.units.filter(u => u.provenance === 'self').length, 1);
  assert.equal(f.state.units.length, 6);
});
for (const activationFirst of [false, true]) test('03 settlement versus gift activation ' + activationFirst, async () => {
  const k = await load(); const f = new Scheduler(await allocated());
  const buy = f.prepare(s => k.settlePaidUnits(s, paid({ orderID: 'incoming', buyer: 'guest' })));
  const claim = f.prepare(s => k.activateUnit(s, activation()));
  if (activationFirst) { success(f.commit(claim)); success(f.commit(buy));
    assert.equal(f.state.units.filter(u => u.buyer === 'guest').every(u => u.provenance === 'gift'), true);
  } else { success(f.commit(buy)); refusal(f.commit(claim), 'EVENT_ALREADY_BOUND', f.state);
    assert.equal(f.state.units[1].capability.consumed, false); }
  assert.equal(f.state.units.filter(u => u.admission.account === 'guest' && u.event === 'event').length, 1);
  assert.equal(f.state.units[1].buyer, 'buyer'); assert.equal(f.state.orders[0].snapshot.financialEvidence, paid().financialEvidence);
});
test('04 complete replay and changed or partial historical identity fail atomically', async () => {
  const k = await load(); const s = await allocated();
  refusal(k.settlePaidUnits(s, paid({ transactionID: 'changed' })), 'INTEGRITY', s);
  const partial = { ...s, units: s.units.slice(1) }; refusal(k.settlePaidUnits(partial, paid()), 'INTEGRITY', partial);
  const corrupt = { ...s, units: s.units.map((u, i) => i ? u : { ...u, buyer: 'corrupt' }) };
  refusal(k.settlePaidUnits(corrupt, paid()), 'INTEGRITY', corrupt);
  const d = k.activateUnit(s, activation()); const first = success(d);
  assert.deepEqual(success(k.activateUnit(d.state, activation())), first);
  refusal(k.activateUnit(d.state, activation({ target: 'changed' })), 'INTEGRITY', d.state);
  refusal(k.activateUnit(d.state, activation({ account: 'other', proofAccount: 'other', intentAccount: 'other' })), 'UNAVAILABLE', d.state);
});
for (const sameAccount of [false, true]) for (const otherEvent of [false, true]) test('05 bearer and account-wide races ' + sameAccount + otherEvent, async () => {
  const k = await load(); let s = await allocated();
  if (otherEvent) s = k.settlePaidUnits(s, paid({ orderID: 'different', event: 'different' })).state;
  const f = new Scheduler(s); const a = f.prepare(x => k.activateUnit(x, activation()));
  const bInput = activation({ commandID: 'second', unitID: sameAccount ? (otherEvent ? 'different:2' : 'order:3') : 'order:2',
    digest: sameAccount && !otherEvent ? 'digest-3' : 'digest-2',
    account: sameAccount ? 'guest' : 'other', proofAccount: sameAccount ? 'guest' : 'other', intentAccount: sameAccount ? 'guest' : 'other' });
  const b = f.prepare(x => k.activateUnit(x, bInput)); success(f.commit(a)); const before = f.state;
  const loser = f.commit(b); refusal(loser, sameAccount ? 'ALREADY_HOLDS_TOKEN' : 'UNAVAILABLE', before);
  assert.equal(f.state.memberships.length, 1); assert.equal(f.state.intents.length, 1);
  if (sameAccount) assert.equal(f.state.units.find(u => u.id === bInput.unitID)?.capability.consumed, false);
  assert.deepEqual(success(k.activateUnit(f.state, activation())), success(a.decision));
});
test('06 holder gift refusal is typed, private and intact; already event-bound gift intact', async () => {
  const k = await load(); const s = { ...await allocated(), memberships: [holder('guest')] };
  refusal(k.activateUnit(s, activation()), 'ALREADY_HOLDS_TOKEN', s);
  const bound = { ...await allocated(), units: (await allocated()).units.map((u,i) => i === 0 ? { ...u, admission: { ...u.admission, account: 'guest' } } : u) };
  refusal(k.activateUnit(bound, activation()), 'EVENT_ALREADY_BOUND', bound);
});
test('07 no-name link remains explicit proposal; legacy and named unactivated arrival never pass', async () => {
  const k = await load(); const s = await allocated();
  refusal(k.assessGiftLinkEligibility(s, { unitID: 'order:2', buyer: 'buyer' }), 'POLICY_REQUIRED', s);
  success(k.assessGiftLinkEligibility(s, { unitID: 'order:2', buyer: 'buyer', noNameProposal: true }));
  refusal(k.recordAttendance(s, arrival()), 'NOT_ACTIVATED', s);
  const old = { ...s, units: s.units.map((u,i) => i === 1 ? { ...u, admission: { ...u.admission, status: 'checked-in' as const, checkedInAt: 'old' } } : u) };
  refusal(k.recordAttendance(old, arrival()), 'REVIEW_REQUIRED', old);
});
function arrival(extra = {}) { return { unitID: 'order:2', event: 'event', account: 'guest', proofAccount: 'guest', verified: true,
  operatorAuthorized: true, ruleEligible: true, ruleVersion: 'rule-1', actionID: 'arrival', at: '2026-11-13T11:00:00Z', ...extra }; }
test('08 self promotion preserves original allocation; nonbuyer cannot use self code', async () => {
  const k = await load(); const s = await allocated();
  refusal(k.activateUnit(s, activation({ unitID: 'order:1', digest: 'digest-1' })), 'SELF_BUYER_REQUIRED', s);
  const d = k.activateUnit(s, activation({ unitID: 'order:1', digest: 'digest-1', account: 'buyer', proofAccount: 'buyer', intentAccount: 'buyer' }));
  success(d); assert.equal(d.state.units[0].provenance, 'self'); assert.equal(d.state.units[0].admission.account, 'buyer');
  const a = k.recordAttendance(d.state, arrival({ unitID: 'order:1', account: 'buyer', proofAccount: 'buyer' }));
  success(a); assert.equal(a.state.units[0].admission.status, 'checked-in'); assert.equal(a.state.units[0].admission.claimedAccount, 'buyer');
  assert.equal(a.state.units[0].id, s.units[0].id);
  assert.equal(a.state.units[0].admission.checkedInAt, arrival().at);
  assert.equal(k.capacityCount(a.state, 'event'), k.capacityCount(s, 'event'));
  assert.equal(a.state.units.filter(u => u.admission.claimedAccount === 'buyer').length, 1);
});
test('09 on-spot and already activated concurrent arrivals recover one timestamp and package', async () => {
  const k = await load(); const d = k.activateUnit(await allocated(), activation()); success(d);
  const f = new Scheduler(d.state); const a = f.prepare(s => k.recordAttendance(s, arrival()));
  const b = f.prepare(s => k.recordAttendance(s, arrival({ actionID: 'concurrent', at: 'later' })));
  const result = success(f.commit(a)); assert.deepEqual(success(f.commit(b)), result);
  assert.deepEqual(success(k.recordAttendance(f.state, arrival())), result);
  assert.equal(f.state.units.length, 3); assert.equal(f.state.units[1].admission.checkedInAt, arrival().at);
});
for (const [patch, code] of [[{operatorAuthorized:false}, 'OPERATOR_REQUIRED'], [{verified:false},'PROOF_REQUIRED'],
  [{account:'wrong'},'PROOF_REQUIRED'], [{event:'wrong'},'EVENT_MISMATCH'], [{ruleEligible:false},'EVENT_INELIGIBLE'],
  [{ruleVersion:'stale'},'EVENT_INELIGIBLE'], [{actionID:''},'INVALID_INPUT']] as const) test('09 attendance guard '+code+JSON.stringify(patch), async () => {
  const k = await load(); const s = k.activateUnit(await allocated(), activation()).state;
  refusal(k.recordAttendance(s, arrival(patch)), code, s);
});
test('10 staff role alone holds; trusted guest-scoped consent fixture same command and replay', async () => {
  const k = await load(); const s = await allocated(); const a = activation({ actorMode: 'staff-assisted' });
  refusal(k.activateUnit(s,a), 'ASSISTANCE_PROOF_REQUIRED', s);
  refusal(k.activateUnit(s,{...a, trustedConsentAccount:'other'}), 'ASSISTANCE_PROOF_REQUIRED', s);
  const d = k.activateUnit(s,{...a,trustedConsentAccount:'guest'}); success(d);
  assert.deepEqual(success(k.activateUnit(d.state,{...a,trustedConsentAccount:'guest'})), success(d));
});
for (const self of [false,true]) for (const rotateFirst of [false,true]) test('11 regeneration versus activation '+self+rotateFirst, async () => {
  const k = await load(); const s = await allocated(); const unitID = self ? 'order:1' : 'order:2';
  const a = activation({unitID, digest:self?'digest-1':'digest-2', ...(self?{account:'buyer',proofAccount:'buyer',intentAccount:'buyer'}:{})});
  const r = {unitID,buyer:'buyer',requestID:'rotate',expectedGeneration:1,replacementDigest:'new-digest'};
  const f = new Scheduler(s); const rotate = f.prepare(x=>k.regenerateActivationCode(x,r)); const activate = f.prepare(x=>k.activateUnit(x,a));
  if (rotateFirst) { success(f.commit(rotate)); const before=f.state; refusal(f.commit(activate),'UNAVAILABLE',before);
    assert.deepEqual(success(k.regenerateActivationCode(f.state,r)),success(rotate.decision));
    refusal(k.regenerateActivationCode(f.state,{...r,replacementDigest:'changed'}),'INTEGRITY',f.state);
    success(f.commit(f.prepare(x=>k.activateUnit(x,{...a,digest:'new-digest',generation:2}))));
  } else { success(f.commit(activate)); refusal(f.commit(rotate),'ALREADY_ACTIVATED',f.state); }
  assert.equal(f.state.units.length,3); assert.equal(f.state.units[0].admission.account,'buyer');
  refusal(k.regenerateActivationCode(s,{...r,buyer:'staff'}),'UNAVAILABLE',s);
});
test('12 old link and post-event U3 activation with buyer/staff absent; expired perks fixture', async () => {
  const k = await load(); const s = await allocated(); const d=k.activateUnit(s,activation({at:'2036-01-01T00:00:00Z'}));
  assert.equal(success(d).account,'guest'); assert.equal(d.state.units[1].entitlement.activatedAt,'2036-01-01T00:00:00Z');
  refusal(k.recordAttendance(d.state,arrival({ruleEligible:false})),'EVENT_INELIGIBLE',d.state);
  assert.equal(d.state.units[1].admission.checkedInAt, undefined);
  assert.equal(d.state.holderAdmissions.length, s.holderAdmissions.length);
  assert.equal(k.capacityCount(d.state, 'event'), k.capacityCount(s, 'event'));
});
for (const [patch,code] of [[{verified:false},'PROOF_REQUIRED'],[{proofAccount:'changed'},'PROOF_REQUIRED'],
  [{explicitIntent:false},'INTENT_REQUIRED'],[{intentAccount:'switched'},'INTENT_REQUIRED'],[{action:'GET'},'INTENT_REQUIRED'],
  [{timingApproved:false},'TIMING_REQUIRED'],[{commandID:''},'INVALID_INPUT']] as const) test('13 independent activation guard '+code+JSON.stringify(patch),async()=>{
  const k=await load();const s=await allocated();refusal(k.activateUnit(s,activation(patch)),code,s);
});
test('13 financial holds block activation, attendance and link changes, not settlement',async()=>{
  const k=await load();const s=await allocated();const held={...s,units:s.units.map(u=>({...u,financialHold:true}))};
  refusal(k.activateUnit(held,activation()),'FINANCIAL_HOLD',held);
  refusal(k.assessGiftLinkEligibility(held,{unitID:'order:2',buyer:'buyer',noNameProposal:true}),'FINANCIAL_HOLD',held);
  refusal(k.regenerateActivationCode(held,{unitID:'order:2',buyer:'buyer',requestID:'r',expectedGeneration:1,replacementDigest:'new'}),'FINANCIAL_HOLD',held);
  const active=k.activateUnit(s,activation()).state;const h={...active,units:active.units.map(u=>({...u,benefitHold:true}))};
  refusal(k.recordAttendance(h,arrival()),'FINANCIAL_HOLD',h);
  assert.equal(success(k.settlePaidUnits(held,paid({orderID:'new'}))).length,3);
});
for(const holdersAdmitted of [true,false,undefined]) for(const buyerHoldsToken of [true,false]) test('owner event rule branch '+holdersAdmitted+buyerHoldsToken,async()=>{
  const k=await load();const s=k.settlePaidUnits(empty(),paid({holdersAdmitted,buyerHoldsToken})).state;
  assert.equal(s.units[0].provenance,holdersAdmitted&&buyerHoldsToken?'gift':'self');
  assert.equal(s.units.slice(1).every(u=>u.provenance==='gift'),true);
});
test('owner holder attendance records occupancy without consuming sold unit; concurrent and rule guards',async()=>{
  const k=await load();const s={...await allocated(),memberships:[holder()]};
  const input=arrival({unitID:undefined,account:'holder',proofAccount:'holder',holdersAdmitted:true});
  const f=new Scheduler(s);const a=f.prepare(x=>k.recordAttendance(x,input));const b=f.prepare(x=>k.recordAttendance(x,{...input,actionID:'other'}));
  success(f.commit(a));assert.deepEqual(success(f.commit(b)),success(a.decision));
  assert.deepEqual(f.state.units,s.units);assert.equal(f.state.holderAdmissions.length,1);
  assert.equal(k.capacityCount(f.state,'event'),4);
  refusal(k.recordAttendance(s,{...input,holdersAdmitted:false}),'HOLDER_ADMISSION_REQUIRED',s);
});
test('invalid snapshots refuse atomically and input is not mutated',async()=>{
  const k=await load();const s=empty();const p=paid();Object.freeze(p.capabilityDigests);Object.freeze(p);Object.freeze(s);
  success(k.settlePaidUnits(s,p));assert.equal(s.units.length,0);
  for(const q of [0,-1,1.2,Infinity]) refusal(k.settlePaidUnits(s,paid({quantity:q})),'INVALID_INPUT',s);
  refusal(k.settlePaidUnits(s,paid({capabilityDigests:[]})),'INVALID_INPUT',s);
});
test('hardening historical attendance cannot be erased by activation; allocation provenance corruption refuses',async()=>{
  const k=await load();const s=await allocated();const old={...s,units:s.units.map((u,i)=>i===1?{...u,admission:{...u.admission,status:'checked-in' as const,checkedInAt:'historical'}}:u)};
  refusal(k.activateUnit(old,activation()),'REVIEW_REQUIRED',old);
});
test('hardening immutable allocation provenance replay',async()=>{
  const k=await load();const s=await allocated();
  const corrupt={...s,units:s.units.map((u,i)=>i===0?{...u,provenance:'gift' as const}:u)};
  refusal(k.settlePaidUnits(corrupt,paid()),'INTEGRITY',corrupt);
});
test('on-spot combined pure decisions commit together; pending issuance eligibility yields no attendance',async()=>{
  const k=await load();const s=await allocated();const f=new Scheduler(s);
  const combined=f.prepare(state=>{
    const a=k.activateUnit(state,activation({actorMode:'staff-assisted',trustedConsentAccount:'guest'}));
    if(!a.ok)return a;
    return k.recordAttendance(a.state,arrival());
  });
  success(f.commit(combined));assert.equal(f.state.units[1].admission.status,'checked-in');
  const pending=k.activateUnit(s,activation());success(pending);
  refusal(k.recordAttendance(pending.state,arrival({ruleEligible:false})),'EVENT_INELIGIBLE',pending.state);
  assert.equal(pending.state.units[1].admission.status,'claimed');assert.equal(pending.state.memberships[0].status,'reserved');
});
test('held forced-self holder commercial choices remain fixture-only, no second production binding',async()=>{
  const k=await load();const s=k.settlePaidUnits({...empty(),memberships:[holder('buyer')]},paid({buyerHoldsToken:true})).state;
  refusal(k.activateUnit(s,activation({unitID:'order:1',digest:'digest-1',account:'buyer',proofAccount:'buyer',intentAccount:'buyer'})),'ALREADY_HOLDS_TOKEN',s);
  assert.deepEqual(s.memberships, [holder('buyer')]);
  assert.equal(s.intents.length, 0);
  assert.equal(s.units[0].capability.consumed, false);
  assert.equal(s.units[0].entitlement.policyHold?.reason, 'TOKEN_DISPOSITION_UNSELECTED');
  assert.equal(s.units[0].entitlement.disposition,'pending-policy');
});
test('remaining private refusals, invalid rotation and unauthorized link guards',async()=>{
  const k=await load();const s=await allocated();
  refusal(k.activateUnit(s,activation({unitID:'missing'})),'UNAVAILABLE',s);
  const active=k.activateUnit(s,activation()).state;
  refusal(k.activateUnit(active,activation({commandID:'new-command'})),'ALREADY_HOLDS_TOKEN',active);
  for(const patch of [{expectedGeneration:0},{replacementDigest:'digest-2'}])
    refusal(k.regenerateActivationCode(s,{unitID:'order:2',buyer:'buyer',requestID:'r',expectedGeneration:1,replacementDigest:'new',...patch}),'CAPABILITY_INVALID',s);
  refusal(k.regenerateActivationCode(s,{unitID:'order:2',buyer:'buyer',requestID:'',expectedGeneration:1,replacementDigest:'new'}),'INVALID_INPUT',s);
  refusal(k.regenerateActivationCode(s,{unitID:'missing',buyer:'buyer',requestID:'r',expectedGeneration:1,replacementDigest:'new'}),'UNAVAILABLE',s);
  refusal(k.assessGiftLinkEligibility(s,{unitID:'missing',buyer:'buyer'}),'UNAVAILABLE',s);
  refusal(k.assessGiftLinkEligibility(s,{unitID:'order:2',buyer:'other'}),'UNAVAILABLE',s);
  refusal(k.assessGiftLinkEligibility(s,{unitID:'order:1',buyer:'buyer',noNameProposal:true}),'UNAVAILABLE',s);
  refusal(k.assessGiftLinkEligibility(active,{unitID:'order:2',buyer:'buyer',noNameProposal:true}),'UNAVAILABLE',active);
  refusal(k.recordAttendance(s,arrival({unitID:'missing'})),'UNAVAILABLE',s);
  refusal(k.recordAttendance(s,arrival({unitID:undefined,holdersAdmitted:true})),'HOLDER_ADMISSION_REQUIRED',s);
});
test('logical replay ignores property insertion order; known forced-self holder hold retains affected paid right',async()=>{
  const k=await load();const p=paid();const s=k.settlePaidUnits(empty(),p).state;
  const reordered=Object.fromEntries(Object.entries(p).reverse()) as typeof p;
  success(k.settlePaidUnits(s,reordered));
  const held=k.settlePaidUnits(empty(),paid({buyerHoldsToken:true})).state;
  const hold=held.units[0].entitlement.policyHold;
  assert.equal(hold?.reason,'TOKEN_DISPOSITION_UNSELECTED');assert.equal(hold?.affectedRight,s.units[0].entitlement.id);
  const a=activation();const d=k.activateUnit(s,a);success(d);
  success(k.activateUnit(d.state,Object.fromEntries(Object.entries(a).reverse()) as typeof a));
  assert.equal(d.state.units[1].entitlement.policyHold,undefined);
});
test('holder attendance financial/benefit hold is authoritative even without sold unit',async()=>{
  const k=await load();const s={...await allocated(),memberships:[holder()]};
  refusal(k.recordAttendance(s,arrival({unitID:undefined,account:'holder',proofAccount:'holder',holdersAdmitted:true,financialHold:true})),'FINANCIAL_HOLD',s);
});
test('one verified payment cannot allocate a second order under a changed order identity',async()=>{
  const k=await load();const s=await allocated();
  refusal(k.settlePaidUnits(s,paid({orderID:'alias',transactionID:'tx-order'})),'INTEGRITY',s);
});
test('holder refusal cannot reveal gift existence, activation or financial state',async()=>{
  const k=await load();const original=await allocated();
  const active=k.activateUnit(original,activation({account:'other',proofAccount:'other',intentAccount:'other'})).state;
  for(const unitID of ['order:2','missing']){
    const s={...active,memberships:[...active.memberships,holder('guest')]};
    refusal(k.activateUnit(s,activation({unitID,commandID:'holder-probe'})),'ALREADY_HOLDS_TOKEN',s);
  }
  const held={...original,memberships:[holder('guest')],units:original.units.map(u=>({...u,financialHold:true}))};
  refusal(k.activateUnit(held,activation()),'ALREADY_HOLDS_TOKEN',held);
});
test('holder with another accounts command identity gets the same private holder refusal',async()=>{
  const k=await load();const active=k.activateUnit(await allocated(),activation({account:'other',proofAccount:'other',intentAccount:'other'})).state;
  const s={...active,memberships:[...active.memberships,holder('guest')]};
  refusal(k.activateUnit(s,activation()),'ALREADY_HOLDS_TOKEN',s);
});

// Rework cycle 1: each defect is asserted before changing the production decision.
for (const kind of ['available','self','held','review','bound','activated','missing'] as const) {
  test('rework 1 bearer privacy before unit-state refusal: ' + kind, async () => {
    const k=await load(); const initial=await allocated();
    const states={
      available:initial,
      self:initial,
      held:{...initial,units:initial.units.map(u=>({...u,financialHold:true}))},
      review:{...initial,units:initial.units.map(u=>({...u,admission:{...u.admission,status:'checked-in' as const,checkedInAt:'historical'}}))},
      bound:{...initial,units:initial.units.map(u=>({...u,admission:{...u.admission,account:'other'}}))},
      activated:k.activateUnit(initial,activation({account:'other',proofAccount:'other',intentAccount:'other'})).state,
      missing:initial,
    };
    const s=states[kind]; const unitID=kind==='missing'?'absent':kind==='self'?'order:1':'order:2';
    refusal(k.activateUnit(s,activation({unitID,digest:'wrong'})),'UNAVAILABLE',s);
    refusal(k.activateUnit(s,activation({unitID,generation:99})),'UNAVAILABLE',s);
  });
}
test('rework 1 buyer-link refusals do not reveal missing versus non-owned units',async()=>{
  const k=await load(); const s=await allocated();
  for(const unitID of ['missing','order:1','order:2']){
    refusal(k.regenerateActivationCode(s,{unitID,buyer:'intruder',requestID:'r',expectedGeneration:1,replacementDigest:'new'}),'UNAVAILABLE',s);
    refusal(k.assessGiftLinkEligibility(s,{unitID,buyer:'intruder',noNameProposal:true}),'UNAVAILABLE',s);
  }
});
test('rework 1 settlement replay ignores changed first-settlement holder evidence',async()=>{
  const k=await load();const p=paid({holdersAdmitted:true});const settled=k.settlePaidUnits(empty(),p);success(settled);
  const incoming=k.settlePaidUnits(settled.state,paid({orderID:'incoming-token',buyer:'sender',event:'other-event'}));success(incoming);
  const activated=k.activateUnit(incoming.state,activation({unitID:'incoming-token:2',account:'buyer',proofAccount:'buyer',intentAccount:'buyer'}));success(activated);
  const replay=k.settlePaidUnits(activated.state,{...p,buyerHoldsToken:true,holdersAdmitted:false});
  assert.deepEqual(success(replay),success(settled));assert.equal(replay.state,activated.state);
  assert.equal(replay.state.units[0].provenance,'self');assert.equal(replay.state.intents.length,1);
});
for(const corruption of ['membership','entitlement','admission','capability','intent','admission-id','slot-status'] as const) test('rework 1 corrupt activation replay '+corruption,async()=>{
  const k=await load();const active=k.activateUnit(await allocated(),activation());success(active);
  let s:KernelState=active.state;
  if(corruption==='membership')s={...s,memberships:[]};
  if(corruption==='entitlement')s={...s,units:s.units.map(u=>u.id==='order:2'?{...u,entitlement:{...u.entitlement,status:'unactivated' as const}}:u)};
  if(corruption==='admission')s={...s,units:s.units.map(u=>u.id==='order:2'?{...u,admission:{...u.admission,account:'different'}}:u)};
  if(corruption==='capability')s={...s,units:s.units.map(u=>u.id==='order:2'?{...u,capability:{...u.capability,consumed:false}}:u)};
  if(corruption==='intent')s={...s,intents:s.intents.map(i=>({...i,operationID:'corrupt-operation'}))};
  if(corruption==='admission-id')s={...s,units:s.units.map(u=>u.id==='order:2'?{...u,admission:{...u.admission,id:'corrupt-id'}}:u)};
  if(corruption==='slot-status')s={...s,memberships:s.memberships.map(m=>({...m,status:'confirmed' as const,membershipReference:undefined}))};
  refusal(k.activateUnit(s,activation()),'INTEGRITY',s);
});
for(const corruption of ['membership','timestamp','activation','intent'] as const) test('rework 1 corrupt paid attendance replay '+corruption,async()=>{
  const k=await load();const attended=k.recordAttendance(k.activateUnit(await allocated(),activation()).state,arrival());success(attended);
  let s:KernelState=attended.state;
  if(corruption==='membership')s={...s,memberships:[]};
  if(corruption==='timestamp')s={...s,units:s.units.map(u=>u.id==='order:2'?{...u,admission:{...u.admission,checkedInAt:undefined}}:u)};
  if(corruption==='activation')s={...s,units:s.units.map(u=>u.id==='order:2'?{...u,entitlement:{...u.entitlement,status:'unactivated' as const}}:u)};
  if(corruption==='intent')s={...s,intents:[]};
  refusal(k.recordAttendance(s,arrival()),'INTEGRITY',s);
});
for(const corruption of ['membership','timestamp','identity','duplicate'] as const) test('rework 1 corrupt holder attendance replay '+corruption,async()=>{
  const k=await load();const input=arrival({unitID:undefined,account:'holder',proofAccount:'holder',holdersAdmitted:true});
  const attended=k.recordAttendance({...await allocated(),memberships:[holder()]},input);success(attended);
  let s:KernelState=attended.state;
  if(corruption==='membership')s={...s,memberships:[]};
  if(corruption==='timestamp')s={...s,holderAdmissions:s.holderAdmissions.map(a=>({...a,checkedInAt:''}))};
  if(corruption==='identity')s={...s,holderAdmissions:s.holderAdmissions.map(a=>({...a,id:'corrupt'}))};
  if(corruption==='duplicate')s={...s,holderAdmissions:[...s.holderAdmissions,...s.holderAdmissions]};
  refusal(k.recordAttendance(s,input),'INTEGRITY',s);
});
test('rework 1 activation cannot overwrite another account admission occupancy',async()=>{
  const k=await load();const initial=await allocated();const s={...initial,units:initial.units.map(u=>u.id==='order:2'?{...u,admission:{...u.admission,account:'other'}}:u)};
  refusal(k.activateUnit(s,activation()),'INTEGRITY',s);
});
test('rework 1 client timestamp refresh returns original activation result',async()=>{
  const k=await load();const first=k.activateUnit(await allocated(),activation());success(first);
  const retry=k.activateUnit(first.state,activation({at:'2026-11-14T10:00:00Z'}));
  assert.deepEqual(success(retry),success(first));assert.equal(retry.state,first.state);
  assert.equal(success(retry).activatedAt,activation().at);
});
test('rework 1 unknown runtime actor mode is refused before binding',async()=>{
  const k=await load();const s=await allocated();
  refusal(k.activateUnit(s,activation({actorMode:'unknown' as never})),'INVALID_INPUT',s);
});
for(const pastEvent of [false,true]) test('01 rework 1 already-holder and past-event paid settlement '+pastEvent,async()=>{
  const k=await load();const p=paid({event:pastEvent?'past-event':'event',buyerHoldsToken:true,holdersAdmitted:true});
  const s={...empty(),memberships:[holder('buyer')]};const d=k.settlePaidUnits(s,p);
  assert.equal(success(d).length,p.quantity);assert.equal(d.state.units.every(u=>u.provenance==='gift'),true);
  assert.equal(d.state.units.every(u=>u.entitlement.policyHold===undefined),true);
  assert.equal(d.state.units.every(u=>u.entitlement.status==='unactivated'),true);
  assert.deepEqual(d.state.memberships,s.memberships);assert.equal(d.state.intents.length,0);
  assert.equal(k.capacityCount(d.state,p.event),p.quantity);
  assert.equal(k.settlePaidUnits(d.state,p).state,d.state);
});
test('rework 1 holder attendance refuses own reserved sold occupancy without consuming anything',async()=>{
  const k=await load();const s={...await allocated(),memberships:[holder('buyer')]};
  refusal(k.recordAttendance(s,arrival({unitID:undefined,account:'buyer',proofAccount:'buyer',holdersAdmitted:true})),'EVENT_ALREADY_BOUND',s);
});
test('rework 1 recorded holder occupancy blocks later gift activation even if slot history is absent',async()=>{
  const k=await load();const input=arrival({unitID:undefined,account:'holder',proofAccount:'holder',holdersAdmitted:true});
  const attended=k.recordAttendance({...await allocated(),memberships:[holder()]},input);success(attended);
  const a=activation({account:'holder',proofAccount:'holder',intentAccount:'holder'});
  refusal(k.activateUnit(attended.state,a),'ALREADY_HOLDS_TOKEN',attended.state);
  const slotHistoryAbsent={...attended.state,memberships:[]};
  refusal(k.activateUnit(slotHistoryAbsent,a),'EVENT_ALREADY_BOUND',slotHistoryAbsent);
  assert.equal(slotHistoryAbsent.units[1].capability.consumed,false);
});
test('rework 1 token policy hold only remains for known forced-self holder disposition',async()=>{
  const k=await load();
  for(const p of [paid(),paid({buyerHoldsToken:true,holdersAdmitted:true})]){
    const d=k.settlePaidUnits(empty(),p);success(d);
    assert.equal(d.state.units.every(u=>u.entitlement.policyHold===undefined),true);
    assert.equal(d.state.units.every(u=>u.entitlement.disposition==='acquisition'),true);
  }
  const held=k.settlePaidUnits(empty(),paid({buyerHoldsToken:true}));success(held);
  assert.equal(held.state.units[0].entitlement.policyHold?.reason,'TOKEN_DISPOSITION_UNSELECTED');
  assert.equal(held.state.units.slice(1).every(u=>u.entitlement.policyHold===undefined),true);
});
test('rework 1 known gap: tokenless self reservation survives becoming a confirmed holder elsewhere',async()=>{
  const k=await load();let s=await allocated();
  s=k.settlePaidUnits(s,paid({orderID:'other-token',buyer:'sender',event:'other-event'})).state;
  const bound=k.activateUnit(s,activation({unitID:'other-token:2',account:'buyer',proofAccount:'buyer',intentAccount:'buyer'}));success(bound);
  // Authoritative confirmation fixture only; no issuer/P2b execution is selected.
  const confirmed={...bound.state,memberships:bound.state.memberships.map(m=>({...m,status:'confirmed' as const,membershipReference:'confirmed-token'}))};
  refusal(k.activateUnit(confirmed,activation({unitID:'order:1',digest:'digest-1',commandID:'self-after-holder',account:'buyer',proofAccount:'buyer',intentAccount:'buyer'})),'ALREADY_HOLDS_TOKEN',confirmed);
  refusal(k.recordAttendance(confirmed,arrival({unitID:undefined,account:'buyer',proofAccount:'buyer',holdersAdmitted:true})),'EVENT_ALREADY_BOUND',confirmed);
  assert.equal(confirmed.units[0].provenance,'self');assert.equal(confirmed.units[0].admission.account,'buyer');
  assert.equal(confirmed.units[0].capability.consumed,false);
});
