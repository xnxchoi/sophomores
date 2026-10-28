import configModule from "../payload.config";
import { generateTypes } from "payload/node";

async function main() {
  const loaded = configModule as unknown as {
    default?: Parameters<typeof generateTypes>[0];
  };
  const actualConfig =
    (await loaded.default) ??
    (configModule as unknown as Parameters<typeof generateTypes>[0]);
  await generateTypes(actualConfig);
  console.log("Payload types generated successfully.");
}

main().catch((err) => {
  console.error("Failed to generate types:", err);
  process.exit(1);
});
