import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import { copyFile, cp, mkdir, mkdtemp, symlink } from "node:fs/promises";
import { basename, join } from "node:path";
import { copyLocalPreviewFonts, localPreviewEnvironment } from "./phone-verification-preview";
import { runMemberPreviewChildren, superviseMemberReceiver } from "./member-auth-receiver";

export function memberPreviewEnvironment(env: Readonly<Record<string, string | undefined>>) {
  const privateEnv = Object.fromEntries(Object.entries(env).filter(([key]) =>
    !/^NEXT_PUBLIC_(?:MEMBER_AUTH|PHONE_VERIFICATION)_/.test(key)));
  return localPreviewEnvironment(privateEnv);
}

export function memberPreviewArguments(directory: string, origin: string): string[] {
  const url = new URL(origin);
  if (url.protocol !== "http:" || url.hostname !== "localhost" || url.username
    || url.password || url.pathname !== "/" || url.search || url.hash)
    throw new Error("A localhost-only member origin is required");
  // Next derives request.url from its configured hostname. Keep this identical
  // to the WebAuthn origin instead of producing internal 127.0.0.1 URLs.
  return ["dev", directory, "--hostname", "localhost", "--port", url.port || "80", "--webpack"];
}

export function requireMemberLoopbackAddresses(addresses: readonly string[]): void {
  if (!addresses.length || addresses.some((address) => !["127.0.0.1", "::1"].includes(address)))
    throw new Error("The member preview may only resolve to loopback");
}

export function memberPreviewNodeArguments(root: string, directory: string, origin: string): string[] {
  return ["--max-old-space-size=1024", join(root, "node_modules/next/dist/bin/next"),
    ...memberPreviewArguments(directory, origin)];
}

async function main() {
  const { loadMemberAuthConfig } = await import("../lib/member-auth/config");
  const config = loadMemberAuthConfig(process.env);
  if (!config) throw new Error("Local member configuration required");
  requireMemberLoopbackAddresses((await lookup("localhost", { all: true })).map(({ address }) => address));
  const root = process.cwd();
  const base = join(root, ".deployment/member-auth-local");
  await mkdir(base, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join(base, "preview-"));
  await cp(join(root, "app"), join(directory, "app"), { recursive: true });
  for (const name of ["package.json", "tsconfig.json", "next-env.d.ts", "next.config.ts", "postcss.config.mjs", "proxy.ts"])
    await copyFile(join(root, name), join(directory, name));
  await copyLocalPreviewFonts(root, directory);
  for (const name of ["components", "lib", "hooks", "styles", "public", "node_modules"])
    await symlink(join(root, name), join(directory, name));
  const child = spawn(process.execPath,
    memberPreviewNodeArguments(root, directory, config.origin),
    { stdio: "inherit", env: memberPreviewEnvironment(process.env) });
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    process.exitCode = await runMemberPreviewChildren({ next: child, signal: controller.signal,
      startReceiver: (signal) => process.env.PHONE_VERIFICATION_TRANSPORT === "zoho-poll"
        ? superviseMemberReceiver({ root, env: memberPreviewEnvironment(process.env), signal }) : Promise.resolve(),
    });
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

if (process.argv[1] && basename(process.argv[1]) === "member-auth-preview.ts")
  main().catch(() => {
    console.error("Isolated member preview could not start. Check local configuration and port availability.");
    process.exitCode = 1;
  });
