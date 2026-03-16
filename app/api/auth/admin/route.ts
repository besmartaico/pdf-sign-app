import { NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = "admin_auth"
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      // No password set — allow access in dev mode
      return NextResponse.json({ success: true })
    }

    if (password !== adminPassword) {
      return NextResponse.json({ success: false, error: "Incorrect password" }, { status: 401 })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set(COOKIE_NAME, adminPassword, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/"
    })
    return res
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" })
  return res
}
