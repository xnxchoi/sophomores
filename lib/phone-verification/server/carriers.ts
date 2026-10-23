export type Carrier = "skt" | "kt" | "lgu";
const domains: Readonly<Record<string, Carrier>> = Object.freeze({
  "emms.nate.com": "skt",
  "vmms.nate.com": "skt",
  "ktfmms.magicn.com": "kt",
  "lguplus.com": "lgu"
});

export function carrierSender(
  address: string
): { phone: string; carrier: Carrier } | null {
  const match = /^(010[0-9]{8})@([a-z0-9.-]+)$/.exec(address.toLowerCase());
  const carrier =
    match && Object.hasOwn(domains, match[2]) ? domains[match[2]] : undefined;
  return match && carrier
    ? { phone: `+82${match[1].slice(1)}`, carrier }
    : null;
}

export type CarrierTrustDecision = {
  approved: boolean;
  policyVersion: string;
  reason: string;
};
export function productionCarrierTrust(
  _message: unknown
): CarrierTrustDecision {
  void _message;
  // Neither allowlisted From nor copied Authentication-Results prove that a
  // gateway bound this sender number to the originating SIM. Never auto-grant.
  return {
    approved: false,
    policyVersion: "carrier-ingress-unreviewed-v1",
    reason: "awaiting-reviewed-ingress-and-sender-number-assurance"
  };
}
