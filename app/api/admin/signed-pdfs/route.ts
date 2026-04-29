import { NextRequest, NextResponse } from "next/server"
import { list, del } from "@vercel/blob"

// GET: list all signed PDFs in blob storage
export async function GET() {
  try {
    const { blobs } = await list()
    return NextResponse.json({ blobs })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE: remove a blob by URL after download
export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 })
    await del(url)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
