import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import test from "node:test";

test(
  "review visual fixture is isolated, strict and never creates authentication",
  { timeout: 15_000 },
  async (t) => {
    const reservation = createServer().listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const address = reservation.address();
    assert.ok(address && typeof address === "object");
    const port = address.port;
    await new Promise<void>((resolve) => reservation.close(() => resolve()));
    const origin = `http://127.0.0.1:${port}`;
    const child = spawn(
      process.execPath,
      [
        "--max-old-space-size=512",
        "--import",
        "tsx",
        "tests/support/recovery-review-preview.mjs"
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          PATH: process.env.PATH,
          NODE_ENV: "test",
          GOMAXPROCS: "1",
          RECOVERY_REVIEW_PREVIEW_PORT: String(port)
        }
      }
    );
    const exited = once(child, "exit");
    t.after(async () => {
      if (child.exitCode === null) child.kill("SIGTERM");
      await exited;
    });
    await Promise.race([
      new Promise<void>((resolve) =>
        child.stdout.on("data", (data) => {
          if (String(data).includes(origin)) resolve();
        })
      ),
      exited.then(() => {
        throw new Error("Fixture exited before listening");
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Fixture start timeout")),
          5000
        ).unref()
      )
    ]);
    const request = (path: string, body?: unknown, originHeader = origin) =>
      fetch(origin + path, {
        method: body === undefined ? "GET" : "POST",
        headers: { origin: originHeader, "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    const route =
      "/api/member/recovery/019a4000-0000-7000-8000-000000000001/review";
    const input = {
      expectedRevision: 0,
      status: "needs_proof",
      internalNote: "Synthetic test only"
    };
    const success = await request(route, input);
    assert.equal(success.status, 200);
    assert.equal(success.headers.get("set-cookie"), null);
    assert.deepEqual(await success.json(), {
      success: true,
      data: { revision: 1 }
    });
    assert.equal((await request(route, input)).status, 409);
    assert.equal(
      (await request(route, { ...input, status: "approved" })).status,
      400
    );
    assert.equal(
      (await request(route, input, "https://foreign.invalid")).status,
      403
    );
    assert.equal((await request(route + "?bypass=true", input)).status, 400);
    assert.equal(
      (await request("/api/auth/sign-in/email-otp", {})).status,
      503
    );
    assert.equal(
      (await request("/fixture/state", { mode: "unavailable", delayMs: 0 }))
        .status,
      200
    );
    assert.equal((await request(route, input)).status, 503);
    assert.equal(
      (
        await request("/fixture/state", {
          mode: "success",
          delayMs: 0,
          session: true
        })
      ).status,
      400
    );
    const page = await request("/");
    assert.match(await page.text(), /Synthetic review preview/);
    assert.match(
      page.headers.get("content-security-policy")!,
      /connect-src 'self'/
    );
  }
);
