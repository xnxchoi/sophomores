import { phoneVerificationResponse } from '@/lib/phone-verification/server/runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context): Promise<Response> {
  return phoneVerificationResponse('status', request, (await context.params).id);
}
export async function DELETE(request: Request, context: Context): Promise<Response> {
  return phoneVerificationResponse('cancel', request, (await context.params).id);
}
