import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  // Stub: aquí se validará que el input de ejemplo pase contra el demo endpoint
  return NextResponse.json({ ok: true, step: 'validate-demo', received: body })
}
