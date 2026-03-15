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