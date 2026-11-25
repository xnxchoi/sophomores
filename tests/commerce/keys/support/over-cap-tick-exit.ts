import { writeSync } from "node:fs";
import { overCapTick } from "./over-cap-tick";

// The tick script's exit edge (scripts/key-grant-tick.ts): alert lines and the result line written synchronously,
// then an immediate process.exit, as under a scheduler. Run as a child process by grant-catch-up.test.ts.
void overCapTick().run((line) => writeSync(2, line + "\n")).then((result) => { writeSync(1, JSON.stringify(result) + "\n"); process.exit(0); });
