import configModule from "../payload.config";
import { generateTypes } from "payload/node";

async function main() {
  const actualConfig = await (configModule as any).default || await configModule;
  await generateTypes(actualConfig);
  console.log("Payload types generated successfully.");
}

main().catch((err) => {
  console.error("Failed to generate types:", err);
  process.exit(1);
});
