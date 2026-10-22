import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
export interface PreviewAuthConfig {
  readonly origin: 'https://preview.sophomores.co';
  readonly username: 'team';
  readonly passwordSalt: string;
  readonly passwordHash: string;
  readonly signingSecret: string;
}

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}
export const SESSION_SECONDS = 12 * 60 * 60;
export const REMEMBER_SECONDS = 30 * 24 * 60 * 60;
export const COOKIE_NAME = '__Host-sophomores-preview';
const keys = ['origin', 'passwordHash', 'passwordSalt', 'signingSecret', 'username'];
const hex = (value: unknown, length: number): value is string => typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);

export function validateConfig(value: unknown): PreviewAuthConfig {
  const config = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
  if (!config || Object.keys(config).sort().join(',') !== keys.join(',')
    || config.origin !== 'https://preview.sophomores.co' || config.username !== 'team'
    || !hex(config.passwordSalt, 32) || !hex(config.passwordHash, 128) || !hex(config.signingSecret, 64)) {
    throw new Error('Invalid preview authentication configuration');
  }
  return Object.freeze({
    origin: config.origin, username: config.username, passwordSalt: config.passwordSalt,
    passwordHash: config.passwordHash, signingSecret: config.signingSecret,
  });
}

export function loadConfig(env: Readonly<Record<string, string | undefined>> = process.env): PreviewAuthConfig {
  if (typeof env.PREVIEW_AUTH_CONFIG !== 'string' || !env.PREVIEW_AUTH_CONFIG.startsWith('/')) {
    throw new Error('PREVIEW_AUTH_CONFIG must identify an absolute configuration path');
  }
  try { return validateConfig(JSON.parse(readFileSync(env.PREVIEW_AUTH_CONFIG, 'utf8'))); }
  catch { throw new Error('Cannot load preview authentication configuration'); }
}

export async function verifyCredentials(config: PreviewAuthConfig, username: unknown, password: unknown): Promise<boolean> {
  if (typeof username !== 'string' || typeof password !== 'string' || password.length > 1024) return false;
  const result = await derive(password, Buffer.from(config.passwordSalt, 'hex'));
  const validPassword = timingSafeEqual(result, Buffer.from(config.passwordHash, 'hex'));
  return validPassword && username === config.username;
}

function signature(config: PreviewAuthConfig, body: string): string {
  return createHmac('sha256', Buffer.from(config.signingSecret, 'hex')).update(body).digest('base64url');
}

export function issueSession(config: PreviewAuthConfig, remember: boolean, now: number): string {
  const payload = { v: 1, iat: now, exp: now + (remember ? REMEMBER_SECONDS : SESSION_SECONDS), nonce: randomBytes(16).toString('hex') };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${signature(config, body)}`;
}

export function verifySession(config: PreviewAuthConfig, token: unknown, now: number): boolean {
  if (typeof token !== 'string' || token.length > 1024) return false;
  const match = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match || !timingSafeEqual(Buffer.from(match[2]), Buffer.from(signature(config, match[1])))) return false;
  try {
    const payload: unknown = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    const { v, iat, exp, nonce } = payload as Record<string, unknown>;
    const canonical = Buffer.from(JSON.stringify({ v, iat, exp, nonce })).toString('base64url');
    return canonical === match[1] && v === 1 && typeof iat === 'number' && Number.isSafeInteger(iat) && iat >= 0
      && typeof exp === 'number' && Number.isSafeInteger(exp) && iat <= now + 60 && exp > now
      && [SESSION_SECONDS, REMEMBER_SECONDS].includes(exp - iat) && hex(nonce, 32);
  } catch { return false; }
}

export function cookieToken(header: unknown): string | null {
  if (typeof header !== 'string' || header.length > 4096) return null;
  const values = header.split(';').map(value => value.trim()).filter(value => value.startsWith(`${COOKIE_NAME}=`));
  if (values.length !== 1) return null;
  const token = values[0].slice(COOKIE_NAME.length + 1);
  return token && /^[A-Za-z0-9_.-]+$/.test(token) ? token : null;
}

export function sessionCookie(token: string, remember: boolean, now: number): string {
  const persistent = remember ? `; Max-Age=${REMEMBER_SECONDS}; Expires=${new Date((now + REMEMBER_SECONDS) * 1000).toUTCString()}` : '';
  return `${COOKIE_NAME}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax${persistent}`;
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
