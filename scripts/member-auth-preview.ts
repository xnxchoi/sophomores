import { loadEnvConfig } from "@next/env";
import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import { copyFile, cp, mkdir, mkdtemp, readdir, symlink } from "node:fs/promises";
import { basename, join } from "node:path";
import { copyLocalPreviewFonts, localPreviewEnvironment } from "./phone-verification-preview";
import { runMemberPreviewChildren, superviseMemberReceiver } from "./member-auth-receiver";

export function memberPreviewEnvironment(env: Readonly<Record<string, string | undefined>>) {
  const privateEnv = Object.fromEntries(Object.entries(env).filter(([key]) =>
    !/^NEXT_PUBLIC_(?:(?:MEMBER_AUTH|PHONE_VERIFICATION)_|BETTER_AUTH_SECRET$|PAYLOAD_SECRET$|DATABASE_URI$|GOOGLE_CLIENT_SECRET$)/.test(key)));
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

export function memberPreviewNodeArguments(root: string, directory: string, origin: string | null, inPlace = false): string[] {
  if (!origin && !inPlace) throw new Error("Local member configuration required");
  // In-place dev binds the same literal loopback as normal dev; browser Host and
  // canonical auth origin remain localhost through the checked local authority.
  const args = inPlace
    ? ["dev", directory, "--hostname", "127.0.0.1", "--port", origin ? new URL(origin).port || "80" : "3000", "--webpack"]
    : memberPreviewArguments(directory, origin!);
  // In-place dev inherits the guard's NODE_OPTIONS, including a stricter caller cap.
  return [...(inPlace ? [] : ["--max-old-space-size=1024"]), join(root, "node_modules/next/dist/bin/next"), ...args];
}

/** Copy Next's scanned/generated owners; share existing non-generated source and assets. */
export async function copyMemberPreviewSource(root: string, directory: string): Promise<void> {
  const source = join(root, "src");
  const destination = join(directory, "src");
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name === "app" || !entry.isDirectory()) {
      await cp(join(source, entry.name), join(destination, entry.name), { recursive: true });
    } else {
      await symlink(join(source, entry.name), join(destination, entry.name));
    }
  }
  for (const name of ["package.json", "tsconfig.json", "next-env.d.ts", "next.config.ts", "postcss.config.mjs"])
    await copyFile(join(root, name), join(directory, name));
  await copyLocalPreviewFonts(root, directory);
  for (const name of ["public", "messages", "node_modules", "migrations"])
    await symlink(join(root, name), join(directory, name));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || args[0] !== "--in-place")) throw new Error("Unsupported preview mode");
  const inPlace = args[0] === "--in-place";
  const root = process.cwd();
  loadEnvConfig(root, true, { info: () => {}, error: () => { console.error("Local environment loading failed."); } });
  const { loadPayloadMemberConfig } = await import("@/lib/member-auth/payload-config");
  const config = loadPayloadMemberConfig(process.env);
  if (!config && !inPlace) throw new Error("Local member configuration required");
  if (config) requireMemberLoopbackAddresses((await lookup("localhost", { all: true })).map(({ address }) => address));
  let directory = root;
  if (!inPlace) {
    const base = join(root, ".deployment/member-auth-local");
    await mkdir(base, { recursive: true, mode: 0o700 });
    directory = await mkdtemp(join(base, "preview-"));
    await copyMemberPreviewSource(root, directory);
  }
  const child = spawn(process.execPath,
    memberPreviewNodeArguments(root, directory, config?.origin ?? null, inPlace),
    { stdio: "inherit", env: memberPreviewEnvironment(process.env) });
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    process.exitCode = await runMemberPreviewChildren({ next: child, signal: controller.signal,
      startReceiver: (signal) => config && process.env.PHONE_VERIFICATION_TRANSPORT === "zoho-poll"
        ? superviseMemberReceiver({ root, env: memberPreviewEnvironment(process.env), signal }) : Promise.resolve(),
    });
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

if (process.argv[1] && basename(process.argv[1]) === "member-auth-preview.ts")
  main().catch(() => {
    console.error("Local member preview could not start. Check local configuration and port availability.");
    process.exitCode = 1;
  });
