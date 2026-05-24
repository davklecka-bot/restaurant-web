import { NextResponse } from 'next/server'
import { getAllRestaurants } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await getAllRestaurants())
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
