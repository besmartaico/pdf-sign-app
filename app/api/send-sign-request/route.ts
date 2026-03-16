import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { documentId, documentName, signerEmail, signerName } = await req.json()

    if (!documentId || !signerEmail) {
      return NextResponse.json({ success: false, error: "Missing documentId or signerEmail" }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get("host")}`
    const signingLink = `${appUrl}/sign/${documentId}`

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({ success: false, error: "Email service not configured. Set RESEND_API_KEY." }, { status: 500 })
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@resend.dev"
    const greeting = signerName ? `Hi ${signerName},` : "Hi,"

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111827;border-radius:16px;border:1px solid #1e3a5f;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px 40px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:16px;">S</div>
        <span style="color:#fff;font-weight:700;font-size:18px;">SignFlow</span>
      </div>
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:14px;">Document Signing Request</p>
    </div>
    <div style="padding:40px;">
      <p style="margin:0 0 16px;color:#e2e8f0;font-size:16px;">${greeting}</p>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
        You have been asked to review and sign the following document:
      </p>
      <div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
        <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Document</div>
        <div style="font-size:15px;font-weight:600;color:#e2e8f0;">${documentName || "Document"}</div>
      </div>
      <a href="${signingLink}" style="display:block;text-align:center;background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:16px;margin-bottom:24px;">
        ✍️ Open &amp; Sign Document
      </a>
      <p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">
        Or copy this link into your browser:<br>
        <a href="${signingLink}" style="color:#60a5fa;word-break:break-all;">${signingLink}</a>
      </p>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #1e3a5f;">
      <p style="margin:0;color:#475569;font-size:12px;">Sent via SignFlow · If you did not expect this email, you can ignore it.</p>
    </div>
  </div>
</body>
</html>`

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [signerEmail],
        subject: `Please sign: ${documentName || "Document"}`,
        html: htmlBody
      })
    })

    if (!emailRes.ok) {
      const err = await emailRes.json()
      throw new Error(err.message || "Failed to send email via Resend")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Send sign request failed:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to send" },
      { status: 500 }
    )
  }
}
