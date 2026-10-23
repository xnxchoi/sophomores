import assert from "node:assert/strict";
import test from "node:test";
import { parseCarrierMessage } from "../lib/phone-verification/server/message";
import { productionCarrierTrust } from "../lib/phone-verification/server/carriers";
const token = `${"A".repeat(41)}_-`;
const mime = (
  from = "01012345678@emms.nate.com",
  body = `SPHMRS ${token}`,
  extra = ""
) =>
  `From: <${from}>\r\nTo: <verify@sophomores.co>\r\nMessage-ID: <synthetic@fixture.invalid>\r\nContent-Type: text/plain; charset=utf-8\r\n${extra}\r\n${body}`;
test("synthetic carrier MIME yields only normalized evidence", async () => {
  for (const [domain, carrier] of [
    ["emms.nate.com", "skt"],
    ["vmms.nate.com", "skt"],
    ["ktfmms.magicn.com", "kt"],
    ["lguplus.com", "lgu"]
  ]) {
    const result = await parseCarrierMessage(
      mime(`01012345678@${domain}`, `SPHMRS ${token}\nCarrier footer`),
      { recipient: "verify@sophomores.co" }
    );
    assert.deepEqual(result, {
      phone: "+821012345678",
      token,
      carrier,
      messageId: "<synthetic@fixture.invalid>"
    });
    assert.equal(productionCarrierTrust(result).approved, false);
  }
});
test("reject spoofed domains, ambiguous senders, recipients and tokens", async () => {
  const bad = [
    mime("01012345678@emms.nate.com.evil.test"),
    mime("01012345678@evil.emms.nate.com"),
    mime("01112345678@emms.nate.com"),
    mime().replace(
      "To: <verify@sophomores.co>",
      "To: <concierge@sophomores.co>"
    ),
    mime().replace(
      "To: <verify@sophomores.co>",
      "To: <verify@sophomores.co>, <other@example.invalid>"
    ),
    mime().replace(
      "From: <01012345678@emms.nate.com>",
      "From: <01012345678@emms.nate.com>, <01099999999@emms.nate.com>"
    ),
    mime(undefined, `SPHMRS ${token}\nSPHMRS ${token}`),
    mime(undefined, `> SPHMRS ${token}`),
    mime(undefined, `Forwarded message\nSPHMRS ${token}`),
    mime(undefined, `hello\nSPHMRS ${token}`),
    mime(undefined, `SPHMRS ${token}\n> quoted message`),
    mime(undefined, undefined, "From: <01099999999@emms.nate.com>\r\n"),
    mime(undefined, undefined, "Subject: Fwd: challenge\r\n")
  ];
  for (const raw of bad)
    await assert.rejects(
      parseCarrierMessage(raw, { recipient: "verify@sophomores.co" }),
      /Invalid verification message/
    );
  await assert.rejects(
    parseCarrierMessage(mime(), {
      recipient: "verify@sophomores.co",
      maxBytes: 8
    })
  );
});
test("reject attachments and missing plaintext without HTML synthesis", async () => {
  const raw = `From: <01012345678@emms.nate.com>\r\nTo: <verify@sophomores.co>\r\nContent-Type: multipart/mixed; boundary=x\r\n\r\n--x\r\nContent-Type: text/plain\r\n\r\nSPHMRS ${token}\r\n--x\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename=x.bin\r\n\r\nx\r\n--x--`;
  await assert.rejects(
    parseCarrierMessage(raw, { recipient: "verify@sophomores.co" })
  );
  await assert.rejects(
    parseCarrierMessage(mime().replace("text/plain", "text/html"), {
      recipient: "verify@sophomores.co"
    })
  );
});
test("reject inherited property domains and forwarding/header ambiguity", async () => {
  const bad = [
    mime("01012345678@constructor"),
    mime().replace("To: <verify@sophomores.co>\r\n", ""),
    mime().replace("Message-ID: <synthetic@fixture.invalid>\r\n", ""),
    mime(undefined, undefined, "Cc: <other@example.invalid>\r\n"),
    mime(undefined, undefined, "Resent-From: <other@example.invalid>\r\n"),
    mime(undefined, undefined, "In-Reply-To: <prior@example.invalid>\r\n"),
    mime(undefined, undefined, "References: <prior@example.invalid>\r\n")
  ];
  for (const raw of bad)
    await assert.rejects(
      parseCarrierMessage(raw, { recipient: "verify@sophomores.co" })
    );
  await assert.rejects(
    parseCarrierMessage(mime(), { recipient: "concierge@sophomores.co" })
  );
});

test("only fixed live alias or non-deliverable local fixture recipient is accepted", async () => {
  const fixture = mime().replace(
    "verify@sophomores.co",
    "verify@example.invalid"
  );
  const parsed = await parseCarrierMessage(fixture, {
    recipient: "verify@example.invalid"
  });
  assert.equal(parsed.token, token);
  await assert.rejects(
    parseCarrierMessage(fixture, { recipient: "verify@sophomores.co" })
  );
  for (const recipient of [
    "concierge@sophomores.co",
    "verify@other.example",
    "concierge@example.invalid"
  ]) {
    await assert.rejects(
      parseCarrierMessage(mime().replace("verify@sophomores.co", recipient), {
        recipient
      })
    );
  }
});
