import { NextResponse } from 'next/server'
import { getStats } from '@/lib/db'

export const dynamic = 'force-dynamic'

export function GET() {
  try {
    return NextResponse.json(getStats())
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
