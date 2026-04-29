import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import {
  downloadFileFromGoogleDriveWithServiceAccount,
  getGoogleDriveFileMetadataWithServiceAccount,
  getGoogleDriveFolderMetadataWithServiceAccount,
  uploadBufferToDriveWithServiceAccount
} from "../../../lib/googleDrive"
import { put } from "@vercel/blob"

type PdfFieldType = "signature" | "text" | "date"

type PdfField = {
  id: string
  type: PdfFieldType
  page: number
  x: number
  y: number
  width: number
  height: number
  label: string
}

type SignatureMode = "typed" | "drawn" | "uploaded"
type SignatureStyle = "neat" | "cursive" | "bold" | "quick-scribble" | "initials"

type FilledFieldValue = {
  value?: string
  signatureMode?: SignatureMode
  signatureText?: string
  signatureFont?: string
  signatureStyle?: SignatureStyle
  signatureImage?: string
  signatureVariant?: number
}

type RequestBody = {
  documentId: string
  fields: PdfField[]
  values: Record<string, FilledFieldValue>
  signerName?: string
  signerEmail?: string
}

const VIEWER_PAGE_WIDTH = 800

export async function POST(req: NextRequest) {
  try {
    const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || ""

    if (!targetFolderId) {
      return NextResponse.json(
        {
          success: false,
          error: "GOOGLE_DRIVE_FOLDER_ID is not set."
        },
        { status: 500 }
      )
    }

    const body = (await req.json()) as RequestBody
    const signerName = body.signerName?.trim() || ""
    const signerEmail = body.signerEmail?.trim() || ""

    if (!body.documentId) {
      return NextResponse.json(
        { success: false, error: "documentId is required" },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.fields)) {
      return NextResponse.json(
        { success: false, error: "fields must be an array" },
        { status: 400 }
      )
    }

    if (!body.values || typeof body.values !== "object") {
      return NextResponse.json(
        { success: false, error: "values must be an object" },
        { status: 400 }
      )
    }

    const folderMetadata =
      await getGoogleDriveFolderMetadataWithServiceAccount({
        folderId: targetFolderId
      })

    if (!folderMetadata?.id) {
      return NextResponse.json(
        {
          success: false,
          error: `Destination folder was not found: ${targetFolderId}`
        },
        { status: 500 }
      )
    }

    const originalPdfBytes =
      await downloadFileFromGoogleDriveWithServiceAccount({
        fileId: body.documentId
      })

    const originalMetadata =
      await getGoogleDriveFileMetadataWithServiceAccount({
        fileId: body.documentId
      })

    const pdfDoc = await PDFDocument.load(originalPdfBytes)
    const pages = pdfDoc.getPages()

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)

    for (const field of body.fields) {
      const page = pages[field.page - 1]
      if (!page) continue

      const fieldValue = body.values[field.id]
      if (!fieldValue) continue

      const pageWidth = page.getWidth()
      const pageHeight = page.getHeight()
      const scale = pageWidth / VIEWER_PAGE_WIDTH

      const pdfX = field.x * scale
      const pdfWidth = field.width * scale
      const pdfHeight = field.height * scale
      const pdfY = pageHeight - (field.y + field.height) * scale

      if (field.type === "signature") {
        if (fieldValue.signatureImage) {
          const imageBytes = dataUrlToBuffer(fieldValue.signatureImage)
          if (!imageBytes) continue

          const image = await embedImageFromDataUrl(
            pdfDoc,
            fieldValue.signatureImage,
            imageBytes
          )
          if (!image) continue

          const fit = getContainFit(image.width, image.height, pdfWidth, pdfHeight)

          page.drawImage(image, {
            x: pdfX + fit.offsetX,
            y: pdfY + fit.offsetY,
            width: fit.width,
            height: fit.height
          })

          continue
        }

        const signatureText = (fieldValue.signatureText || "").trim()
        if (!signatureText) continue

        const displayText =
          fieldValue.signatureStyle === "initials"
            ? toInitials(signatureText)
            : signatureText

        const font = pickSignatureFont(
          fieldValue.signatureFont,
          fieldValue.signatureStyle,
          helvetica,
          helveticaBold,
          timesItalic
        )

        const fontSize = Math.max(
          10,
          Math.min(pdfHeight * 0.72, pdfWidth / Math.max(displayText.length * 0.52, 1))
        )

        const textWidth = font.widthOfTextAtSize(displayText, fontSize)
        const textX = pdfX + Math.max(4, (pdfWidth - textWidth) / 2)
        const textY = pdfY + Math.max(2, (pdfHeight - fontSize) / 2)

        page.drawText(displayText, {
          x: textX,
          y: textY,
          size: fontSize,
          font,
          color: rgb(0.08, 0.33, 0.18)
        })

        continue
      }

      if (field.type === "text" || field.type === "date") {
        const value = (fieldValue.value || "").trim()
        if (!value) continue

        const fontSize = Math.max(
          9,
          Math.min(pdfHeight * 0.58, pdfWidth / Math.max(value.length * 0.5, 1))
        )

        page.drawText(value, {
          x: pdfX + 4,
          y: pdfY + Math.max(2, (pdfHeight - fontSize) / 2),
          size: fontSize,
          font: helvetica,
          color: rgb(0.08, 0.33, 0.18),
          maxWidth: Math.max(10, pdfWidth - 8)
        })
      }
    }

    const signedPdfBytes = await pdfDoc.save()

    const originalName = originalMetadata.name || "document.pdf"
    const safeBaseName = stripPdfExtension(originalName)
    // Format: formName_clientName_clientEmail_date
    const safeName = signerName ? signerName.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/ +/g, "_") : ""
    const safeEmail = signerEmail ? signerEmail.replace(/[^a-zA-Z0-9@._-]/g, "").replace(/@/g, "_at_") : ""
    const safeDate = formatTimestampForFileName(new Date())
    // Collect text field values to include in filename
    const textFieldValues = body.fields
      .filter(f => f.type === "text")
      .map(f => body.values[f.id]?.value || "")
      .filter(Boolean)
      .join("_")
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 60)
    const nameParts = [safeBaseName, textFieldValues, safeName, safeEmail, safeDate].filter(Boolean)
    const signedFileName = nameParts.join("_") + ".pdf"

    // Upload signed PDF to Vercel Blob (public store)
    const blob = await put(signedFileName, Buffer.from(signedPdfBytes), {
      access: "public",
      contentType: "application/pdf",
    })
    const uploaded = { id: blob.url, name: signedFileName, webViewLink: blob.url }

    // Send notification email to admin
    const resendApiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "besmartai.co@gmail.com"
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@resend.dev"
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pdf-sign-app-vert.vercel.app"
    if (resendApiKey) {
      const now = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: [adminEmail],
          subject: `✅ Document Signed: ${originalMetadata.name || "Document"}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#111827;border-radius:12px;border:1px solid #1e3a5f;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#166534,#16a34a);padding:24px 32px;">
              <h2 style="margin:0;color:#fff;font-size:20px;">✅ Document Signed</h2>
            </div>
            <div style="padding:28px 32px;">
              <p style="color:#e2e8f0;margin:0 0 16px;">A document has been signed and saved to Google Drive.</p>
              <div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
                <div style="color:#64748b;font-size:12px;margin-bottom:4px;">Document</div>
                <div style="color:#e2e8f0;font-weight:600;">${originalMetadata.name || "Document"}</div>
                <div style="color:#64748b;font-size:12px;margin-top:10px;margin-bottom:4px;">Signed File</div>
                <div style="color:#e2e8f0;">${signedFileName}</div>
                <div style="color:#64748b;font-size:12px;margin-top:10px;margin-bottom:4px;">Time</div>
                <div style="color:#e2e8f0;">${now}</div>
              </div>
              ${uploaded.webViewLink ? `<a href="${uploaded.webViewLink}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">View in Google Drive</a>` : ""}
            </div>
          </div>`
        })
      }).catch(() => {}) // fire-and-forget
    }

    return NextResponse.json({
      success: true,
      fileId: uploaded.id,
      fileName: uploaded.name,
      webViewLink: uploaded.webViewLink,
      folderName: folderMetadata.name || "",
      signedPdfBase64: Buffer.from(signedPdfBytes).toString("base64"),
      signedFileName,
      signerName,
      signerEmail
    })
  } catch (error: unknown) {
    console.error("Failed to generate signed PDF:", error)

    const maybeError = error as {
      message?: string
      code?: number
      response?: {
        data?: unknown
        status?: number
        statusText?: string
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          maybeError?.message ||
          "Unknown error while generating or uploading signed PDF",
        details: maybeError?.response?.data || null,
        status: maybeError?.response?.status || maybeError?.code || null
      },
      { status: 500 }
    )
  }
}

