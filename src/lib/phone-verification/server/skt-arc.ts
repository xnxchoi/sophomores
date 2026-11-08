import { arc } from "mailauth/lib/arc";
import { dkimVerify } from "mailauth/lib/dkim/verify";
import { simpleParser } from "mailparser";
import { carrierSender, type CarrierTrustDecision } from "./carriers";
import { parseCarrierMessage, type CarrierMessage } from "./message";
import {
  createArcDns,
  requirePinnedLegacyKey,
  type ArcTxtResolver
} from "./skt-arc-dns";

const policyVersion = "local-skt-zoho-arc-v1";
// Public Zoho ARC key observed and cryptographically validated during this local pilot.
// Opt-in remains local-only; key rotation fails closed until independently reviewed.
const legacyZohoKey = Object.freeze({
  selector: "zohoarc",
  sha256: "b06478a771d93ff36cd26463c7e0ed0cd5c7e5d344c7b840f602e5b452fe0397"
});
const reject = (): CarrierTrustDecision => ({
  approved: false,
  policyVersion,
  reason: "Carrier evidence not authenticated"
});
const protectedNames = [
  "from",
  "to",
  "content-type",
  "content-transfer-encoding",
  "mime-version",
  "subject",
  "message-id"
];

/** Match mailauth's comment removal before checking duplicate authentication keys.
 * Quoted/escaped tokens outside comments are intentionally outside this pilot grammar.
 */
function canonicalAar(value: string): string {
  let depth = 0;
  let canonical = "";
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (depth) {
      if (character === "\\") {
        if (++index >= value.length)
          throw new Error("Incomplete ARC comment escape");
      } else if (character === "(") {
        if (++depth > 8) throw new Error("ARC comment nesting exceeded");
      } else if (character === ")") depth--;
      continue;
    }
    if (character === "(") depth = 1;
    else if (
      character === ")" ||
      character === "\\" ||
      character === '"' ||
      !/[\x20-\x7e\t]/.test(character)
    )
      throw new Error("Ambiguous ARC authentication grammar");
    else canonical += character;
  }
  if (depth) throw new Error("Unclosed ARC authentication comment");
  return canonical;
}

function headersOf(raw: string): Map<string, string[]> {
  if (typeof raw !== "string" || !raw || Buffer.byteLength(raw) > 524288)
    throw new Error("Invalid ARC message");
  const end = raw.search(/\r?\n\r?\n/);
  if (end < 0 || Buffer.byteLength(raw.slice(0, end)) > 65536)
    throw new Error("Invalid ARC headers");
  const lines = raw
    .slice(0, end)
    .replace(/\r?\n[ \t]+/g, " ")
    .split(/\r?\n/);
  if (lines.length > 200) throw new Error("Too many ARC headers");
  const entries = new Map<string, string[]>();
  for (const line of lines) {
    const match = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*(.*)$/.exec(line);
    if (!match) throw new Error("Malformed ARC headers");
    const name = match[1].toLowerCase();
    entries.set(name, [...(entries.get(name) ?? []), match[2]]);
  }
  for (const name of entries.keys())
    if (
      (protectedNames.includes(name) || name.startsWith("content-")) &&
      entries.get(name)!.length > 1
    )
      throw new Error("Duplicate protected header");
  for (const name of [
    "from",
    "to",
    "content-type",
    "arc-seal",
    "arc-message-signature",
    "arc-authentication-results"
  ])
    if (entries.get(name)?.length !== 1)
      throw new Error("Missing or duplicate ARC evidence");
  const aar = canonicalAar(entries.get("arc-authentication-results")![0]);
  if (!/^i=1\s*;\s*mx\.zohomail\.com\s*;/i.test(aar))
    throw new Error("Untrusted ARC authority");
  const segments = aar.split(";").slice(2);
  for (const method of ["spf", "dmarc"]) {
    if (
      segments.filter((value) =>
        new RegExp(`^\\s*${method}\\s*=`, "i").test(value)
      ).length !== 1
    )
      throw new Error("Ambiguous ARC results");
  }
  for (const property of ["smtp.mailfrom", "header.from"]) {
    if (
      (
        aar.match(
          new RegExp(`\\b${property.replace(".", "\\.")}\\s*=`, "gi")
        ) ?? []
      ).length !== 1
    )
      throw new Error("Ambiguous ARC identity");
  }
  if (/\bl\s*=/i.test(entries.get("arc-message-signature")![0]))
    throw new Error("Partial ARC body");
  return entries;
}

