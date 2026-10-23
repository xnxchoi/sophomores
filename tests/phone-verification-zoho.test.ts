import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  fetchZohoOriginal,
  fetchZohoVerificationPage,
  exchangeZohoAuthorizationCode,
  parseZohoNotification,
  refreshZohoAccessToken,
  verifyZohoSignature
} from "../lib/phone-verification/server/zoho";

const secret = "synthetic-pinned-secret-for-tests-only";
const payload = Buffer.from(
  '{"messageId":1711540357880100001,"receivedTime":1700000000000,"zuid":12345,"IntegIdList":"67890,"}'
);
const signature = createHmac("sha256", secret).update(payload).digest("base64");
test("Zoho signature covers exact raw bytes and rejects malformed values", () => {
  assert.equal(verifyZohoSignature(payload, signature, secret), true);
  for (const candidate of [
    null,
    "",
    "bad",
    signature + "=",
    signature.replace(/.$/, "a")
  ])
    assert.equal(verifyZohoSignature(payload, candidate, secret), false);
  assert.equal(
    verifyZohoSignature(
      Buffer.concat([payload, Buffer.from(" ")]),
      signature,
      secret
    ),
    false
  );
  assert.equal(verifyZohoSignature(payload, signature, ""), false);
});
test("Zoho notification preserves IDs without persisting body or sender", () => {
  assert.deepEqual(
    parseZohoNotification(payload, { zuid: "12345", integrationId: "67890" }),
    {
      messageId: "1711540357880100001",
      receivedAt: new Date(1700000000000),
      integrationId: "67890"
    }
  );
  for (const raw of [
    "{}",
    '{"messageId":1.2,"receivedTime":1}',
    '{"messageId":"../x","receivedTime":1}',
    '{"messageId":1e18,"receivedTime":1}',
    '{"messageId":"1","receivedTime":-1}',
    '{"messageId":"1","receivedTime":1,"messageId":"2"}',
    "null"
  ])
    assert.throws(() => parseZohoNotification(Buffer.from(raw), {}));
  assert.throws(() => parseZohoNotification(payload, { zuid: "999" }));
  assert.throws(() => parseZohoNotification(payload, { integrationId: "999" }));
});
const base = {
  accountId: "12345",
  mailOrigin: "https://mail.zoho.com",
  tokenProvider: async () => "synthetic-token",
  timeoutMs: 100
};
const searchBase = {
  ...base,
  recipient: "verify@sophomores.co",
  since: new Date(1700000000000),
  until: new Date(1700000300000)
};
const metadata = {
  messageId: "1711540357880100001",
  receivedtime: "1700000100000",
  fromAddress: "01012345678@emms.nate.com",
  toAddress: "&quot;Verification&quot;&lt;verify@sophomores.co&gt;"
};
const searchResponse = (rows: unknown[]) =>
  new Response(
    JSON.stringify({
      status: { code: 200 },
      data: rows
    })
  );

test("metadata search is read-only, pinned, lossless and returns only delivery refs", async () => {
  const page = await fetchZohoVerificationPage({
    ...searchBase,
    fetch: async (url, init) => {
      const target = new URL(String(url));
      assert.equal(target.origin, base.mailOrigin);
      assert.equal(target.pathname, "/api/accounts/12345/messages/search");
      assert.equal(
        target.searchParams.get("searchKey"),
        "to:verify@sophomores.co::fromDate:13-Nov-2023"
      );
      assert.equal(
        target.searchParams.get("receivedTime"),
        String(searchBase.until.getTime())
      );
      assert.equal(target.searchParams.get("start"), "1");
      assert.equal(target.searchParams.get("limit"), "20");
      assert.equal(target.searchParams.get("includeto"), "true");
      assert.equal(init?.method, "GET");
      assert.equal(init?.redirect, "error");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Zoho-oauthtoken synthetic-token"
      );
      return new Response(
        '{"status":{"code":200},"data":[{"messageId":1711540357880100001,"receivedtime":1700000100000,"fromAddress":"01012345678@emms.nate.com","toAddress":"verify@sophomores.co","subject":"DO NOT RETURN"}]}'
      );
    }
  });
  assert.deepEqual(page, {
    deliveries: [
      {
        mailboxId: "12345",
        messageId: metadata.messageId,
        receivedAt: new Date(1700000100000)
      }
    ],
    pageFull: false
  });
});

