import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const APP_PASSWORD = process.env.APP_PASSWORD

export function middleware(request: NextRequest) {
  // Skip if no password is configured
  if (!APP_PASSWORD) return NextResponse.next()

  // Skip the login page and debug endpoint
  if (request.nextUrl.pathname === '/login') return NextResponse.next()
  if (request.nextUrl.pathname === '/api/debug-env') return NextResponse.next()

  // Check session cookie
  const session = request.cookies.get('session')?.value
  if (session === APP_PASSWORD) return NextResponse.next()

  // Redirect to login
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
