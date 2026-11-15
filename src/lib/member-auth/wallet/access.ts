import type { PayloadRequest } from "payload";

// Server-only write capability for member wallets and their challenges. It
// lives outside serializable req.context/body (as withCommerceWrite does), so
// REST, GraphQL and CMS writes cannot forge it.
const writeScopes = new WeakMap<PayloadRequest, number>();
export const walletServerWrite = (req: PayloadRequest): boolean => (writeScopes.get(req) ?? 0) > 0;
export async function withWalletWrite<T>(req: PayloadRequest, work: () => Promise<T>): Promise<T> {
  writeScopes.set(req, (writeScopes.get(req) ?? 0) + 1);
  try { return await work(); }
  finally {
    const remaining = (writeScopes.get(req) ?? 1) - 1;
    if (remaining) writeScopes.set(req, remaining); else writeScopes.delete(req);
  }
}
