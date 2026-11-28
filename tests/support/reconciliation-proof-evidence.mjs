export const suite = "I2 disposable PostgreSQL admission, accounting, native fencing and restart";

export const requiredSubtests = Object.freeze([
  "separate processes contend for the same exact attempt and only one starts",
  "two-read official confirmation debits independently before transport and settles once",
  "real Payload isolates legacy backlinks in replay and quarantines a legacy-only pending attempt",
  "native retired Paid case is private and blocks every membership purchase of that account only",
  "a settled Paid case stops holding after verified full cancellation; an unresolved late Paid still holds",
  "FAILED can retire at 31 minutes; rejected PAID retirement does not fence a later Paid webhook",
  "risk reserve remains available after ordinary exhaustion; signed evidence persists",
  "SIGKILL after debit survives restart; expiry never starts overlapping work or clears a hold",
  "real accounted GETs reach 11; a two-read confirmation cannot fit",
  "ledger acquisition and settlement-lock contention stay known without fencing or pool starvation",
  "busy completion and risk retention use durable catch-up without a fixture retry or ownership fence",
  "six financial boundaries saturate the five-connection pool without ledger self-starvation",
  "global five-GET rolling ceiling is shared by three independent processes",
  "budget fit, 24-hour lifetime and 30-minute escalation survive fresh process admission",
  "S0c-2: member reads stay inside the signed-in account across two accounts",
  "music Hardening C: playlist eligibility follows a live admission for the event, on every read",
]);

/** A dedicated Node test reporter: child logs are not evidence. */
export default async function* reconciliationEvidence(events) {
  const passed = [];
  let summary = null;
  for await (const { type, data } of events) {
    if (type === "test:pass" && !data.skip && !data.todo) {
      passed.push({ name: data.name, nesting: data.nesting, file: data.file });
    }
    if (type === "test:summary" && data.file === undefined) {
      summary = { success: data.success, counts: data.counts };
    }
  }
  yield JSON.stringify({ passed, summary }) + "\n";
}

/** Throws on absent, malformed, skipped or partial results, even when the child exited 0. */
export function requireReconciliationEvidence(raw, file) {
  const evidence = JSON.parse(raw);
  const { success, counts } = evidence?.summary ?? {};
  if (success !== true || counts?.topLevel !== 1 || counts.passed !== counts.tests ||
    !Number.isSafeInteger(counts.passed) || counts.passed < requiredSubtests.length + 1 ||
    counts.skipped !== 0 || counts.cancelled !== 0 || counts.todo !== 0 || !Array.isArray(evidence.passed) ||
    evidence.passed.length !== counts.passed || evidence.passed.some((entry) => entry?.file !== file)) {
    throw new Error("Reconciliation did not report a complete passing suite");
  }
  const parents = evidence.passed.filter((entry) => entry.nesting === 0);
  if (parents.length !== 1 || parents[0].name !== suite) {
    throw new Error("The named reconciliation suite did not pass");
  }
  const children = evidence.passed.filter((entry) => entry.nesting === 1);
  if (requiredSubtests.some((name) => children.filter((entry) => entry.name === name).length !== 1)) {
    throw new Error("Required reconciliation subtest evidence is missing or ambiguous");
  }
  return counts.passed;
}
