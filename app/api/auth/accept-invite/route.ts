import { NextRequest, NextResponse } from "next/server"
import { verifyInviteToken } from "../../admin/invite/route"

// GET: validate the token (used by the accept-invite page on load)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || ""
  const data = verifyInviteToken(token)
  if (!data) {
    return NextResponse.json({ valid: false, error: "Invalid or expired token" }, { status: 400 })
  }
  return NextResponse.json({ valid: true, email: data.email, username: data.username })
}

// POST: accept the invite — adds user via Vercel API, requires VERCEL_TOKEN
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) {
      return NextResponse.json({ error: "token and password required" }, { status: 400 })
    }

    const data = verifyInviteToken(token)
    if (!data) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 })
    }

    // Read existing users
    const existingJson = process.env.ADMIN_USERS
    let users: { username: string; password: string }[] = []
    if (existingJson) {
      try { users = JSON.parse(existingJson) } catch {}
    } else if (process.env.ADMIN_PASSWORD) {
      users = [{ username: "admin", password: process.env.ADMIN_PASSWORD }]
    }

    // Add or update user
    const existingIdx = users.findIndex(u => u.username === data.username)
    if (existingIdx >= 0) {
      users[existingIdx].password = password
    } else {
      users.push({ username: data.username, password })
    }

    // Update Vercel env via API
    const vercelToken = process.env.VERCEL_TOKEN
    const projectId = process.env.VERCEL_PROJECT_ID
    const teamId = process.env.VERCEL_TEAM_ID

    if (!vercelToken || !projectId) {
      return NextResponse.json({
        error: "Server cannot persist users. Ask your admin to set VERCEL_TOKEN and VERCEL_PROJECT_ID env vars."
      }, { status: 500 })
    }

    // Try to find existing ADMIN_USERS env var ID first
    const listUrl = teamId
      ? `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`
      : `https://api.vercel.com/v10/projects/${projectId}/env`

    const listResp = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${vercelToken}` }
    })
    const listData = await listResp.json()
    const existing = (listData.envs || []).find((e: { key: string }) => e.key === "ADMIN_USERS")

    const usersValue = JSON.stringify(users)

    let saveResp
    if (existing) {
      const editUrl = teamId
        ? `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}?teamId=${teamId}`
        : `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`
      saveResp = await fetch(editUrl, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ value: usersValue, target: ["production", "preview", "development"] })
      })
    } else {
      saveResp = await fetch(listUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "ADMIN_USERS",
          value: usersValue,
          type: "encrypted",
          target: ["production", "preview", "development"]
        })
      })
    }

    if (!saveResp.ok) {
      const detail = await saveResp.text()
      return NextResponse.json({ error: "Failed to save user", detail }, { status: 500 })
    }

    return NextResponse.json({ success: true, username: data.username })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
