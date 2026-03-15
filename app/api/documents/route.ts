import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const formData = await req.formData()

  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json(
      { error: "No file received" },
      { status: 400 }
    )
  }

  console.log("Received file:", file.name)

  return NextResponse.json({
    success: true,
    fileName: file.name
  })
}