/** Six numeric digits. Same check the Hideaway two-factor card used before calling auth. */
export function isSixDigitCode(code: string) {
  return code.length === 6 && /^\d+$/.test(code);
}
