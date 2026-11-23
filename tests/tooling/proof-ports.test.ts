import assert from "node:assert/strict";
import { createServer } from "node:net";
import test from "node:test";
import { portHolder, proofTargets } from "../support/proof-ports.mjs";

test("proof ports sit below the macOS ephemeral range, unique and clear of 3000 and 5432", () => {
  const ports = Object.values(proofTargets).map(({ port }): number => port);
  assert.equal(new Set(ports).size, ports.length);
  for (const port of ports) {
    assert.ok(port >= 1024 && port < 49152, `port ${port}`);
    assert.ok(port !== 3000 && port !== 5432, `port ${port}`);
  }
});

test("the port pre-check names the process holding a port, and passes a free one", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen({ host: "127.0.0.1", port: 0 }, resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    // lsof names this test's own process; without lsof the bind test still reports it.
    assert.match(await portHolder(address.port) ?? "", new RegExp(`^port ${address.port} in use`));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  assert.equal(await portHolder(address.port), null);
});
