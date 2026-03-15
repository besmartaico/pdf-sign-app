"use client"

import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import type { PdfField } from "./PdfViewer"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

export type FilledFieldValue = {
  value?: string
  signatureText?: string
  signatureFont?: string
}

type SignPdfViewerProps = {
  fileUrl: string
  fields: PdfField[]
  values: Record<string, FilledFieldValue>
  onFieldClick: (field: PdfField) => void
}

export default function SignPdfViewer({
  fileUrl,
  fields,
  values,
  onFieldClick
}: SignPdfViewerProps) {
  const [numPages, setNumPages] = useState(0)

  function onDocumentLoadSuccess({
    numPages
  }: {
    numPages: number
  }) {
    setNumPages(numPages)
  }

  return (
    <div>
      <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1

          return (
            <div
              key={`page_${pageNumber}`}
              style={{
                position: "relative",
                width: "800px",
                marginBottom: "20px",
                border: "1px solid #ddd",
                background: "#fff"
              }}
            >
              <Page pageNumber={pageNumber} width={800} />

              {fields
                .filter((field) => field.page === pageNumber)
                .map((field) => {
                  const fieldValue = values[field.id]

                  return (
                    <button
                      key={field.id}
                      onClick={() => onFieldClick(field)}
                      style={{
                        position: "absolute",
                        left: `${field.x}px`,
                        top: `${field.y}px`,
                        width: `${field.width}px`,
                        height: `${field.height}px`,
                        border: "2px solid #16a34a",
                        backgroundColor: "rgba(22, 163, 74, 0.08)",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "4px 8px",
                        textAlign: "center",
                        cursor: "pointer",
                        overflow: "hidden"
                      }}
                    >
                      <FieldDisplay field={field} fieldValue={fieldValue} />
                    </button>
                  )
                })}
            </div>
          )
        })}
      </Document>
    </div>
  )
}

function FieldDisplay({
  field,
  fieldValue
}: {
  field: PdfField
  fieldValue?: FilledFieldValue
}) {
  if (field.type === "signature" && fieldValue?.signatureText) {
    return (
      <span
        style={{
          fontFamily: fieldValue.signatureFont || "cursive",
          fontSize: "28px",
          lineHeight: 1,
          color: "#166534",
          whiteSpace: "nowrap"
        }}
      >
        {fieldValue.signatureText}
      </span>
    )
  }

  if ((field.type === "text" || field.type === "date") && fieldValue?.value) {
    return (
      <span
        style={{
          fontSize: "16px",
          color: "#166534",
          whiteSpace: "nowrap"
        }}
      >
        {fieldValue.value}
      </span>
    )
  }

  return (
    <span
      style={{
        fontSize: "14px",
        fontWeight: 600,
        color: "#166534"
      }}
    >
      {field.label}
    </span>
  )
}
