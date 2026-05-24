import { NextResponse } from 'next/server'

const SESSION_TOKEN = 'rw_session_ok'

export async function POST(req: Request) {
  const { password } = await req.json()
  const correct = process.env.APP_PASSWORD

  if (!correct || password.trim() !== correct.trim()) {
    return NextResponse.json({ error: 'Špatné heslo' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('session', SESSION_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
