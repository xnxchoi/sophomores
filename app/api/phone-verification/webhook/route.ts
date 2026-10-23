import { phoneVerificationResponse } from '../../../../lib/phone-verification/server/runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function POST(request: Request): Promise<Response> {
  return phoneVerificationResponse('webhook', request);
}