test("metadata coarse search date uses previous UTC day while precise timestamp filtering remains local", async () => {
  for (const [since, expected] of [
    ["2026-01-01T00:05:00.000Z", "31-Dec-2025"],
    ["2026-03-01T23:59:00.000Z", "28-Feb-2026"],
    ["2024-03-01T00:00:00.000Z", "29-Feb-2024"]
  ]) {
    const windowStart = new Date(since);
    const result = await fetchZohoVerificationPage({
      ...searchBase,
      since: windowStart,
      until: new Date(windowStart.getTime() + 300_000),
      fetch: async (url) => {
        assert.equal(
          new URL(String(url)).searchParams.get("searchKey"),
          `to:verify@sophomores.co::fromDate:${expected}`
        );
        return searchResponse([
          { ...metadata, receivedtime: String(windowStart.getTime() - 1) }
        ]);
      }
    });
    assert.deepEqual(result.deliveries, []);
  }
});

test("metadata accepts exact HTML alias and list epoch variant, not spoofed/multiple recipients", async () => {
  for (const toAddress of [
    metadata.toAddress,
    "verify@sophomores.co",
    "&#34;Verification&#34;&#60;verify@sophomores.co&#62;",
    '"Verification" <verify@sophomores.co>'
  ]) {
    const page = await fetchZohoVerificationPage({
      ...searchBase,
      fetch: async () =>
        searchResponse([
          {
            ...metadata,
            receivedtime: undefined,
            receivedTime: "1700000100000",
            toAddress
          }
        ])
    });
    assert.equal(page.deliveries.length, 1);
  }
  for (const toAddress of [
    "verify@sophomores.co.evil.test",
    "verify@sophomores.co,other@example.com",
    "verify@sophomores.co\r\n",
    "verify@sophomores.co\r\nBcc: other@example.com",
    '"verify@sophomores.co" <other@example.com>',
    "group:verify@sophomores.co;",
    "verify@sophomores.co;",
    "&quot;Group, Name&quot;&lt;verify@sophomores.co&gt;",
    "<verify@sophomores.co><other@example.com>"
  ]) {
    const page = await fetchZohoVerificationPage({
      ...searchBase,
      fetch: async () => searchResponse([{ ...metadata, toAddress }])
    });
    assert.deepEqual(page.deliveries, []);
  }
});

test("metadata filters foreign carrier and out-of-window rows; fullness counts unfiltered rows", async () => {
  const rows = Array.from({ length: 20 }, () => ({
    ...metadata,
    fromAddress: "01012345678@emms.nate.com.evil.test"
  }));
  assert.deepEqual(
    await fetchZohoVerificationPage({
      ...searchBase,
      fetch: async () => searchResponse(rows)
    }),
    { deliveries: [], pageFull: true }
  );
  for (const row of [
    { ...metadata, fromAddress: "other@example.com", messageId: "bad" },
    { ...metadata, fromAddress: "0101234567@emms.nate.com" },
    { ...metadata, receivedtime: "1699999999999" },
    { ...metadata, receivedtime: "1700000300001" }
  ])
    assert.deepEqual(
      (
        await fetchZohoVerificationPage({
          ...searchBase,
          fetch: async () => searchResponse([row])
        })
      ).deliveries,
      []
    );
});