/** Local SKT phone-possession evidence only; never an identity or registration grant. */
export async function verifySktZohoArc(
  raw: string,
  message: CarrierMessage,
  options: {
    dns?: ArcTxtResolver;
    deadlineMs?: number;
    maxQueries?: number;
    allowLegacyZohoKey?: boolean;
  } = {}
): Promise<CarrierTrustDecision> {
  let context: ReturnType<typeof createArcDns> | undefined;
  try {
    const headers = headersOf(raw);
    const parsed = await parseCarrierMessage(raw, {
      recipient: "verify@sophomores.co",
      providerMessageId: /^zoho:([1-9][0-9]{0,29})$/.exec(
        message.messageId
      )?.[1]
    });
    if (
      parsed.phone !== message.phone ||
      parsed.token !== message.token ||
      parsed.carrier !== "skt" ||
      message.carrier !== "skt"
    )
      return reject();
    const mail = await simpleParser(raw, {
      skipHtmlToText: true,
      skipTextToHtml: true,
      skipImageLinks: true
    });
    const from = mail.from?.value[0]?.address?.toLowerCase();
    if (!from || carrierSender(from)?.carrier !== "skt") return reject();
    context = createArcDns(options.dns, options);
    const boundedResolver = context.resolver;
    const legacy = options.allowLegacyZohoKey === true;
    const resolver = async (host: string, type: string) => {
      const records = await boundedResolver(host, type);
      return legacy
        ? requirePinnedLegacyKey(host, records, legacyZohoKey)
        : records;
    };
    const minBitLength = legacy ? 1024 : 2048;
    const verification = (async () => {
      const dkim = await dkimVerify(raw, {
        strict: true,
        resolver,
        minBitLength
      });
      if (!dkim.arc) return reject();
      const result = await arc(dkim.arc, {
        strict: true,
        resolver,
        minBitLength
      });
      const signature = result.signature;
      const chain = result.chain;
      if (
        result.status.result !== "pass" ||
        result.i !== 1 ||
        !chain ||
        chain.length !== 1 ||
        !signature ||
        signature.status.result !== "pass" ||
        signature.signingDomain !== "zohomail.com" ||
        signature.canonBodyLengthLimited ||
        result.warnings?.length ||
        signature.status.warnings?.length
      )
        return reject();
      const sealDomain = chain[0]["arc-seal"]?.parsed?.d?.value;
      if (sealDomain !== "zohomail.com") return reject();
      if (
        legacy &&
        (signature.algo !== "rsa-sha256" ||
          chain[0]["arc-seal"]?.parsed?.a?.value !== "rsa-sha256")
      )
        return reject();
      const signed =
        signature.signingHeaders?.keys
          ?.split(":")
          .map((name) => name.trim().toLowerCase()) ?? [];
      if (
        [...headers.keys()].some(
          (name) =>
            (protectedNames.includes(name) || name.startsWith("content-")) &&
            !signed.includes(name)
        )
      )
        return reject();
      const auth = result.authenticationResults;
      // Zoho reports either the domain or its exact authenticated From mailbox.
      // Do not parse/suffix-match arbitrary addresses here: retain exact identity.
      const dmarcIdentities = [from.split("@")[1], from, `<${from}>`];
      if (
        auth?.mta !== "mx.zohomail.com" ||
        auth.spf?.result !== "pass" ||
        auth.dmarc?.result !== "pass" ||
        auth.spf?.smtp?.mailfrom !== from ||
        !dmarcIdentities.includes(auth.dmarc?.header?.from)
      )
        return reject();
      return {
        approved: true,
        policyVersion,
        reason: "Authenticated local SKT phone possession evidence"
      };
    })();
    return await Promise.race([verification, context.deadline]);
  } catch {
    return reject();
  } finally {
    context?.close();
  }
}
