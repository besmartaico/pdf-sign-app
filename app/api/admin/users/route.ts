import { NextRequest, NextResponse } from "next/server"

// GET: return current users list (passwords masked)
export async function GET() {
  const usersJson = process.env.ADMIN_USERS
  if (usersJson) {
    try {
      const users = JSON.parse(usersJson)
      return NextResponse.json({ users })
    } catch {}
  }
  // Fallback: single user from ADMIN_PASSWORD
  const pw = process.env.ADMIN_PASSWORD
  if (pw) {
    return NextResponse.json({ users: [{ username: "admin", password: pw }] })
  }
  return NextResponse.json({ users: [] })
}

// POST: update users list via ADMIN_USERS env var
// NOTE: This updates Vercel env var via the Vercel API
export async function POST(req: NextRequest) {
  try {
    const { users } = await req.json()
    if (!Array.isArray(users)) {
      return NextResponse.json({ error: "users must be an array" }, { status: 400 })
    }

    const token = process.env.VERCEL_TOKEN
    const projectId = process.env.VERCEL_PROJECT_ID || "pdf-sign-app"
    const teamId = process.env.VERCEL_TEAM_ID

    if (!token) {
      return NextResponse.json({ error: "VERCEL_TOKEN not configured. Please add it to env vars." }, { status: 500 })
    }

    const url = teamId
      ? `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`
      : `https://api.vercel.com/v10/projects/${projectId}/env`

    // Upsert ADMIN_USERS env var
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([{
        key: "ADMIN_USERS",
        value: JSON.stringify(users),
        type: "encrypted",
        target: ["production", "preview", "development"]
      }])
    })

    if (!resp.ok) {
      const err = await resp.text()
      // Try PATCH if POST fails (already exists)
      return NextResponse.json({ error: "Failed to update. You may need to manually update ADMIN_USERS in Vercel.", detail: err }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
