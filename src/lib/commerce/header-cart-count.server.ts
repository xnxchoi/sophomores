import "server-only";
import type { Payload } from "payload";
import { z } from "zod";
import { getPayloadMemberRuntime } from "@/lib/member-auth/payload-runtime";

/**
 * How many lines the signed-in member's open cart holds, for the header (Cordy, 26 Nov): a count only, never the cart.
 * Null when there is no verified member session or the read fails, so the header shows no count rather than a wrong
 * one. Request-scoped like readHeaderMemberState: the layout that reads it is dynamic (sent no-store), and nothing here
 * is cached, serialized or kept in the browser.
 */
export async function readHeaderMemberCartLines(headers: Headers): Promise<number | null> {
  try {
    const runtime = getPayloadMemberRuntime();
    if (!runtime) return null;
    const principal = await runtime.toMemberPrincipal(new Request(runtime.config.origin, { headers }));
    if (!principal) return null;
    const { getPayload } = await import("@/payload");
    return await countMemberCartLines(await getPayload(), principal.userId);
  } catch {
    console.error("Header cart count could not be loaded.");
    return null;
  }
}

const openCart = z.object({ items: z.array(z.unknown()).nullish() });

/**
 * SYSTEM read scoped to one verified member: the users.cart join the plugin's client uses (open cart only, newest first,
 * one doc; src/lib/commerce/ecommerce.ts), answered as a line count.
 */
export async function countMemberCartLines(payload: Payload, userId: string): Promise<number | null> {
  // The cart join is added by the commerce plugin at config time, so its select/joins keys aren't in the generated types.
  const user = await payload.findByID({ collection: "users", id: userId, overrideAccess: true, disableErrors: true,
    depth: 1, select: { cart: true } as never, joins: { cart: { limit: 1 } } as never }) as { id?: unknown; cart?: { docs?: unknown[] } } | null;
  if (!user || String(user.id) !== userId) return null;
  const doc = user.cart?.docs?.[0];
  if (doc == null) return 0;
  const cart = openCart.safeParse(doc);
  return cart.success ? cart.data.items?.length ?? 0 : null;
}
