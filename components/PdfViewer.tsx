"use client"

import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Rnd } from "react-rnd"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export type PdfFieldType = "signature" | "text" | "date"

export type PdfField = {
  id: string
  type: PdfFieldType
  page: number
  x: number
  y: number
  width: number
  height: number
  label: string
}

type PdfViewerProps = {
  fileUrl: string
  fields: PdfField[]
  selectedFieldId: string | null
  isLocked: boolean
  onDocumentLoad?: (numPages: number) => void
  onSelectField: (fieldId: string) => void
  onUpdateField: (fieldId: string, updates: Partial<PdfField>) => void
}

export default function PdfViewer({
  fileUrl,
  fields,
  selectedFieldId,
  isLocked,
  onDocumentLoad,
  onSelectField,
  onUpdateField
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)

  function onDocumentLoadSuccess({
    numPages
  }: {
    numPages: number
  }) {
    setNumPages(numPages)
    onDocumentLoad?.(numPages)
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
                  const isSelected = field.id === selectedFieldId

                  return (
                    <Rnd
                      key={field.id}
                      size={{ width: field.width, height: field.height }}
                      position={{ x: field.x, y: field.y }}
                      disableDragging={isLocked}h
                      enableResizing={
                        isLocked
                          ? false
                          : {
                              bottom: false,
                              bottomLeft: false,
                              bottomRight: true,
                              left: false,
                              right: false,
                              top: false,
                              topLeft: false,
                              topRight: false
                            }
                      }
                      bounds="parent"
                      onDragStart={() => onSelectField(field.id)}
                      onMouseDown={() => onSelectField(field.id)}
                      onDragStop={(_e, data) => {
                        onUpdateField(field.id, {
                          x: data.x,
                          y: data.y
                        })
                      }}
                      onResizeStop={(_e, _direction, ref, _delta, position) => {
                        onUpdateField(field.id, {
                          x: position.x,
                          y: position.y,
                          width: ref.offsetWidth,
                          height: ref.offsetHeight
                        })
                      }}
                      resizeHandleStyles={{
                        bottomRight: {
                          width: "14px",
                          height: "14px",
                          right: "-7px",
                          bottom: "-7px",
                          background: "#2563eb",
                          borderRadius: "50%",
                          border: "2px solid white"
                        }
                      }}
                      style={{
                        zIndex: isSelected ? 20 : 10
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          border: isSelected
                            ? "3px solid #1d4ed8"
                            : "2px solid #2563eb",
                          backgroundColor: "rgba(37, 99, 235, 0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 600,
                          color: "#2563eb",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          cursor: isLocked ? "default" : "move",
                          userSelect: "none"
                        }}
                      >
                        {getFieldDisplayLabel(field.type, field.label)}
                      </div>
                    </Rnd>
                  )
                })}
            </div>
          )
        })}
      </Document>
    </div>
  )
}

function getFieldDisplayLabel(type: PdfFieldType, label: string) {
  if (label?.trim()) return label

  if (type === "signature") return "Signature"
  if (type === "text") return "Text"
  return "Date"
}
