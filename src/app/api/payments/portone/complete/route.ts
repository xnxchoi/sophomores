import { portOneRequest } from '@/lib/tickets/portone/runtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) { return portOneRequest('complete', request) }