test("metadata rejects unsafe inputs, ambiguous IDs/time and malformed responses", async () => {
  let calls = 0;
  const fetch = async () => {
    calls++;
    return searchResponse([]);
  };
  for (const override of [
    { recipient: "verify@sophomores.co or:all" },
    { recipient: "verify@sophomores.co\n" },
    { accountId: "123/../../999" },
    { mailOrigin: "https://mail.zoho.com.evil.test" },
    { since: new Date(NaN) },
    { until: new Date(1) },
    { since: new Date(0) },
    { start: 0 },
    { start: 1.5 },
    { limit: 21 },
    { limit: 0 },
    { tokenProvider: async () => " " },
    { tokenProvider: async () => "x\ny" }
  ])
    await assert.rejects(
      fetchZohoVerificationPage({ ...searchBase, ...override, fetch }),
      /Zoho request failed/
    );
  assert.equal(calls, 0);
  for (const row of [
    { ...metadata, messageId: "1e18" },
    { ...metadata, messageId: "01" },
    { ...metadata, receivedTime: "1700000200000" },
    { ...metadata, receivedtime: null, receivedTime: "1700000100000" },
    { ...metadata, receivedtime: "9007199254740992" },
    { ...metadata, receivedtime: undefined },
    { ...metadata, receivedtime: "1700000100000.0" }
  ])
    await assert.rejects(
      fetchZohoVerificationPage({
        ...searchBase,
        fetch: async () => searchResponse([row])
      }),
      /Zoho request failed/
    );
  for (const response of [
    new Response("{}"),
    new Response('{"status":{"code":200},"data":{}}'),
    searchResponse(Array(21).fill(metadata)),
    new Response('{"status":{"code":200},"data":[null]}')
  ])
    await assert.rejects(
      fetchZohoVerificationPage({ ...searchBase, fetch: async () => response }),
      /Zoho request failed/
    );
});

test("search throttling fails once without retry and hides provider body", async () => {
  let calls = 0;
  await assert.rejects(
    fetchZohoVerificationPage({
      ...searchBase,
      fetch: async () => {
        calls++;
        return new Response("provider-secret", { status: 429 });
      }
    }),
    /^Error: Zoho request failed$/
  );
  assert.equal(calls, 1);
});

