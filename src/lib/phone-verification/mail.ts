export const mailAuthString = (deviceType: "ios" | "android") => {
  return `${process.env.MAIL_AUTH}${deviceType === "ios" ? ";" : "?"}body=인증 메시지`;
};

export interface ParsedMmsSender {
  rawEmail: string;
  phoneNumber: string; // Normalized '01012345678'
  carrier: KoreanCarrier;
  domain: string;
}

// Regex matching primary and legacy carrier gateway domains]
const SKT_DOMAINSS = {
  "vmms.nate.com": "SKT",
  "emms.nate.com": "SKT",
  "sktmms.nate.com": "SKT"
} as const;
const KT_DOMAINSS = {
  "ktfmms.magicn.com": "KT",
  "magicn.com": "KT"
} as const;
const LGU_DOMAINSS = {
  "mmsmail.uplus.co.kr": "LGU",
  "lguplus.com": "LGU",
  "ez-i.co.kr": "LGU"
} as const;
const MMS_NUMBER_REGEX = /^(?:\+?82|0)?(1[016789]\d{7,8})$/i;
type MM = `${82 | ""}${0 | ""}10${number}`;
const MMS_CARRIER_REGEX =
  /^(?:\+?82|0)?(1[016789]\d{7,8})@([a-z0-9.-]+\.[a-z]{2,})$/i;
const DM_REGEX =
  /^(([a-z0-9]+\.){,2})?(nate|magicn|uplus|lguplus|ez-i)\.(com|co\.kr)$/i;

const testMailIsCarrier = (
  sec: string | CarrierDomain
): sec is CarrierDomain => {
  return DM_REGEX.test(sec);
};
const ttx = (e: string | CarrierDomain): e is CarrierDomain => {
  return DM_REGEX.test(e);
};
type SKT = "SKT";
type KT = "KT";
type LGU = "LGU";
export type KoreanCarrier = SKT | KT | LGU | "UNKNOWN";

type SktDomain = keyof typeof SKT_DOMAINSS;
type KtDomain = keyof typeof KT_DOMAINSS;
type LgUDomain = keyof typeof LGU_DOMAINSS;
type CarrierHost<T extends KoreanCarrier = KoreanCarrier> = {
  [key in T]: key extends SKT
    ? SktDomain
    : key extends KT
      ? KtDomain
      : key extends LGU
        ? LgUDomain
        : never;
}[T];
type CarrierDomain<T extends KoreanCarrier = KoreanCarrier> = CarrierHost<T>;

const CARRIER_DOMAIN_MAP: Record<CarrierDomain, KoreanCarrier> = {
  "vmms.nate.com": "SKT",
  "emms.nate.com": "SKT",
  "sktmms.nate.com": "SKT",
  "ktfmms.magicn.com": "KT",
  "magicn.com": "KT",
  "mmsmail.uplus.co.kr": "LGU",
  "lguplus.com": "LGU",
  "ez-i.co.kr": "LGU"
};

export function parseCarrierMmsSender(
  email: `${string}@${string}`
): ParsedMmsSender | null {
  // Extract pure email address from "From: 01012345678 <01012345678@vmms.nate.com>"
  // const emailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader.trim()];
  // const cleanEmail = (emailMatch[1] || "").trim().toLowerCase();
  const cleanEmail = email.toLowerCase();
  const match = cleanEmail.match(MMS_CARRIER_REGEX);
  if (!match) return null;

  const rawPhone = match[1];
  const domain = match[2];

  // Normalize phone number to 010XXXXXXXX
  const phoneNumber = rawPhone.startsWith("0") ? rawPhone : `0${rawPhone}`;
  const carrier =
    (testMailIsCarrier(domain) && CARRIER_DOMAIN_MAP[domain]) || "UNKNOWN";

  return {
    rawEmail: cleanEmail,
    phoneNumber,
    carrier,
    domain
  };
}
