import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    APP_PASSWORD_SET: !!process.env.APP_PASSWORD,
    APP_PASSWORD_LENGTH: process.env.APP_PASSWORD?.length ?? 0,
    ANTHROPIC_KEY_SET: !!process.env.ANTHROPIC_API_KEY,
  })
}
