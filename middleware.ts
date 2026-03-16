import { NextRequest, NextResponse } from "next/server"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
const COOKIE_NAME = "admin_auth"
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

// Only protect /admin routes — /sign/* is public for signers
export const config = {
  matcher: ["/admin/:path*"]
}

export function middleware(req: NextRequest) {
  // If no password is set, allow access (dev mode)
  if (!ADMIN_PASSWORD) return NextResponse.next()

  const { pathname } = req.nextUrl

  // Allow the login form POST
  if (pathname === "/admin/login") {
    return NextResponse.next()
  }

  // Check auth cookie
  const cookie = req.cookies.get(COOKIE_NAME)
  if (cookie?.value === ADMIN_PASSWORD) {
    return NextResponse.next()
  }

  // Handle login form submission
  if (req.method === "POST") {
    return NextResponse.next()
  }

  // Redirect to login page
  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = "/admin/login"
  loginUrl.searchParams.set("from", pathname)
  return NextResponse.redirect(loginUrl)
}
