import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { sealMessage } from "mailauth/lib/arc";
import { verifySktZohoArc } from "../../lib/phone-verification/server/skt-arc";

const token = "A".repeat(43);
const sender = "01012345678@emms.nate.com";
const message = {
  phone: "+821012345678",
  carrier: "skt" as const,
  token,
  messageId: "test@carrier"
};
const key = generateKeyPairSync("rsa", { modulusLength: 2048 });
const dnsRecord = `v=DKIM1; k=rsa; p=${key.publicKey.export({ type: "spki", format: "der" }).toString("base64")}`;
const headers = [
  "From",
  "To",
  "Subject",
  "Content-Type",
  "Content-Transfer-Encoding",
  "MIME-Version",
  "Message-ID"
];
const original = (from = sender) =>
  `From: ${from}\r\nTo: verify@sophomores.co\r\nSubject: Verification\r\nMessage-ID: <test@carrier>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 7bit\r\n\r\nSPHMRS ${token}\r\n`;
async function signed(
  options: {
    from?: string;
    auth?: string;
    domain?: string;
    headerList?: string[];
    privateKey?: string;
  } = {}
) {
  const raw = original(options.from);
  const prefix = await sealMessage(raw, {
    signingDomain: options.domain ?? "zohomail.com",
    selector: "test",
    privateKey:
      options.privateKey ??
      key.privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    authResults:
      options.auth ??
      `mx.zohomail.com; spf=pass smtp.mailfrom=${options.from ?? sender}; dmarc=pass header.from=${(options.from ?? sender).split("@")[1]}`,
    headerList: options.headerList ?? headers,
    strict: true
  });
  return prefix.toString() + raw;
}
const options = (record = dnsRecord) => ({
  dns: {
    async resolveTxt() {
      return [[record]];
    },
    cancel() {}
  }
});

test("real 2048-bit Zoho ARC and signed carrier evidence approve SKT only", async () => {
  const result = await verifySktZohoArc(await signed(), message, options());
  assert.equal(result.approved, true);
  assert.equal(result.policyVersion, "local-skt-zoho-arc-v1");
  assert.equal(
    (
      await verifySktZohoArc(
        await signed({ from: "01012345678@vmms.nate.com" }),
        message,
        options()
      )
    ).approved,
    true
  );
  assert.equal(
    (
      await verifySktZohoArc(
        `Authentication-Results: evil.example; spf=fail; dmarc=fail\r\n${await signed()}`,
        message,
        options()
      )
    ).approved,
    true
  );
});

test("crypto tampering with sender, recipient, body or signed AAR fails closed", async () => {
  const raw = await signed();
  for (const modified of [
    raw.replace(`From: ${sender}`, "From: 01099999999@emms.nate.com"),
    raw.replace("To: verify@", "To: other@"),
    raw.replace(`SPHMRS ${token}`, `SPHMRS ${"B".repeat(43)}`),
    raw.replace("spf=pass", "spf=fail"),
    raw.replace(`From: ${sender}`, `From: Forged Display <${sender}>`),
    raw.replace(
      "To: verify@sophomores.co",
      "To: Forged Display <verify@sophomores.co>"
    )
  ]) {
    assert.equal(
      (await verifySktZohoArc(modified, message, options())).approved,
      false
    );
  }
});

test("unsigned, duplicate, forged, incomplete and foreign ARC never approve", async () => {
  const raw = await signed();
  const cases = [
    original(),
    `Authentication-Results: mx.zohomail.com; spf=pass; dmarc=pass\r\n${original()}`,
    raw + "x",
    `From: ${sender}\r\n${raw}`,
    raw.replace(/ARC-Seal:[\s\S]*?(?=ARC-Message-Signature:)/, ""),
    await signed({ domain: "evil.example" }),
    raw.replace(/i=1/g, "i=2"),
    `${raw.match(/^ARC-Seal:[^\r\n]*(?:\r\n[ \t][^\r\n]*)*/m)![0]}\r\n${raw}`,
    raw.replace(
      "ARC-Message-Signature: i=1;",
      "ARC-Message-Signature: i=1; l=1;"
    ),
    `Content-Type: text/plain\r\n${raw}`,
    `Content-Description: unsigned MIME\r\n${raw}`
  ];
  for (const candidate of cases)
    assert.equal(
      (await verifySktZohoArc(candidate, message, options())).approved,
      false
    );
});

