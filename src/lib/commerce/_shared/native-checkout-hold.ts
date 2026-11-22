import { APIError, type PayloadRequest } from "payload";

class NativeCheckoutHeld extends APIError {
  constructor() { super("Variants unavailable", 409); }
}

// This scope is established by the trusted initiate wrapper, not req.data/context.
const initiateScopes = new WeakMap<PayloadRequest, NativeCheckoutHeld | null>();

export function rejectHeldNativeCheckout(req: PayloadRequest): never {
  const refusal = new NativeCheckoutHeld();
  if (initiateScopes.has(req)) initiateScopes.set(req, refusal);
  throw refusal;
}

/** The installed handler masks adapter errors. Rethrow the exact hold inside the rollback boundary. */
export async function preserveNativeCheckoutHold(req: PayloadRequest, initiate: () => Response | Promise<Response>): Promise<Response> {
  initiateScopes.set(req, null);
  try {
    const response = await initiate();
    const refusal = initiateScopes.get(req);
    if (refusal) throw refusal;
    return response;
  } finally {
    initiateScopes.delete(req);
  }
}
