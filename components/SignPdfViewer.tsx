"use client"

import { useState, useRef, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import type { PdfField } from "./PdfViewer"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export type SignatureMode = "typed" | "drawn" | "uploaded"
export type SignatureStyle =
  | "neat"
  | "cursive"
  | "bold"
  | "quick-scribble"
  | "initials"

export type FilledFieldValue = {
  value?: string
  signatureMode?: SignatureMode
  signatureText?: string
  signatureFont?: string
  signatureStyle?: SignatureStyle
  signatureImage?: string
  signatureVariant?: number
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  function onDocumentLoadSuccess({
    numPages
  }: {
    numPages: number
  }) {
    setNumPages(numPages)
  }

  return (
    <div ref={containerRef} style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
      <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1
          const scale = containerWidth / 800

          return (
            <div
              key={`page_${pageNumber}`}
              style={{
                position: "relative",
                width: "100%",
                marginBottom: "20px",
                border: "1px solid #ddd",
                background: "#fff"
              }}
            >
              <Page pageNumber={pageNumber} width={containerWidth} />

              {fields
                .filter((field) => field.page === pageNumber)
                .map((field) => {
                  const fieldValue = values[field.id]
                  const isSignatureImage =
                    field.type === "signature" && Boolean(fieldValue?.signatureImage)

                  return (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => onFieldClick(field)}
                      style={{
                        position: "absolute",
                        left: `${field.x * scale}px`,
                        top: `${field.y * scale}px`,
                        width: `${field.width * scale}px`,
                        height: `${field.height * scale}px`,
                        border: "2px solid #16a34a",
                        backgroundColor: "rgba(22, 163, 74, 0.12)",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: isSignatureImage ? "2px" : "4px 8px",
                        textAlign: "center",
                        cursor: "pointer",
                        overflow: "hidden",
                        zIndex: 50
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
  if (field.type === "signature") {
    if (fieldValue?.signatureImage) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            pointerEvents: "none"
          }}
        >
          <img
            src={fieldValue.signatureImage}
            alt="Signature"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              pointerEvents: "none"
            }}
          />
        </div>
      )
    }

    if (fieldValue?.signatureText) {
      const signatureStyle = buildSignatureStyle(fieldValue)

      return (
        <span
          style={{
            ...signatureStyle,
            color: "#166534",
            whiteSpace: "nowrap",
            display: "inline-block",
            maxWidth: "100%",
            pointerEvents: "none"
          }}
        >
          {getSignatureDisplayText(fieldValue)}
        </span>
      )
    }
  }

  if ((field.type === "text" || field.type === "date") && fieldValue?.value) {
    return (
      <span
        style={{
          fontSize: "16px",
          color: "#166534",
          whiteSpace: "nowrap",
          pointerEvents: "none"
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
        color: "#166534",
        pointerEvents: "none"
      }}
    >
      {field.label}
    </span>
  )
}

function getSignatureDisplayText(fieldValue: FilledFieldValue) {
  const text = fieldValue.signatureText ?? ""

  if (fieldValue.signatureStyle === "initials") {
    const initials = text
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")

    return initials || text
  }

  return text
}

function buildSignatureStyle(fieldValue: FilledFieldValue) {
  const variant = fieldValue.signatureVariant ?? 0
  const style = fieldValue.signatureStyle ?? "cursive"
  const rotation = ((variant % 5) - 2) * 0.8
  const translateY = variant % 3

  const baseStyle: Record<string, string | number> = {
    fontFamily: fieldValue.signatureFont || "cursive",
    fontSize: "30px",
    lineHeight: 1,
    transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
    transformOrigin: "center",
    letterSpacing: "0.02em"
  }

  if (style === "neat") {
    return {
      ...baseStyle,
      fontSize: "28px",
      fontWeight: 500,
      fontStyle: "italic",
      letterSpacing: "0.01em"
    }
  }

  if (style === "bold") {
    return {
      ...baseStyle,
      fontSize: "30px",
      fontWeight: 700,
      transform: `rotate(${rotation * 0.6}deg) translateY(${translateY}px) scaleY(1.05)`,
      letterSpacing: "0.01em"
    }
  }

  if (style === "quick-scribble") {
    return {
      ...baseStyle,
      fontSize: "31px",
      fontStyle: "italic",
      letterSpacing: "-0.02em",
      transform: `rotate(${rotation + 1.5}deg) translateY(${translateY + 1}px) skewX(-8deg)`
    }
  }

  if (style === "initials") {
    return {
      ...baseStyle,
      fontSize: "32px",
      fontWeight: 700,
      letterSpacing: "0.12em",
      transform: `rotate(${rotation + 1}deg) translateY(${translateY}px)`
    }
  }

  return {
    ...baseStyle,
    fontSize: "31px",
    fontStyle: "italic",
    letterSpacing: "0em",
    transform: `rotate(${rotation}deg) translateY(${translateY}px) skewX(-4deg)`
  }
}
