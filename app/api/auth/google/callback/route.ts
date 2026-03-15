import { google } from "googleapis"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code")

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Missing OAuth code" },
        { status: 400 }
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    const { tokens } = await oauth2Client.getToken(code)

    const response = NextResponse.redirect("http://localhost:3000")

    if (tokens.access_token) {
      response.cookies.set("google_access_token", tokens.access_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/"
      })
    }

    if (tokens.refresh_token) {
      response.cookies.set("google_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/"
      })
    }

    return response
  } catch (error) {
    console.error("Google OAuth callback failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "OAuth callback failed"
      },
      { status: 500 }
    )
  }
}
