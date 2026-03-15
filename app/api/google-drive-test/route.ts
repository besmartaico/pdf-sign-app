import { NextResponse } from "next/server"
import { google } from "googleapis"
import path from "path"

export async function GET() {
  try {
    const keyFilePath = path.join(
      process.cwd(),
      "credentials",
      "formsigner-service-account.json"
    )

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/drive"]
    })

    const drive = google.drive({
      version: "v3",
      auth
    })

    const folderId = process.env.GOOGLE_DRIVE_TEMPLATES_FOLDER_ID

    const response = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: "files(id,name,mimeType)"
    })

    return NextResponse.json({
      success: true,
      templates: response.data.files
    })
  } catch (error) {
    console.error("Drive template list failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}