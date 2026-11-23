import { connection } from "next/server";
import { PrivatePageGuard } from "./private-page-guard";

/**
 * Mounted beside the content of every private page's layout (src/lib/member-auth/private-pages.ts): the route always
 * renders per request (so Next sends it private, no-store, as well as the proxy), and PrivatePageGuard looks after it
 * in the browser.
 */
export async function PrivateRoute() {
  await connection();
  return <PrivatePageGuard />;
}
