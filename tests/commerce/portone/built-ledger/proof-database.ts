/*
 * The built-ledger smoke may write only to a disposable local database (Review-A, 25 Nov, MEDIUM): pg-connection-string
 * lets query options (host=, hostaddr=, options=...) override the URL's hostname, so a "local" URL with a query can
 * reach a remote server. Accepted: postgres:// or postgresql://, host exactly 127.0.0.1 or localhost, no query, no
 * fragment, one path segment ending in "_proof". Anything else is refused before any connection is made.
 */
export function assertLocalProofDatabase(value: string | undefined): void {
  let url: URL;
  try { url = new URL(value ?? ""); } catch { throw new Error("Refused: DATABASE_URI is not a URL"); }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") throw new Error("Refused: not a postgres URL");
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") throw new Error("Refused: not a local database host");
  if (url.search !== "" || (value ?? "").includes("?") || url.hash !== "" || (value ?? "").includes("#")) throw new Error("Refused: query or fragment options are not allowed");
  if (!/^\/[A-Za-z0-9_]+_proof$/.test(url.pathname)) throw new Error("Refused: the database name must end in _proof");
}
