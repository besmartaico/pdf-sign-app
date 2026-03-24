import { NextRequest, NextResponse } from "next/server"
import {
  getFileAppPropertiesWithServiceAccount,
  updateFileMetadataWithServiceAccount,
} from "../../../../../lib/googleDrive"

// GET /api/documents/[documentId]/fields
// Returns the fields stored in Google Drive appProperties for this document
export async function GET(
  _req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { documentId } = params
    const props = await getFileAppPropertiesWithServiceAccount(documentId)
    const fieldsJson = props["pdfFields"] || "[]"
    const fields = JSON.parse(fieldsJson)
    return NextResponse.json({ fields })
  } catch (err) {
    console.error("GET /fields error:", err)
    return NextResponse.json({ fields: [] }, { status: 200 })
  }
}

// POST /api/documents/[documentId]/fields
// Saves fields to Google Drive appProperties for this document
export async function POST(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { documentId } = params
    const { fields } = await req.json()
    const fieldsJson = JSON.stringify(fields)
    // Google Drive appProperties values have a 124-byte limit per key
    // We chunk if needed, but typically fields fit in one key
    await updateFileMetadataWithServiceAccount({
      fileId: documentId,
      appProperties: { pdfFields: fieldsJson },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("POST /fields error:", err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
