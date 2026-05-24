import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Tells the client whether the API key is already configured server-side
export function GET() {
  return NextResponse.json({ hasServerKey: !!process.env.ANTHROPIC_API_KEY })
}
