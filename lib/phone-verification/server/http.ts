import { randomBytes } from 'node:crypto';
import { VerificationError } from './contracts';
import type { PhoneVerificationService } from './service';
import type { VerificationRepository } from './contracts';
import { parseZohoNotification, verifyZohoSignature } from './zoho';
import { hasLocalRequestAuthority } from './local-request';

export const SESSION_COOKIE = 'sophomores-verification-local';
type Dependencies = {
  transport?: 'fixture' | 'zoho-poll';
  receiverReady?: () => Promise<boolean>;
  service: Pick<PhoneVerificationService, 'issue' | 'status' | 'cancel'>;
  deliveries: Pick<VerificationRepository, 'enqueueDelivery'>;
  origin: string; webhookSecret: string; mailboxId: string;
  zohoUserId: string; zohoIntegrationId: string;
};
class HttpError extends Error { constructor(readonly status: number, readonly code: string) { super(code); } }
export function verificationJson(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  } });
}
export const verificationUnavailable = () => verificationJson(503, { success: false, error: { code: 'UNAVAILABLE', message: 'Phone verification is unavailable.' } });
function failure(error: unknown): Response {
  if (error instanceof HttpError) return verificationJson(error.status, { success: false, error: { code: error.code, message: 'The verification request could not be accepted.' } });
  if (error instanceof VerificationError) {
    const status = { INVALID_INPUT: 400, NOT_FOUND: 404, RATE_LIMITED: 429, INVALID_PROOF: 400, UNAVAILABLE: 503 }[error.code];
    const response = verificationJson(status, { success: false, error: { code: error.code, message: 'The verification request could not be completed.' } });
    if (status === 429) response.headers.set('Retry-After', '60');
    return response;
  }
  return verificationUnavailable();
}
async function boundedBody(request: Request, maximum: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length')) > maximum) throw new HttpError(413, 'BODY_TOO_LARGE');
  if (!request.body) throw new HttpError(400, 'INVALID_BODY');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 5000);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (timedOut) throw new HttpError(408, 'BODY_TIMEOUT');
      if (done) break;
      length += value.byteLength;
      if (length > maximum) throw new HttpError(413, 'BODY_TOO_LARGE');
      chunks.push(value);
    }
    if (!length) throw new HttpError(400, 'INVALID_BODY');
    return Buffer.concat(chunks);
  } finally { clearTimeout(deadline); await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
function sessionToken(request: Request, create = false): string {
  const header = request.headers.get('cookie') ?? '';
  if (header.length > 4096) throw new HttpError(400, 'INVALID_SESSION');
  const matches = header.split(';').map((part) => part.trim()).filter((part) => part.startsWith(SESSION_COOKIE + '='));
  if (!matches.length) {
    if (create) return randomBytes(32).toString('base64url');
    throw new HttpError(404, 'NOT_FOUND');
  }
  if (matches.length !== 1) throw new HttpError(400, 'INVALID_SESSION');
  const token = matches[0].slice(SESSION_COOKIE.length + 1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(400, 'INVALID_SESSION');
  return token;
}
function accept(request: Request, origin: string, method: string, browser = false): void {
  if (request.method !== method) throw new HttpError(405, 'METHOD_NOT_ALLOWED');
  const url = new URL(request.url);
  if (!hasLocalRequestAuthority(request, origin) || url.search || request.headers.has('rsc')
    || request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'INVALID_ORIGIN');
  if (browser && request.headers.get('origin') !== origin) throw new HttpError(403, 'INVALID_ORIGIN');
}
function jsonType(request: Request): void {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new HttpError(415, 'INVALID_CONTENT_TYPE');
}

export function createPhoneVerificationHandlers(deps: Dependencies) {
  async function requireReceiver() {
    if (deps.transport !== 'zoho-poll') return;
    try { if (await deps.receiverReady?.()) return; } catch { /* Fail closed with a fixed public diagnostic. */ }
    throw new HttpError(503, 'RECEIVER_UNAVAILABLE');
  }
  return {
    async issue(request: Request): Promise<Response> {
      try {
        accept(request, deps.origin, 'POST', true); jsonType(request);
        const token = sessionToken(request, true);
        let input: unknown;
        try { input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await boundedBody(request, 2048))); }
        catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'INVALID_BODY'); }
        if (!input || typeof input !== 'object' || Array.isArray(input)
          || Object.keys(input).join(',') !== 'phone' || typeof (input as { phone: unknown }).phone !== 'string') throw new HttpError(400, 'INVALID_BODY');
        await requireReceiver();
        // Local-only host validation deliberately ignores all proxy-provided IP headers.
        const data = await deps.service.issue({ sessionToken: token, phone: (input as { phone: string }).phone, ipKey: 'loopback' });
        const response = verificationJson(201, { success: true, data });
        response.headers.set('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/api/phone-verification; HttpOnly; SameSite=Strict; Max-Age=1800`);
        return response;
      } catch (error) { return failure(error); }
    },
    async status(request: Request, id: string): Promise<Response> {
      try {
        accept(request, deps.origin, 'GET');
        const result = await deps.service.status({ sessionToken: sessionToken(request), id });
        if (result.state === 'pending' || result.state === 'review') await requireReceiver();
        const data = { id: result.id, state: result.state, expiresAt: result.expiresAt, mode: result.mode };
        return verificationJson(200, { success: true, data });
      } catch (error) { return failure(error); }
    },
    async cancel(request: Request, id: string): Promise<Response> {
      try {
        accept(request, deps.origin, 'DELETE', true);
        await deps.service.cancel({ sessionToken: sessionToken(request), id });
        return verificationJson(200, { success: true, data: { cancelled: true } });
      } catch (error) { return failure(error); }
    },
    async webhook(request: Request): Promise<Response> {
      try {
        if (deps.transport === 'zoho-poll') return verificationUnavailable();
        accept(request, deps.origin, 'POST'); jsonType(request);
        // Secret enrollment is an operator-only future activation step, never TOFU over HTTP.
        if (request.headers.has('x-hook-secret')) throw new HttpError(401, 'UNAPPROVED_ENROLLMENT');
        const raw = await boundedBody(request, 65_536);
        if (!verifyZohoSignature(raw, request.headers.get('x-hook-signature'), deps.webhookSecret)) throw new HttpError(401, 'INVALID_SIGNATURE');
        let notification;
        try { notification = parseZohoNotification(raw, { zuid: deps.zohoUserId, integrationId: deps.zohoIntegrationId }); }
        catch { throw new HttpError(400, 'INVALID_NOTIFICATION'); }
        await deps.deliveries.enqueueDelivery({ mailboxId: deps.mailboxId, messageId: notification.messageId, receivedAt: notification.receivedAt });
        return verificationJson(200, { success: true, data: { received: true } });
      } catch (error) { return failure(error); }
    },
  };
}
