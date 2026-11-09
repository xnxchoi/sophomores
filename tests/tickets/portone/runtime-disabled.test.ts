import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("retired legacy payment ingress is permanently gone without loading private env or contacting dependencies", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    const statuses = {};
    const module = await import('./src/lib/tickets/portone/runtime.ts');
    const ingress = module.portOneRequest ?? module.default?.portOneRequest;
    for (const action of ['prepare', 'complete', 'resume', 'webhook']) {
      const response = await ingress(action, new Request('http://localhost/api/payments/portone/' + action, { method: 'POST' }));
      statuses[action] = response.status;
      if ((await response.json()).success !== false) throw new Error('Disabled route claimed success');
      if (response.headers.get('cache-control') !== 'private, no-store') throw new Error('Retired response is cacheable');
    }
    console.log(JSON.stringify(statuses));
  `], {
    cwd: process.cwd(),
    env: { ...process.env, PORTONE_PAYMENT_MODE: "disabled", TSX_TSCONFIG_PATH: "tsconfig.json" },
    encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024
  });
  assert.equal(result.status, 0, result.stderr.slice(0, 2000));
  assert.deepEqual(JSON.parse(result.stdout), { prepare: 410, complete: 410, resume: 410, webhook: 410 });
});
