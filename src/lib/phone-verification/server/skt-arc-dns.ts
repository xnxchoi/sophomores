import { Resolver } from "node:dns/promises";
import { createHash } from "node:crypto";

export interface ArcTxtResolver {
  resolveTxt(host: string): Promise<string[][]>;
  cancel(): void;
}

/** Check decoded public-key bytes, not a PEM string or a caller-controlled header. */
export function requirePinnedLegacyKey(
  host: string,
  records: string[][],
  pin: { selector: string; sha256: string }
): string[][] {
  if (
    host.toLowerCase().replace(/\.$/, "") !==
      `${pin.selector}._domainkey.zohomail.com` ||
    records.length !== 1
  )
    throw new Error("Unpinned legacy ARC selector");
  const tags = records[0]
    .join("")
    .split(";")
    .map((tag) => tag.trim());
  const keys = tags.filter((tag) => /^p\s*=/i.test(tag));
  if (keys.length !== 1) throw new Error("Ambiguous legacy ARC key");
  const encoded = keys[0].replace(/^p\s*=\s*/i, "").replace(/\s/g, "");
  if (
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) ||
    createHash("sha256")
      .update(Buffer.from(encoded, "base64"))
      .digest("hex") !== pin.sha256
  )
    throw new Error("Unpinned legacy ARC key");
  return records;
}

/** Dedicated, cancellable DNS context: never reuse the process-wide resolver. */
export function createArcDns(
  dns: ArcTxtResolver = new Resolver(),
  limits: { deadlineMs?: number; maxQueries?: number } = {}
) {
  const deadlineMs = Math.min(5000, limits.deadlineMs ?? 5000);
  const maxQueries = Math.min(4, limits.maxQueries ?? 4);
  if (
    !Number.isFinite(deadlineMs) ||
    deadlineMs < 1 ||
    !Number.isInteger(maxQueries) ||
    maxQueries < 1
  )
    throw new Error("Invalid ARC limits");
  let queries = 0;
  let closed = false;
  let rejectDeadline: (error: Error) => void = () => {};
  const deadline = new Promise<never>((_, reject) => {
    rejectDeadline = reject;
  });
  // The caller always races this promise immediately, including no-DNS cases.
  const timer = setTimeout(() => {
    closed = true;
    dns.cancel();
    rejectDeadline(new Error("ARC deadline exceeded"));
  }, deadlineMs);
  return {
    deadline,
    async resolver(host: string, rrtype: string): Promise<string[][]> {
      if (
        closed ||
        rrtype !== "TXT" ||
        !/^[a-z0-9][a-z0-9_-]{0,62}\._domainkey\.zohomail\.com\.?$/i.test(
          host
        ) ||
        ++queries > maxQueries
      )
        throw new Error("ARC DNS lookup refused");
      const records = await dns.resolveTxt(host);
      if (closed || !Array.isArray(records) || records.length > 32)
        throw new Error("Invalid ARC DNS response");
      let bytes = 0;
      for (const row of records) {
        if (!Array.isArray(row) || row.length > 64)
          throw new Error("Invalid ARC DNS response");
        for (const value of row) {
          if (
            typeof value !== "string" ||
            (bytes += Buffer.byteLength(value)) > 16384
          )
            throw new Error("ARC DNS response too large");
        }
      }
      return records;
    },
    close() {
      closed = true;
      clearTimeout(timer);
      dns.cancel();
    }
  };
}
