import { writeSync } from "node:fs";
import { alertSpoolDir, createTickAlertLog } from "@/lib/commerce/keys/tick-alerts";
import { overCapTick } from "./over-cap-tick";

// The tick script's exit edge (scripts/key-grant-tick.ts): alert lines to stderr synchronously and into the alert
// spool when KEY_GRANT_ALERT_SPOOL is set, the spool writes awaited, the result line written synchronously, then an
// immediate process.exit, as under a scheduler. Run as a child process by grant-catch-up.test.ts, and on the VPS as
// the gate-2 proof (VPS-TICK-PLAN.md step 4).
const alertLog = createTickAlertLog(alertSpoolDir(), (line) => writeSync(2, line + "\n"));
void overCapTick().run(alertLog.log).then(async (result) => { await alertLog.settled(); writeSync(1, JSON.stringify(result) + "\n"); process.exit(0); });
