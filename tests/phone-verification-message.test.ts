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

test("missing MIME Message-ID accepts only a trusted numeric provider reference", async () => {
  const withoutId = mime().replace(
    "Message-ID: <synthetic@fixture.invalid>\r\n",
    ""
  );
  const providerMessageId = "1711540357880100001";
  const result = await parseCarrierMessage(withoutId, {
    recipient: "verify@sophomores.co",
    providerMessageId
  });
  assert.deepEqual(result, {
    phone: "+821012345678",
    token,
    carrier: "skt",
    messageId: `zoho:${providerMessageId}`
  });
  assert.equal(productionCarrierTrust(result).approved, false);
  await assert.rejects(
    parseCarrierMessage(withoutId, { recipient: "verify@sophomores.co" })
  );
  for (const invalidId of [
    "",
    "0",
    "01",
    "-1",
    "1.2",
    "1e3",
    " 123",
    "123\n",
    "zoho:123",
    "1".repeat(31),
    null,
    123,
    {},
    undefined
  ]) {
    await assert.rejects(
      parseCarrierMessage(withoutId, {
        recipient: "verify@sophomores.co",
        providerMessageId: invalidId as string
      })
    );
  }
  for (const validId of ["1", "9".repeat(30)]) {
    assert.equal(
      (
        await parseCarrierMessage(withoutId, {
          recipient: "verify@sophomores.co",
          providerMessageId: validId
        })
      ).messageId,
      `zoho:${validId}`
    );
  }
});

test("provider fallback never replaces an existing or unusable MIME Message-ID", async () => {
  const options = {
    recipient: "verify@sophomores.co",
    providerMessageId: "1711540357880100001"
  };
  assert.equal(
    (await parseCarrierMessage(mime(), options)).messageId,
    "<synthetic@fixture.invalid>"
  );
  for (const header of ["", `<${"a".repeat(256)}> `]) {
    await assert.rejects(
      parseCarrierMessage(
        mime().replace("<synthetic@fixture.invalid>", header),
        options
      )
    );
  }
  await assert.rejects(
    parseCarrierMessage(
      mime(undefined, undefined, "Message-ID: <other@fixture.invalid>\r\n"),
      options
    )
  );
  await assert.rejects(
    parseCarrierMessage(mime(), {
      ...options,
      providerMessageId: "not-a-zoho-id"
    })
  );
});

test("missing MIME Message-ID fallback preserves strict carrier evidence checks", async () => {
  for (const raw of [
    mime("01012345678@evil.emms.nate.com"),
    mime().replace(
      "To: <verify@sophomores.co>",
      "To: <concierge@sophomores.co>"
    ),
    mime(undefined, `SPHMRS ${token}\nSPHMRS ${token}`),
    mime(undefined, undefined, "Cc: <other@fixture.invalid>\r\n"),
    mime(undefined, undefined, "In-Reply-To: <other@fixture.invalid>\r\n")
  ]) {
    await assert.rejects(
      parseCarrierMessage(
        raw.replace("Message-ID: <synthetic@fixture.invalid>\r\n", ""),
        {
          recipient: "verify@sophomores.co",
          providerMessageId: "1711540357880100001"
        }
      )
    );
  }
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
