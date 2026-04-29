import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'admin_auth'

export const config = {
  matcher: ['/', '/admin/:path*']
}

function isValidAuth(cookieValue: string): boolean {
  // New format: "username:password"
  const usersJson = process.env.ADMIN_USERS
  if (usersJson) {
    try {
      const users: { username: string; password: string }[] = JSON.parse(usersJson)
      return users.some(u => cookieValue === `${u.username}:${u.password}`)
    } catch {}
  }
  // Fallback: legacy ADMIN_PASSWORD cookie format
  const pw = process.env.ADMIN_PASSWORD
  if (pw) {
    return cookieValue === pw || cookieValue === `admin:${pw}`
  }
  return true // dev mode
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow login page, auth API, and SSO endpoint
  if (
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/sso') ||
    pathname.startsWith('/sign/')
  ) {
    return NextResponse.next()
  }

  const cookie = req.cookies.get(COOKIE_NAME)
  const isAuthed = cookie ? isValidAuth(cookie.value) : false

  if (pathname === '/') {
    if (isAuthed) {
      return NextResponse.redirect(new URL('/admin/documents', req.url))
    }
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  if (!isAuthed) {
    return NextResponse.redirect(new URL(`/admin/login?from=${encodeURIComponent(pathname)}`, req.url))
  }

  return NextResponse.next()
}
