import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, cp, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { loadPhoneVerificationConfig } from '../lib/phone-verification/server/config';
import { receiverHealthDirectory } from '../lib/phone-verification/server/receiver-health';

/** Mailbox authority belongs only to the explicit receiver process, never Next. */
export function localPreviewEnvironment(env: Readonly<Record<string, string | undefined>>): NodeJS.ProcessEnv {
  return { ...Object.fromEntries(Object.entries(env).filter(([key]) =>
    !/^PHONE_VERIFICATION_ZOHO_(?:CLIENT_ID|CLIENT_SECRET|REFRESH_TOKEN|ACCESS_TOKEN|AUTHORIZATION_CODE|MAIL_ORIGIN|ACCOUNTS_ORIGIN)$/.test(key))),
    PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY: receiverHealthDirectory(env),
    NODE_ENV: env.NODE_ENV === 'production' ? 'production' : env.NODE_ENV === 'test' ? 'test' : 'development', PREVIEW_AUTH_MODE: 'public' };
}

export function localPreviewArguments(directory: string, origin: string): string[] {
  const url = new URL(origin);
  if (url.protocol !== 'http:') throw new Error('A local HTTP origin is required.');
  if (url.hostname !== '127.0.0.1') throw new Error('Use 127.0.0.1 for the isolated preview.');
  return ['dev', directory, '--hostname', '127.0.0.1', '--port', url.port || '80', '--webpack'];
}

/** Repair exact relocated assets in the isolated copy, never the user's font module. */
export async function copyLocalPreviewFonts(root: string, directory: string): Promise<void> {
  const source = await readFile(join(root, 'fonts.ts'), 'utf8');
  const snapshot = source.replace(/(["'])(\.\/)?public\/assets\/fonts\/([^"']+)\1/g,
    (reference, quote: string, prefix: string | undefined, name: string) => {
      if (existsSync(join(root, 'public/assets/fonts', name))) return reference;
      if (!existsSync(join(root, 'public/fonts', name))) return reference;
      return `${quote}${prefix ?? ''}public/fonts/${name}${quote}`;
    });
  await writeFile(join(directory, 'fonts.ts'), snapshot);
}

/** Separate .next/cache/config snapshot; never stops or rebuilds an existing user server. */
async function main() {
  const config = loadPhoneVerificationConfig();
  if (!config) throw new Error('Local verification configuration is required.');
  const root = process.cwd();
  const base = join(root, '.deployment', 'phone-verification-local');
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(join(base, 'preview-'));
  // Next's route scanner does not discover a symlinked app directory.
  await cp(join(root, 'app'), join(directory, 'app'), { recursive: true });
  for (const name of ['package.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts', 'postcss.config.mjs', 'proxy.ts']) {
    await copyFile(join(root, name), join(directory, name));
  }
  await copyLocalPreviewFonts(root, directory);
  for (const name of ['components', 'lib', 'hooks', 'styles', 'public', 'node_modules']) {
    await symlink(join(root, name), join(directory, name));
  }
  const args = localPreviewArguments(directory, config.origin);
  const child = spawn(process.execPath, [join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), ...args], {
    stdio: 'inherit', env: localPreviewEnvironment(process.env),
  });
  // Do not forward process.execArgv: Next would put --env-file into NODE_OPTIONS.
  const interrupt = () => child.kill('SIGINT');
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => { process.exitCode = code ?? 1; resolve(); });
  });
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
}
if (process.argv[1] && basename(process.argv[1]) === 'phone-verification-preview.ts') {
  main().catch(() => { console.error('Isolated verification preview could not start. Check local configuration and port availability.'); process.exitCode = 1; });
}
