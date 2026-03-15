"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import type { PdfField, PdfFieldType } from "../../../../../components/PdfViewer"

const PdfViewer = dynamic(
  () => import("../../../../../components/PdfViewer"),
  {
    ssr: false,
    loading: () => <p>Loading PDF viewer...</p>
  }
)

export default function PlaceFieldsPage() {
  const params = useParams()
  const documentId = params.documentId as string
  const fileUrl = `/api/templates/${documentId}`
  const storageKey = `template-fields-${documentId}`

  const [fields, setFields] = useState<PdfField[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(1)
  const [isLocked, setIsLocked] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)

    if (saved) {
      const parsed = JSON.parse(saved) as PdfField[]
      setFields(parsed)
      setSelectedFieldId(parsed[0]?.id ?? null)
    } else {
      const starterField: PdfField = {
        id: crypto.randomUUID(),
        type: "signature",
        page: 1,
        x: 120,
        y: 620,
        width: 180,
        height: 50,
        label: "Signature"
      }

      setFields([starterField])
      setSelectedFieldId(starterField.id)
    }

    setIsLoaded(true)
  }, [storageKey])

  useEffect(() => {
    if (!isLoaded) return
    localStorage.setItem(storageKey, JSON.stringify(fields))
  }, [fields, isLoaded, storageKey])

  const selectedField =
    fields.find((field) => field.id === selectedFieldId) ?? fields[0] ?? null

  const pageOptions = useMemo(() => {
    return Array.from({ length: numPages }, (_, i) => i + 1)
  }, [numPages])

  function addField(type: PdfFieldType) {
    const newField: PdfField = {
      id: crypto.randomUUID(),
      type,
      page: 1,
      x: 120,
      y: 120 + fields.length * 70,
      width: type === "signature" ? 180 : 160,
      height: 50,
      label:
        type === "signature" ? "Signature" : type === "text" ? "Text" : "Date"
    }

    setFields((current) => [...current, newField])
    setSelectedFieldId(newField.id)
  }

  function updateField(fieldId: string, updates: Partial<PdfField>) {
    setFields((current) =>
      current.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    )
  }

  function deleteSelectedField() {
    if (!selectedField) return

    const remaining = fields.filter((field) => field.id !== selectedField.id)
    setFields(remaining)
    setSelectedFieldId(remaining[0]?.id ?? null)
  }

  return (
    <div>
      <h1>Place Fields</h1>
      <p>Drag fields onto the PDF, resize from the bottom-right corner, then lock them in place.</p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginTop: "20px",
          marginBottom: "20px"
        }}
      >
        <button onClick={() => addField("signature")}>Add Signature</button>
        <button onClick={() => addField("text")}>Add Text</button>
        <button onClick={() => addField("date")}>Add Date</button>
        <button onClick={() => setIsLocked((current) => !current)}>
          {isLocked ? "Unlock Fields" : "Lock Fields"}
        </button>
        <button onClick={deleteSelectedField} disabled={!selectedField}>
          Delete Selected
        </button>
        <a
          href={`/sign/${documentId}`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 12px",
            border: "1px solid #999",
            borderRadius: "4px",
            textDecoration: "none",
            color: "black",
            background: "#f5f5f5"
          }}
        >
          Open Signer Preview
        </a>
      </div>

      <div
        style={{
          display: "flex",
          gap: "30px",
          alignItems: "flex-start"
        }}
      >
        <div style={{ width: "320px" }}>
          <div
            style={{
              border: "1px solid #ccc",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "20px"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Selected Field</h3>

            {!selectedField ? (
              <p>No field selected.</p>
            ) : (
              <>
                <div style={{ marginBottom: "12px" }}>
                  <label>Label</label>
                  <br />
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) =>
                      updateField(selectedField.id, { label: e.target.value })
                    }
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label>Page</label>
                  <br />
                  <select
                    value={selectedField.page}
                    onChange={(e) =>
                      updateField(selectedField.id, {
                        page: Number(e.target.value)
                      })
                    }
                  >
                    {pageOptions.map((page) => (
                      <option key={page} value={page}>
                        {page}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div
            style={{
              border: "1px solid #ccc",
              padding: "16px",
              borderRadius: "8px"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Current Fields</h3>

            {fields.length === 0 ? (
              <p>No fields yet.</p>
            ) : (
              fields.map((field, index) => {
                const isSelected = field.id === selectedFieldId

                return (
                  <button
                    key={field.id}
                    onClick={() => setSelectedFieldId(field.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px",
                      border: isSelected
                        ? "2px solid #1d4ed8"
                        : "1px solid #e5e5e5",
                      background: isSelected ? "#eff6ff" : "white",
                      marginBottom: "8px",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <div>
                      <strong>
                        Field {index + 1} - {field.type}
                      </strong>
                    </div>
                    <div>Label: {field.label}</div>
                    <div>Page: {field.page}</div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div>
          {isLoaded && (
            <PdfViewer
              fileUrl={fileUrl}
              fields={fields}
              selectedFieldId={selectedField?.id ?? null}
              isLocked={isLocked}
              onDocumentLoad={setNumPages}
              onSelectField={setSelectedFieldId}
              onUpdateField={updateField}
            />
          )}
        </div>
      </div>
    </div>
  )
}
