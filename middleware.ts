import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
const COOKIE_NAME = 'admin_auth'

export const config = {
  matcher: ['/', '/admin/:path*']
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow login page, auth API, and SSO endpoint
  if (
    pathname === '/admin/login' ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next()
  }

  if (!ADMIN_PASSWORD) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/admin/documents', req.url))
    }
    return NextResponse.next()
  }

  const cookie = req.cookies.get(COOKIE_NAME)
  const isAuthed = cookie?.value === ADMIN_PASSWORD

  if (pathname === '/') {
    if (isAuthed) {
      return NextResponse.redirect(new URL('/admin/documents', req.url))
    }
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  if (!isAuthed) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}