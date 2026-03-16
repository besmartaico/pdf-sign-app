"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import type { PdfField, PdfFieldType } from "../../../../../components/PdfViewer"

const PdfViewer = dynamic(
  () => import("../../../../../components/PdfViewer"),
  { ssr: false, loading: () => <p style={{ color: "#94a3b8", padding: "20px" }}>Loading PDF viewer...</p> }
)

const C = {
  bg: "#0a0a0f", surface: "#0f172a", surfaceHigh: "#111827", border: "#1e3a5f",
  borderActive: "#3b82f6", accent: "#3b82f6", accentGlow: "rgba(59,130,246,0.15)",
  text: "#e2e8f0", textMuted: "#94a3b8", textDim: "#64748b",
  danger: "#ef4444", dangerBg: "rgba(239,68,68,0.1)",
  success: "#22c55e", successBg: "rgba(34,197,94,0.1)",
  warning: "#f59e0b", warningBg: "rgba(245,158,11,0.1)",
  inputBg: "#0a0a0f"
}

const FIELD_COLORS: Record<PdfFieldType, { bg: string; border: string; text: string; icon: string }> = {
  signature: { bg: "rgba(59,130,246,0.12)", border: "#3b82f6", text: "#93c5fd", icon: "✍️" },
  text:      { bg: "rgba(34,197,94,0.1)",   border: "#22c55e", text: "#86efac", icon: "📝" },
  date:      { bg: "rgba(245,158,11,0.1)",  border: "#f59e0b", text: "#fcd34d", icon: "📅" }
}

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
  const [previewOpen, setPreviewOpen] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const parsed = JSON.parse(saved) as PdfField[]
      setFields(parsed)
      setSelectedFieldId(parsed[0]?.id ?? null)
    } else {
      const starterField: PdfField = {
        id: crypto.randomUUID(), type: "signature", page: 1,
        x: 120, y: 620, width: 180, height: 50, label: "Signature"
      }
      setFields([starterField])
      setSelectedFieldId(starterField.id)
    }
    setIsLoaded(true)
  }, [storageKey])

  useEffect(() => {
    if (!isLoaded) return
    localStorage.setItem(storageKey, JSON.stringify(fields))
    setSaveFlash(true)
    const t = setTimeout(() => setSaveFlash(false), 1500)
    return () => clearTimeout(t)
  }, [fields, isLoaded, storageKey])

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? fields[0] ?? null
  const pageOptions = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages])

  function addField(type: PdfFieldType) {
    const newField: PdfField = {
      id: crypto.randomUUID(), type, page: 1,
      x: 120, y: 120 + fields.length * 70,
      width: type === "signature" ? 180 : 160, height: 50,
      label: type === "signature" ? "Signature" : type === "text" ? "Text" : "Date"
    }
    setFields((cur) => [...cur, newField])
    setSelectedFieldId(newField.id)
  }

  function updateField(fieldId: string, updates: Partial<PdfField>) {
    setFields((cur) => cur.map((f) => f.id === fieldId ? { ...f, ...updates } : f))
  }

  function deleteSelectedField() {
    if (!selectedField) return
    const remaining = fields.filter((f) => f.id !== selectedField.id)
    setFields(remaining)
    setSelectedFieldId(remaining[0]?.id ?? null)
  }

  const btnBase: React.CSSProperties = {
    padding: "9px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontWeight: 600, fontSize: "13px", transition: "all 0.15s",
    display: "inline-flex", alignItems: "center", gap: "6px"
  }

  return (
    <div style={{ color: C.text, display: "flex", flexDirection: "column", gap: "0", height: "calc(100vh - 92px)", overflow: "hidden", margin: "-32px", padding: "0" }}>

      {/* Top toolbar */}
      <div style={{
        background: C.surfaceHigh, borderBottom: `1px solid ${C.border}`,
        padding: "12px 24px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap"
      }}>
        {/* Back */}
        <a href="/admin/documents" style={{
          ...btnBase, background: "transparent", color: C.textMuted,
          border: `1px solid ${C.border}`, textDecoration: "none", marginRight: "4px"
        }}>← Back</a>

        <div style={{ width: "1px", height: "28px", background: C.border }} />

        {/* Add field buttons */}
        {(["signature", "text", "date"] as PdfFieldType[]).map((type) => {
          const fc = FIELD_COLORS[type]
          return (
            <button key={type} onClick={() => addField(type)} style={{
              ...btnBase, background: fc.bg, color: fc.text,
              border: `1px solid ${fc.border}60`
            }}>
              {fc.icon} Add {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          )
        })}

        <div style={{ width: "1px", height: "28px", background: C.border }} />

        {/* Lock */}
        <button onClick={() => setIsLocked((cur) => !cur)} style={{
          ...btnBase,
          background: isLocked ? "rgba(245,158,11,0.15)" : "transparent",
          color: isLocked ? C.warning : C.textMuted,
          border: `1px solid ${isLocked ? C.warning + "60" : C.border}`
        }}>
          {isLocked ? "🔒 Locked" : "🔓 Lock Fields"}
        </button>

        {/* Delete */}
        <button onClick={deleteSelectedField} disabled={!selectedField} style={{
          ...btnBase, background: selectedField ? C.dangerBg : "transparent",
          color: selectedField ? C.danger : C.textDim,
          border: `1px solid ${selectedField ? C.danger + "60" : C.border}`,
          opacity: selectedField ? 1 : 0.4
        }}>
          🗑 Delete Selected
        </button>

        <div style={{ flex: 1 }} />

        {/* Auto-save indicator */}
        <span style={{
          fontSize: "12px", color: saveFlash ? C.success : C.textDim,
          transition: "color 0.3s", display: "flex", alignItems: "center", gap: "5px"
        }}>
          {saveFlash ? "✓ Saved" : "Auto-saved"}
        </span>

        {/* Preview */}
        <button onClick={() => setPreviewOpen(true)} style={{
          ...btnBase, background: C.accentGlow, color: C.accent,
          border: `1px solid ${C.border}`
        }}>
          👁 Signer Preview
        </button>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left sidebar */}
        <div style={{
          width: "280px", minWidth: "280px", background: C.surface,
          borderRight: `1px solid ${C.border}`, display: "flex",
          flexDirection: "column", overflow: "hidden"
        }}>
          {/* Selected field editor */}
          <div style={{ padding: "16px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "11px", color: C.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px" }}>
              Selected Field
            </div>

            {!selectedField ? (
              <p style={{ color: C.textDim, fontSize: "13px", margin: 0 }}>No field selected.</p>
            ) : (
              <>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Label</label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    style={{
                      width: "100%", padding: "8px 10px", background: C.inputBg,
                      border: `1px solid ${C.border}`, borderRadius: "6px",
                      color: C.text, fontSize: "13px", boxSizing: "border-box"
                    }}
                  />
                </div>
                <div style={{ marginBottom: "4px" }}>
                  <label style={{ fontSize: "11px", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>Page</label>
                  <select
                    value={selectedField.page}
                    onChange={(e) => updateField(selectedField.id, { page: Number(e.target.value) })}
                    style={{
                      width: "100%", padding: "8px 10px", background: C.inputBg,
                      border: `1px solid ${C.border}`, borderRadius: "6px",
                      color: C.text, fontSize: "13px"
                    }}
                  >
                    {pageOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ marginTop: "10px", padding: "8px 10px", background: FIELD_COLORS[selectedField.type].bg, borderRadius: "6px", border: `1px solid ${FIELD_COLORS[selectedField.type].border}40` }}>
                  <span style={{ fontSize: "12px", color: FIELD_COLORS[selectedField.type].text }}>
                    {FIELD_COLORS[selectedField.type].icon} {selectedField.type.charAt(0).toUpperCase() + selectedField.type.slice(1)} field
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Field list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            <div style={{ fontSize: "11px", color: C.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>
              All Fields ({fields.length})
            </div>
            {fields.length === 0 ? (
              <p style={{ color: C.textDim, fontSize: "13px" }}>No fields yet. Add one above.</p>
            ) : (
              fields.map((field, index) => {
                const fc = FIELD_COLORS[field.type]
                const isSelected = field.id === selectedFieldId
                return (
                  <button
                    key={field.id}
                    onClick={() => setSelectedFieldId(field.id)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "10px 12px", borderRadius: "8px", cursor: "pointer",
                      marginBottom: "6px", transition: "all 0.15s",
                      background: isSelected ? fc.bg : "transparent",
                      border: `1px solid ${isSelected ? fc.border : C.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "14px" }}>{fc.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: isSelected ? fc.text : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {field.label}
                        </div>
                        <div style={{ fontSize: "11px", color: C.textDim }}>
                          Field {index + 1} · Page {field.page}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* PDF Canvas area */}
        <div style={{ flex: 1, overflow: "auto", background: C.bg, padding: "20px" }}>
          <div style={{ fontSize: "12px", color: C.textDim, marginBottom: "12px" }}>
            💡 Drag fields onto the PDF · Resize from bottom-right corner · Lock when done
          </div>
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

      {/* Signer Preview Modal */}
      {previewOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.8)", display: "flex",
          alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)"
        }} onClick={(e) => { if (e.target === e.currentTarget) setPreviewOpen(false) }}>
          <div style={{
            background: C.surfaceHigh, borderRadius: "16px", border: `1px solid ${C.border}`,
            width: "95vw", maxWidth: "1100px", height: "90vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 25px 60px rgba(0,0,0,0.8)"
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0
            }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: C.text }}>👁 Signer Preview</span>
              <button onClick={() => setPreviewOpen(false)} style={{
                background: "transparent", border: "none", color: C.textMuted,
                fontSize: "22px", cursor: "pointer", padding: "2px 8px"
              }}>×</button>
            </div>
            <iframe
              src={`/sign/${documentId}`}
              style={{ flex: 1, border: "none", borderRadius: "0 0 16px 16px", background: C.bg }}
              title="Signer Preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}
