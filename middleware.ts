import { NextRequest, NextResponse } from "next/server"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
const COOKIE_NAME = "admin_auth"

// Protect root and all /admin routes except /admin/login
export const config = {
  matcher: ["/", "/admin/:path*"]
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow the login page and auth API through
  if (pathname === "/admin/login" || pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // If no password set (dev mode), redirect root → documents
  if (!ADMIN_PASSWORD) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/admin/documents", req.url))
    }
    return NextResponse.next()
  }

  // Check auth cookie
  const cookie = req.cookies.get(COOKIE_NAME)
  const isAuthed = cookie?.value === ADMIN_PASSWORD

  // Redirect root → login or documents depending on auth state
  if (pathname === "/") {
    if (isAuthed) {
      return NextResponse.redirect(new URL("/admin/documents", req.url))
    }
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }

  // Protect all /admin/* routes
  if (!isAuthed) {
    const loginUrl = new URL("/admin/login", req.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}
