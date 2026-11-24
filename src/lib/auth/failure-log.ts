import { MemberError } from "@/lib/member-auth/contracts";

/**
 * Auth failure logging (standard-security baseline). No property value of the thrown error is logged: its name,
 * message, stack, cause and any other property can carry user or database data. The label is one of our own
 * constants, picked by `instanceof` against a closed set of classes. `instanceof` can reach a proxy's prototype trap,
 * so the check runs inside a try: a throwing trap is contained and labelled "Unknown".
 */
const knownClasses = [
  ["MemberError", MemberError],
  ["TypeError", TypeError],
  ["RangeError", RangeError],
  ["SyntaxError", SyntaxError],
  ["ReferenceError", ReferenceError],
  ["Error", Error]
] as const;

export function failureClass(error: unknown): string {
  try {
    for (const [label, type] of knownClasses) if (error instanceof type) return label;
  } catch {
    // A proxy's getPrototypeOf trap threw: the value is not one of ours.
  }
  return "Unknown";
}

/** Logs a fixed label and a fresh correlation ID; returns the ID so a response can carry it. */
export function logAuthFailure(context: string, error: unknown, log: (...values: unknown[]) => void = console.error): string {
  const correlationId = crypto.randomUUID();
  log(context, { errorClass: failureClass(error), correlationId });
  return correlationId;
}
