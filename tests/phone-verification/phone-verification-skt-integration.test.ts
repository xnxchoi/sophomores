import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, randomInt } from "node:crypto";
import test from "node:test";
import { sealMessage } from "mailauth/lib/arc";
import { Pool } from "pg";
import {
  createPhoneVerificationHandlers,
  SESSION_COOKIE
} from "@/lib/phone-verification/server/http";
import { PgPhoneVerificationRepository } from "@/lib/phone-verification/server/postgres";
import { PhoneVerificationService } from "@/lib/phone-verification/server/service";
import { verifySktZohoArc } from "@/lib/phone-verification/server/skt-arc";
import { processNextZohoDelivery } from "@/lib/phone-verification/server/worker";

const url = process.env.PHONE_VERIFICATION_TEST_DATABASE_URL;
function requireIsolatedDatabaseUrl(value: string): void {
  const candidate = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(candidate.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(candidate.hostname) ||
    !/^\/sophomores_verification_(?:local|test(?:_[a-z0-9_]+)?)$/.test(
      candidate.pathname
    ) ||
    candidate.search ||
    candidate.hash
  )
    throw new Error("Tests require an isolated local test database");
}
if (url) requireIsolatedDatabaseUrl(url);

const recipient = "verify@sophomores.co";
const policyVersion = "local-skt-zoho-arc-v1";
const origin = "http://127.0.0.1:3217";
const session = () => randomBytes(32).toString("base64url");
const reference = () => String(randomInt(100_000_000, 999_999_999));

test(
  "PostgreSQL: signed SKT evidence flows through worker, denies tampering/replay and exposes no HTTP proof",
  { skip: !url },
  async () => {
    const pool = new Pool({ connectionString: url, max: 2 });
    try {
      const repository = new PgPhoneVerificationRepository(pool);
      await repository.migrate();
      const mailboxId = reference();
      const service = new PhoneVerificationService(repository, {
        secret: randomBytes(32).toString("hex"),
        recipient,
        mailboxId
      });
      const key = generateKeyPairSync("rsa", { modulusLength: 2048 });
      const record = `v=DKIM1; k=rsa; p=${key.publicKey.export({ type: "spki", format: "der" }).toString("base64")}`;
      const dns = {
        async resolveTxt(host: string) {
          assert.equal(host, "test._domainkey.zohomail.com");
          return [[record]];
        },
        cancel() {}
      };
      const handlers = createPhoneVerificationHandlers({
        service,
        deliveries: repository,
        origin,
        mailboxId,
        transport: "zoho-poll",
        webhookSecret: "synthetic-unused-webhook-secret",
        zohoUserId: "123456789",
        zohoIntegrationId: "234567891"
      });
      for (const [index, scenario] of [
        "policy-disabled",
        "valid-skt",
        "body-tamper",
        "wrong-envelope-number",
        "kt-denied",
        "lgu-denied"
      ].entries()) {
        const phone = `0101234567${index}`;
        const owner = session();
        const challenge = await service.issue({
          sessionToken: owner,
          phone,
          ipKey: owner
        });
        const domain =
          scenario === "kt-denied"
            ? "ktfmms.magicn.com"
            : scenario === "lgu-denied"
              ? "lguplus.com"
              : "emms.nate.com";
        const from = `${phone}@${domain}`;
        const envelope =
          scenario === "wrong-envelope-number" ? `01099999999@${domain}` : from;
        const original = `From: ${from}\r\nTo: ${recipient}\r\nSubject: Verification\r\nMessage-ID: <synthetic-${index}@carrier.invalid>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${challenge.body}\r\n`;
        const seal = await sealMessage(original, {
          signingDomain: "zohomail.com",
          selector: "test",
          privateKey: key.privateKey
            .export({ type: "pkcs8", format: "pem" })
            .toString(),
          authResults: `mx.zohomail.com; spf=pass smtp.mailfrom=${envelope}; dmarc=pass header.from=${domain}`,
          headerList: [
            "From",
            "To",
            "Subject",
            "Message-ID",
            "MIME-Version",
            "Content-Type",
            "Content-Transfer-Encoding"
          ],
          strict: true
        });
        const raw =
          seal.toString() +
          original +
          (scenario === "body-tamper" ? "Injected body text\r\n" : "");
        const delivery = {
          mailboxId,
          messageId: reference(),
          receivedAt: new Date()
        };
        assert.equal(await repository.enqueueDelivery(delivery), true);
        const ports = {
          mailboxId,
          recipient,
          expectedCarrierPolicy:
            scenario === "policy-disabled" ? undefined : policyVersion,
          authenticateCarrier: (
            mime: string,
            message: Parameters<typeof verifySktZohoArc>[1]
          ) => verifySktZohoArc(mime, message, { dns }),
          fetchOriginal: async () => raw,
          service,
          repository: {
            claimDelivery: () =>
              repository.claimDelivery(undefined, undefined, {
                mailboxId,
                messageIds: [delivery.messageId]
              }),
            completeDelivery: repository.completeDelivery.bind(repository),
            failDelivery: repository.failDelivery.bind(repository)
          }
        };
        assert.deepEqual(
          await processNextZohoDelivery(ports),
          { outcome: "completed" },
          scenario
        );
        const expectedState = scenario === "valid-skt" ? "verified" : "review";
        const internal = await service.status({
          sessionToken: owner,
          id: challenge.id
        });
        assert.equal(internal.state, expectedState, scenario);
        assert.equal(
          Boolean(internal.proofToken),
          scenario === "valid-skt",
          scenario
        );
        const response = await handlers.status(
          new Request(
            `${origin}/api/phone-verification/challenges/${challenge.id}`,
            { headers: { cookie: `${SESSION_COOKIE}=${owner}` } }
          ),
          challenge.id
        );
        assert.equal(response.status, 200);
        assert.deepEqual((await response.json()).data, {
          id: challenge.id,
          state: expectedState,
          expiresAt: challenge.expiresAt,
          mode: "trial"
        });
        if (scenario === "valid-skt") {
          const replacement = await service.issue({
            sessionToken: owner,
            phone,
            ipKey: owner
          });
          assert.equal(await repository.enqueueDelivery(delivery), false);
          assert.deepEqual(await processNextZohoDelivery(ports), {
            outcome: "idle"
          });
          assert.equal(
            (await service.status({ sessionToken: owner, id: replacement.id }))
              .state,
            "pending"
          );
          assert.deepEqual(
            await service.match({
              ...delivery,
              phone,
              token: replacement.body.split(" ")[1],
              approved: true,
              policyVersion
            }),
            { outcome: "duplicate" }
          );
          assert.equal(
            (await service.status({ sessionToken: owner, id: replacement.id }))
              .state,
            "pending"
          );
        }
      }
    } finally {
      await pool.end();
    }
  }
);
