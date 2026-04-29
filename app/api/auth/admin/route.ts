import { NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = "admin_auth"
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

// Users are stored as ADMIN_USERS env var: JSON array of {username, password}
// Falls back to ADMIN_PASSWORD for backwards compatibility (username: "admin")
function getUsers(): { username: string; password: string }[] {
  const usersJson = process.env.ADMIN_USERS
  if (usersJson) {
    try {
      return JSON.parse(usersJson)
    } catch {}
  }
  // Fallback: single user from ADMIN_PASSWORD
  const pw = process.env.ADMIN_PASSWORD
  if (pw) return [{ username: "admin", password: pw }]
  return []
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    const users = getUsers()

    if (users.length === 0) {
      // No users configured — allow access in dev mode
      return NextResponse.json({ success: true })
    }

    const match = users.find(
      u => u.username === username && u.password === password
    )

    if (!match) {
      return NextResponse.json({ success: false, error: "Incorrect username or password" }, { status: 401 })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set(COOKIE_NAME, `${username}:${password}`, {
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
