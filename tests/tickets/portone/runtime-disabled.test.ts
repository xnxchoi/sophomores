import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("actual disabled payment routes fail closed without loading private env or contacting dependencies", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    const statuses = {};
    for (const action of ['prepare', 'complete', 'webhook']) {
      const module = await import('./src/app/api/payments/portone/' + action + '/route.ts');
      const route = module.POST ?? module.default?.POST;
      const response = await route(new Request('http://localhost/api/payments/portone/' + action, { method: 'POST' }));
      statuses[action] = response.status;
      if ((await response.json()).success !== false) throw new Error('Disabled route claimed success');
    }
    console.log(JSON.stringify(statuses));
  `], {
    cwd: process.cwd(),
    env: { ...process.env, PORTONE_PAYMENT_MODE: "disabled", TSX_TSCONFIG_PATH: "tsconfig.json" },
    encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024
  });
  assert.equal(result.status, 0, result.stderr.slice(0, 2000));
  assert.deepEqual(JSON.parse(result.stdout), { prepare: 503, complete: 503, webhook: 503 });
});
