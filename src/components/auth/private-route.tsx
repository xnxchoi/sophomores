import { connection } from "next/server";
import { PrivatePageGuard } from "./private-page-guard";

/**
 * Mounted beside the content of every private page's layout (src/lib/member-auth/private-pages.ts): the route always
 * renders per request (so Next sends it private, no-store, as well as the proxy), and PrivatePageGuard looks after it
 * in the browser, knowing which member the page was rendered for.
 */
export async function PrivateRoute() {
  await connection();
  // Loaded here, not at module load: layouts stay importable without the Payload configuration (layout tests).
  const { currentUser } = await import("@/lib/auth/server");
  const user = await currentUser();
  return <PrivatePageGuard principal={user ? String(user.id) : null} />;
}