test("authorization code exchange uses POST body and returns only validated refresh token", async () => {
  const options = {
    accountsOrigin: "https://accounts.zoho.eu",
    clientId: "test-client",
    clientSecret: "test-secret",
    code: "test-code"
  };
  assert.deepEqual(
    await exchangeZohoAuthorizationCode({
      ...options,
      fetch: async (url, init) => {
        assert.equal(String(url), "https://accounts.zoho.eu/oauth/v2/token");
        assert.equal(init?.method, "POST");
        assert.equal(init?.redirect, "error");
        const body = new URLSearchParams(String(init?.body));
        assert.equal(body.get("grant_type"), "authorization_code");
        assert.equal(body.get("code"), "test-code");
        assert.equal(body.get("client_secret"), "test-secret");
        return new Response(
          '{"refresh_token":"synthetic-refresh","access_token":"not-returned","scope":"ZohoMail.messages.READ"}'
        );
      }
    }),
    { refreshToken: "synthetic-refresh" }
  );
  for (const override of [
    { code: "" },
    { code: "bad\r\nvalue" },
    { accountsOrigin: "https://evil.test" },
    { clientSecret: " " }
  ])
    await assert.rejects(
      exchangeZohoAuthorizationCode({ ...options, ...override }),
      /Zoho request failed/
    );
  for (const raw of [
    '{"refresh_token":"x","scope":"ZohoMail.messages.ALL"}',
    '{"error":"invalid_code","refresh_token":"x"}',
    '{"refresh_token":" "}',
    '{"refresh_token":"x\\n"}',
    "{}"
  ])
    await assert.rejects(
      exchangeZohoAuthorizationCode({
        ...options,
        fetch: async () => new Response(raw)
      }),
      /Zoho request failed/
    );
});
test("original MIME request uses pinned account and read-only GET", async () => {
  let called = false;
  const raw = await fetchZohoOriginal("1711540357880100001", {
    ...base,
    fetch: async (url, init) => {
      called = true;
      assert.equal(
        String(url),
        "https://mail.zoho.com/api/accounts/12345/messages/1711540357880100001/originalmessage"
      );
      assert.equal(init?.method, "GET");
      assert.equal(init?.redirect, "error");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Zoho-oauthtoken synthetic-token"
      );
      return new Response(
        '{"status":{"code":200},"data":{"messageId":1711540357880100001,"content":"synthetic MIME"}}'
      );
    }
  });
  assert.equal(raw, "synthetic MIME");
  assert.equal(called, true);
});
test("original fetch fails closed for unsafe origin, ids, responses and sizes", async () => {
  for (const mailOrigin of [
    "https://mail.zoho.com.evil.test",
    "http://mail.zoho.com",
    "https://mail.zoho.com/api",
    "https://user@mail.zoho.com"
  ])
    await assert.rejects(fetchZohoOriginal("123", { ...base, mailOrigin }));
  for (const messageId of ["../123", "1e18", "1.1"])
    await assert.rejects(fetchZohoOriginal(messageId, base));
  for (const response of [
    new Response("secret", { status: 500 }),
    new Response("{}"),
    new Response('{"data":{"messageId":"9","content":"x"}}'),
    new Response("123456789", { headers: { "content-length": "9" } })
  ])
    await assert.rejects(
      fetchZohoOriginal("123", {
        ...base,
        maxBytes: 8,
        fetch: async () => response
      }),
      /Zoho request failed/
    );
  await assert.rejects(
    fetchZohoOriginal("123", {
      ...base,
      fetch: async () => {
        throw new Error("secret-token");
      }
    }),
    /Zoho request failed/
  );
});
test("OAuth refresh pins regional endpoint and does not expose provider secrets", async () => {
  const result = await refreshZohoAccessToken({
    accountsOrigin: "https://accounts.zoho.com",
    clientId: "test-client",
    clientSecret: "synthetic-secret",
    refreshToken: "synthetic-refresh",
    fetch: async (url, init) => {
      assert.equal(String(url), "https://accounts.zoho.com/oauth/v2/token");
      assert.equal(init?.method, "POST");
      assert.equal(init?.redirect, "error");
      assert.equal(
        new URLSearchParams(String(init?.body)).get("grant_type"),
        "refresh_token"
      );
      return new Response(
        '{"access_token":"synthetic-access","expires_in":3600,"scope":"ZohoMail.messages.READ"}'
      );
    }
  });
  assert.equal(result.accessToken, "synthetic-access");
  await assert.rejects(
    refreshZohoAccessToken({
      accountsOrigin: "https://evil.test",
      clientId: "a",
      clientSecret: "b",
      refreshToken: "c"
    })
  );
  await assert.rejects(
    refreshZohoAccessToken({
      accountsOrigin: "https://accounts.zoho.com",
      clientId: "a",
      clientSecret: "b",
      refreshToken: "c",
      fetch: async () =>
        new Response(
          '{"access_token":"x","expires_in":1,"scope":"ZohoMail.messages.ALL"}'
        )
    })
  );
});
test("reject oversized/ambiguous notification payload and stream overflow", async () => {
  for (const value of [
    "",
    "x".repeat(65_537),
    "[1]",
    '{"messageId":"1","receivedTime":9007199254740992}',
    '{"messageId":"1","receivedTime":8640000000000001}'
  ])
    assert.throws(() => parseZohoNotification(Buffer.from(value), {}));
  assert.throws(() =>
    parseZohoNotification(payload, { integrationId: "67890,1" })
  );
  assert.throws(() =>
    parseZohoNotification(
      Buffer.from(
        '{"messageId":"1","receivedTime":"1","IntegIdList":"67890,2"}'
      ),
      { integrationId: "67890" }
    )
  );
  const streaming = () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("123456789"));
          controller.close();
        }
      })
    );
  await assert.rejects(
    fetchZohoOriginal("123", {
      ...base,
      maxBytes: 8,
      fetch: async () => streaming()
    })
  );
  await assert.rejects(fetchZohoOriginal("123", { ...base, timeoutMs: 0 }));
  await assert.rejects(
    fetchZohoOriginal("123", {
      ...base,
      tokenProvider: async () => "bad\ntoken"
    })
  );
});

test("early rejected provider responses cancel unread streams", async () => {
  for (const init of [
    { status: 500 },
    { headers: { "content-length": "999" } }
  ]) {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("sensitive provider body"));
      },
      cancel() {
        cancelled = true;
      }
    });
    await assert.rejects(
      fetchZohoOriginal("123", {
        ...base,
        maxBytes: 8,
        fetch: async () => new Response(body, init)
      }),
      /Zoho request failed/
    );
    assert.equal(cancelled, true);
  }
});