function stripPdfExtension(fileName: string) {
  return fileName.replace(/\.pdf$/i, "")
}

function formatTimestampForFileName(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")

  return `${year}-${month}-${day} ${hours}-${minutes}-${seconds}`
}

function dataUrlToBuffer(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",")
  if (commaIndex === -1) return null

  const base64 = dataUrl.slice(commaIndex + 1)
  return Buffer.from(base64, "base64")
}

async function embedImageFromDataUrl(
  pdfDoc: PDFDocument,
  dataUrl: string,
  imageBytes: Buffer
) {
  const lower = dataUrl.toLowerCase()

  if (lower.startsWith("data:image/png")) {
    return pdfDoc.embedPng(imageBytes)
  }

  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg")) {
    return pdfDoc.embedJpg(imageBytes)
  }

  try {
    return pdfDoc.embedPng(imageBytes)
  } catch {
    try {
      return pdfDoc.embedJpg(imageBytes)
    } catch {
      return null
    }
  }
}

function getContainFit(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
) {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return {
      width: targetWidth,
      height: targetHeight,
      offsetX: 0,
      offsetY: 0
    }
  }

  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale

  return {
    width,
    height,
    offsetX: (targetWidth - width) / 2,
    offsetY: (targetHeight - height) / 2
  }
}

function toInitials(text: string) {
  const initials = text
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  return initials || text
}

function pickSignatureFont(
  signatureFont: string | undefined,
  signatureStyle: SignatureStyle | undefined,
  helvetica: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  helveticaBold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  timesItalic: Awaited<ReturnType<PDFDocument["embedFont"]>>
) {
  if (signatureStyle === "bold") {
    return helveticaBold
  }

  if (
    signatureStyle === "neat" ||
    signatureStyle === "cursive" ||
    signatureStyle === "quick-scribble"
  ) {
    return timesItalic
  }

  if (signatureStyle === "initials") {
    return helveticaBold
  }

  if (
    signatureFont?.includes("Times") ||
    signatureFont?.includes("Georgia") ||
    signatureFont === "cursive"
  ) {
    return timesItalic
  }

  return helvetica
}
