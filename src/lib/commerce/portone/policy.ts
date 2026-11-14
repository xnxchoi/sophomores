/** Owner-approved server policy. Never populated from request data. */
export const reconciliationPolicy = Object.freeze({
  providerDeadlineMs: 10_000,
  foregroundWaitMs: 30_000,
  recheckDelaysMs: Object.freeze([2_000, 5_000, 15_000, 60_000, 300_000, 1_800_000]),
  ordinaryGets: 12,
  riskGets: 4,
  lifetimeMs: 86_400_000,
  globalGetsPerSecond: 5,
  escalationMs: 1_800_000,
})