test("rejects untrusted AAR origin, SPF, DMARC, envelope and duplicate methods", async () => {
  for (const auth of [
    `evil.example; spf=pass smtp.mailfrom=${sender}; dmarc=pass header.from=emms.nate.com`,
    `mx.zohomail.com; spf=fail smtp.mailfrom=${sender}; dmarc=pass header.from=emms.nate.com`,
    `mx.zohomail.com; spf=pass smtp.mailfrom=${sender}; dmarc=fail header.from=emms.nate.com`,
    "mx.zohomail.com; spf=pass smtp.mailfrom=01099999999@emms.nate.com; dmarc=pass header.from=emms.nate.com",
    `mx.zohomail.com; spf=pass smtp.mailfrom=${sender}; dmarc=pass header.from=nate.com`,
    `mx.zohomail.com; spf=fail; spf=pass smtp.mailfrom=${sender}; dmarc=pass header.from=emms.nate.com`
  ])
    assert.equal(
      (await verifySktZohoArc(await signed({ auth }), message, options()))
        .approved,
      false
    );
});

test("rejects parser-normalized duplicate AAR methods and identities", async () => {
  for (const auth of [
    `mx.zohomail.com; spf=fail; s(comment)pf=pass smtp.mailfrom=${sender}; dmarc=pass header.from=emms.nate.com`,
    `mx.zohomail.com; spf=pass smtp.mailfrom=WRONG smtp.ma(comment)ilfrom=${sender}; dmarc=pass header.from=emms.nate.com`,
    `mx.zohomail.com; spf=fail; s\\pf=pass smtp.mailfrom=${sender}; dmarc=pass header.from=emms.nate.com`,
    `mx.zohomail.com; spf=fail; "spf"=pass smtp.mailfrom=${sender}; dmarc=pass header.from=emms.nate.com`,
    `mx.zohomail.com; spf=pass smtp.mailfrom=WRONG smtp.ma\\ilfrom=${sender}; dmarc=pass header.from=emms.nate.com`,
    `mx.zohomail.com; spf=pass smtp.mailfrom=WRONG smtp."mailfrom"=${sender}; dmarc=pass header.from=emms.nate.com`,
    `mx.zohomail.com; spf=pass smtp.mailfrom=${sender}; dmarc=fail; dm(nested(comment))arc=pass header.from=emms.nate.com`,
    `mx.zohomail.com; spf=pass smtp.mailfrom=${sender}; dmarc=pass header.from=WRONG header.fr(comment)om=emms.nate.com`
  ]) {
    assert.equal(
      (await verifySktZohoArc(await signed({ auth }), message, options()))
        .approved,
      false
    );
  }
});

test("legitimate balanced Zoho SPF comments including escapes remain supported", async () => {
  const auth = `mx.zohomail.com; spf=pass (zohomail.com: domain of ${sender} designates 192.0.2.1 as permitted sender (nested; comment) escaped\\) parenthesis) smtp.mailfrom=${sender}; dmarc=pass header.from=emms.nate.com`;
  assert.equal(
    (await verifySktZohoArc(await signed({ auth }), message, options()))
      .approved,
    true
  );
});

