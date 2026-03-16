import { downloadFileFromGoogleDriveWithServiceAccount, getGoogleDriveFileMetadataWithServiceAccount } from "../../../../lib/googleDrive"

export async function GET(
  _req: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await context.params

    const fileResponse = await downloadFileFromGoogleDriveWithServiceAccount({
      fileId: documentId
    })

    const metadataResponse =
      await getGoogleDriveFileMetadataWithServiceAccount({
        fileId: documentId
      })

    const fileName = metadataResponse.name || "template.pdf"
    const mimeType = metadataResponse.mimeType || "application/pdf"

    return new Response(Buffer.from(fileResponse), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileName}"`
      }
    })
  } catch (error) {
    console.error("Template fetch failed:", error)

    return new Response("Unable to load template file.", { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await context.params
    if (!documentId) {
      return new Response("Missing documentId", { status: 400 })
    }
    const { deleteFileWithServiceAccount } = await import("../../../../lib/googleDrive")
    await deleteFileWithServiceAccount({ fileId: documentId })
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Delete file failed:", error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Failed to delete" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
