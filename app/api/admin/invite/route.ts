import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { Resend } from "resend"

const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSecret(): string {
  return process.env.INVITE_TOKEN_SECRET || process.env.ADMIN_PASSWORD || "fallback-secret-change-me"
}

export function makeInviteToken(email: string, username: string): string {
  const expires = Date.now() + TOKEN_EXPIRY_MS
  const payload = `${email}|${username}|${expires}`
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 32)
  return Buffer.from(`${payload}|${sig}`).toString("base64url")
}

export function verifyInviteToken(token: string): { email: string; username: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const [email, username, expiresStr, sig] = decoded.split("|")
    if (!email || !username || !expiresStr || !sig) return null
    if (Number(expiresStr) < Date.now()) return null
    const expectedSig = crypto.createHmac("sha256", getSecret()).update(`${email}|${username}|${expiresStr}`).digest("hex").slice(0, 32)
    if (sig !== expectedSig) return null
    return { email, username }
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const { email, username } = await req.json()
    if (!email || !username) {
      return NextResponse.json({ error: "email and username required" }, { status: 400 })
    }

    const token = makeInviteToken(email, username)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get("host")}`
    const inviteUrl = `${baseUrl}/admin/accept-invite?token=${token}`

    const resendKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@besmartai.co"

    if (!resendKey) {
      // Fall back to returning the URL directly for manual sharing
      return NextResponse.json({ success: true, inviteUrl, note: "RESEND_API_KEY not set; share this URL manually" })
    }

    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "You're invited to docs.BeSmartAI",
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h2 style="margin:0 0 16px">Welcome to docs.BeSmartAI</h2>
        <p>You've been invited to join as <strong>${username}</strong>.</p>
        <p>Click the button below to set up your password and access the admin portal.</p>
        <p style="margin:28px 0">
          <a href="${inviteUrl}" style="background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block">Accept Invitation</a>
        </p>
        <p style="font-size:12px;color:#666">This invitation expires in 7 days. If the button doesn't work, copy this URL: ${inviteUrl}</p>
      </div>`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