test("Zoho signed DMARC identity permits only exact domain or exact sender mailbox forms", async () => {
  for (const identity of [sender, `<${sender}>`]) {
    const auth = `mx.zohomail.com; spf=pass smtp.mailfrom=${sender}; dmarc=pass header.from=${identity}`;
    assert.equal(
      (await verifySktZohoArc(await signed({ auth }), message, options()))
        .approved,
      true
    );
  }
  for (const identity of [
    "<01099999999@emms.nate.com>",
    "<01012345678@evil.example>",
    `<<${sender}>>`,
    `<${sender}>,<${sender}>`,
    `${sender},${sender}`,
    `<${sender}>extra`,
    "<emms.nate.com>",
    "vmms.nate.com"
  ]) {
    const auth = `mx.zohomail.com; spf=pass smtp.mailfrom=${sender}; dmarc=pass header.from=${identity}`;
    assert.equal(
      (await verifySktZohoArc(await signed({ auth }), message, options()))
        .approved,
      false
    );
  }
});

test("unbalanced, excessive and quoted AAR grammar fails closed", async () => {
  for (const suffix of [
    " (unclosed",
    " )",
    " " + String.fromCharCode(92),
    ' "quoted"',
    " " + "(".repeat(9) + "nested" + ")".repeat(9),
    " (dangling" + String.fromCharCode(92)
  ]) {
    const auth = `mx.zohomail.com; spf=pass smtp.mailfrom=${sender}; dmarc=pass header.from=emms.nate.com${suffix}`;
    assert.equal(
      (await verifySktZohoArc(await signed({ auth }), message, options()))
        .approved,
      false
    );
  }
});

test("requires signed MIME, SKT, same phone/token and bounded valid input", async () => {
  assert.equal(
    (
      await verifySktZohoArc(
        await signed({ headerList: ["From", "To"] }),
        message,
        options()
      )
    ).approved,
    false
  );
  for (const from of [
    "01012345678@lguplus.com",
    "01012345678@ktfmms.magicn.com"
  ])
    assert.equal(
      (await verifySktZohoArc(await signed({ from }), message, options()))
        .approved,
      false
    );
  for (const changed of [
    { ...message, token: "B".repeat(43) },
    { ...message, phone: "01099999999" }
  ])
    assert.equal(
      (await verifySktZohoArc(await signed(), changed, options())).approved,
      false
    );
  for (const raw of [
    null,
    undefined,
    12,
    "",
    "x".repeat(524289),
    "X: y\r\n".repeat(201) + "\r\nbody",
    "X: " + "x".repeat(65536) + "\r\n\r\nbody"
  ])
    assert.equal(
      (await verifySktZohoArc(raw as string, message, options())).approved,
      false
    );
});

test("weak keys, DNS failures, oversized keys and deadlines fail closed", async () => {
  const weak = generateKeyPairSync("rsa", { modulusLength: 1024 });
  const weakRecord = `v=DKIM1; k=rsa; p=${weak.publicKey.export({ type: "spki", format: "der" }).toString("base64")}`;
  assert.equal(
    (
      await verifySktZohoArc(
        await signed({
          privateKey: weak.privateKey
            .export({ type: "pkcs8", format: "pem" })
            .toString()
        }),
        message,
        options(weakRecord)
      )
    ).approved,
    false
  );
  assert.equal(
    (
      await verifySktZohoArc(
        await signed({
          privateKey: weak.privateKey
            .export({ type: "pkcs8", format: "pem" })
            .toString()
        }),
        message,
        { ...options(weakRecord), allowLegacyZohoKey: true }
      )
    ).approved,
    false
  );
  assert.equal(
    (
      await verifySktZohoArc(
        await signed(),
        message,
        options("x".repeat(16385))
      )
    ).approved,
    false
  );
  assert.equal(
    (
      await verifySktZohoArc(await signed(), message, {
        dns: {
          async resolveTxt() {
            throw new Error("private DNS error");
          },
          cancel() {}
        }
      })
    ).approved,
    false
  );
  let cancelled = false;
  assert.equal(
    (
      await verifySktZohoArc(await signed(), message, {
        deadlineMs: 10,
        dns: {
          resolveTxt: () => new Promise(() => {}),
          cancel() {
            cancelled = true;
          }
        }
      })
    ).approved,
    false
  );
  assert.equal(cancelled, true);
});
