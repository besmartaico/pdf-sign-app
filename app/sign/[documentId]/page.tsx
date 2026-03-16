"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import type { PdfField } from "../../../components/PdfViewer"
import type {
  FilledFieldValue,
  SignatureMode,
  SignatureStyle
} from "../../../components/SignPdfViewer"

const SignPdfViewer = dynamic(
  () => import("../../../components/SignPdfViewer"),
  {
    ssr: false,
    loading: () => <p style={{ color: "#94a3b8" }}>Loading signer preview...</p>
  }
)

type SignatureFontOption = {
  label: string
  value: string
}

const signatureFontOptions: SignatureFontOption[] = [
  { label: "Elegant Script", value: "cursive" },
  { label: "Georgia Italic", value: "Georgia, serif" },
  { label: "Times Italic", value: "'Times New Roman', serif" },
  { label: "Trebuchet", value: "'Trebuchet MS', sans-serif" },
  { label: "Verdana Italic", value: "Verdana, sans-serif" }
]

const signatureStyleOptions: Array<{ label: string; value: SignatureStyle }> = [
  { label: "Neat", value: "neat" },
  { label: "Cursive", value: "cursive" },
  { label: "Bold", value: "bold" },
  { label: "Quick Scribble", value: "quick-scribble" },
  { label: "Initials Style", value: "initials" }
]

const defaultSignatureStyle: SignatureStyle = "cursive"
const defaultSignatureMode: SignatureMode = "typed"
const drawCanvasWidth = 500
const drawCanvasHeight = 180

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

// Dark theme tokens
const C = {
  bg: "#0a0a0f",
  surface: "#111827",
  surfaceHover: "#1a2540",
  border: "#1e3a5f",
  borderLight: "#2d4a6e",
  accent: "#3b82f6",
  accentDark: "#1d4ed8",
  accentGlow: "rgba(59,130,246,0.15)",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  success: "#22c55e",
  successBg: "rgba(34,197,94,0.1)",
  danger: "#ef4444",
  dangerBg: "rgba(239,68,68,0.1)",
  inputBg: "#0f172a",
  modalBg: "rgba(0,0,0,0.75)"
}

export default function SignPage() {
  const params = useParams()
  const documentId = params.documentId as string
  const fileUrl = `/api/templates/${documentId}`
  const storageKey = `template-fields-${documentId}`
  const valuesStorageKey = `template-field-values-${documentId}`

  const [fields, setFields] = useState<PdfField[]>([])
  const [values, setValues] = useState<Record<string, FilledFieldValue>>({})
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const [textValue, setTextValue] = useState("")
  const [dateValue, setDateValue] = useState(todayISO())
  const [signatureMode, setSignatureMode] = useState<SignatureMode>(defaultSignatureMode)
  const [signatureText, setSignatureText] = useState("")
  const [signatureFont, setSignatureFont] = useState(signatureFontOptions[0].value)
  const [signatureStyle, setSignatureStyle] = useState<SignatureStyle>(defaultSignatureStyle)
  const [signatureVariant] = useState(0)
  const [signatureImage, setSignatureImage] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [isProcessingUpload, setIsProcessingUpload] = useState(false)
  const [isSubmittingSignedDocument, setIsSubmittingSignedDocument] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [savedFileLink, setSavedFileLink] = useState("")
  const [savedFileName, setSavedFileName] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)

  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const savedFields = localStorage.getItem(storageKey)
    const savedValues = localStorage.getItem(valuesStorageKey)
    if (savedFields) setFields(JSON.parse(savedFields) as PdfField[])
    if (savedValues) setValues(JSON.parse(savedValues) as Record<string, FilledFieldValue>)
    setIsLoaded(true)
  }, [storageKey, valuesStorageKey])

  useEffect(() => {
    if (!isLoaded) return
    localStorage.setItem(valuesStorageKey, JSON.stringify(values))
  }, [isLoaded, values, valuesStorageKey])

  const activeField = useMemo(
    () => fields.find((field) => field.id === activeFieldId) ?? null,
    [fields, activeFieldId]
  )

  const initializeCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#60a5fa"
    ctx.lineWidth = 2.4
  }, [])

  useEffect(() => {
    if (activeField?.type === "signature" && signatureMode === "drawn") {
      requestAnimationFrame(() => {
        initializeCanvas()
        if (signatureImage) drawImageOnCanvas(signatureImage, drawCanvasRef.current)
      })
    }
  }, [activeField, signatureMode, initializeCanvas])

  function handleFieldClick(field: PdfField) {
    setActiveFieldId(field.id)
    setUploadError("")
    setIsProcessingUpload(false)
    const existing = values[field.id]
    if (field.type === "signature") {
      setSignatureMode(existing?.signatureMode ?? defaultSignatureMode)
      setSignatureText(existing?.signatureText ?? "")
      setSignatureFont(existing?.signatureFont ?? signatureFontOptions[0].value)
      setSignatureStyle(existing?.signatureStyle ?? defaultSignatureStyle)
      setSignatureImage(existing?.signatureImage ?? "")
    }
    if (field.type === "text") setTextValue(existing?.value ?? "")
    if (field.type === "date") setDateValue(existing?.value ?? todayISO())
  }

  function saveActiveField() {
    if (!activeField) return
    if (activeField.type === "signature") {
      const nextValue: FilledFieldValue = { signatureMode, signatureText, signatureFont, signatureStyle, signatureVariant }
      if (signatureMode === "drawn" || signatureMode === "uploaded") nextValue.signatureImage = signatureImage
      setValues((cur) => ({ ...cur, [activeField.id]: nextValue }))
    }
    if (activeField.type === "text") setValues((cur) => ({ ...cur, [activeField.id]: { value: textValue } }))
    if (activeField.type === "date") setValues((cur) => ({ ...cur, [activeField.id]: { value: dateValue } }))
    setActiveFieldId(null)
  }

  function closeEditor() {
    setActiveFieldId(null)
    setUploadError("")
    setIsProcessingUpload(false)
  }

  function clearDrawnSignature() {
    setSignatureImage("")
    initializeCanvas()
  }

  async function handleSignatureUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadError("")
    setIsProcessingUpload(true)
    try {
      const fileDataUrl = await readFileAsDataUrl(file)
      const cleanedImage = await processUploadedSignature(fileDataUrl)
      if (!cleanedImage) throw new Error("Could not process image")
      setSignatureMode("uploaded")
      setSignatureImage(cleanedImage)
    } catch {
      setUploadError("That image could not be processed. Try a clearer photo or another file.")
    } finally {
      setIsProcessingUpload(false)
      if (uploadInputRef.current) uploadInputRef.current.value = ""
    }
  }

  function startDrawing(clientX: number, clientY: number) {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pt = getCanvasPoint(canvas, clientX, clientY)
    ctx.beginPath()
    ctx.moveTo(pt.x, pt.y)
    isDrawingRef.current = true
    setSignatureMode("drawn")
  }

  function continueDrawing(clientX: number, clientY: number) {
    if (!isDrawingRef.current) return
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pt = getCanvasPoint(canvas, clientX, clientY)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
  }

  function endDrawing() {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const canvas = drawCanvasRef.current
    if (!canvas) return
    trimCanvas(canvas).then((trimmed) => { if (trimmed) setSignatureImage(trimmed) })
  }

  async function submitSignedDocument() {
    setSubmitMessage("")
    setSavedFileLink("")
    setSavedFileName("")
    setIsSubmittingSignedDocument(true)
    try {
      const response = await fetch("/api/sign-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, fields, values })
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to save signed document")
      setSubmitMessage("Signed PDF saved to Drive.")
      setSavedFileLink(result.webViewLink || "")
      setSavedFileName(result.fileName || "")
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : "Failed to save signed document")
    } finally {
      setIsSubmittingSignedDocument(false)
    }
  }

  const typedPreviewStyle = buildSignaturePreviewStyle(signatureFont, signatureStyle, signatureVariant)
  const typedPreviewText = getSignaturePreviewText(signatureText, signatureStyle)

  const btnBase: React.CSSProperties = {
    padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontWeight: 600, fontSize: "14px", transition: "all 0.15s"
  }
  const primaryBtn: React.CSSProperties = { ...btnBase, background: C.accent, color: "#fff" }
  const secondaryBtn: React.CSSProperties = { ...btnBase, background: C.surface, color: C.textMuted, border: `1px solid ${C.border}` }

  return (
    <div style={{ color: C.text }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: C.text }}>Signer Preview</h1>
        <p style={{ margin: "6px 0 0", color: C.textMuted, fontSize: "14px" }}>Click a field on the PDF to fill it in.</p>
      </div>

      {/* Status bar */}
      <div style={{
        display: "flex", gap: "12px", marginBottom: "24px", padding: "12px 16px",
        background: C.surface, borderRadius: "10px", border: `1px solid ${C.border}`,
        alignItems: "center", flexWrap: "wrap"
      }}>
        <span style={{ fontSize: "13px", color: C.textMuted }}>
          Fields filled: <strong style={{ color: C.text }}>{Object.keys(values).length}</strong> / <strong style={{ color: C.text }}>{fields.length}</strong>
        </span>
        <div style={{ flex: 1 }} />
        <button style={primaryBtn} onClick={submitSignedDocument} disabled={isSubmittingSignedDocument}>
          {isSubmittingSignedDocument ? "Saving..." : "💾 Save Signed PDF to Drive"}
        </button>
      </div>

      {submitMessage && (
        <div style={{
          marginBottom: "16px", padding: "12px 16px", borderRadius: "8px",
          background: submitMessage.includes("saved") || submitMessage.includes("Drive") ? C.successBg : C.dangerBg,
          color: submitMessage.includes("saved") || submitMessage.includes("Drive") ? C.success : C.danger,
          border: `1px solid ${submitMessage.includes("saved") || submitMessage.includes("Drive") ? C.success : C.danger}40`,
          fontSize: "14px"
        }}>
          {submitMessage}
          {savedFileLink && (
            <a href={savedFileLink} target="_blank" rel="noreferrer"
              style={{ marginLeft: "12px", color: C.accent, fontWeight: 600 }}>
              Open in Drive →
            </a>
          )}
        </div>
      )}

      {/* PDF Viewer */}
      <div style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid ${C.border}` }}>
        {isLoaded && (
          <SignPdfViewer
            fileUrl={fileUrl}
            fields={fields}
            values={values}
            onFieldClick={handleFieldClick}
          />
        )}
      </div>

      {/* POPUP MODAL */}
      {activeField && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: C.modalBg, display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)"
        }} onClick={(e) => { if (e.target === e.currentTarget) closeEditor() }}>
          <div style={{
            background: C.surface, borderRadius: "16px", border: `1px solid ${C.border}`,
            padding: "28px", width: "520px", maxWidth: "95vw", maxHeight: "90vh",
            overflowY: "auto", boxShadow: `0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px ${C.border}`
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: C.text }}>
                  {activeField.type === "signature" ? "✍️ Sign Here" : activeField.type === "date" ? "📅 Enter Date" : "✏️ Enter Text"}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: C.textMuted }}>{activeField.label}</p>
              </div>
              <button onClick={closeEditor} style={{
                background: "transparent", border: "none", color: C.textMuted,
                fontSize: "22px", cursor: "pointer", padding: "4px 8px", borderRadius: "6px"
              }}>×</button>
            </div>

            {/* Signature Field */}
            {activeField.type === "signature" && (
              <>
                {/* Mode selector */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", marginBottom: "20px" }}>
                  {([{ label: "Typed", value: "typed" }, { label: "Draw", value: "drawn" }, { label: "Upload", value: "uploaded" }] as const).map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => { setUploadError(""); setSignatureMode(opt.value as SignatureMode) }}
                      style={{
                        ...btnBase, padding: "10px",
                        background: signatureMode === opt.value ? C.accentGlow : "transparent",
                        border: `2px solid ${signatureMode === opt.value ? C.accent : C.border}`,
                        color: signatureMode === opt.value ? C.accent : C.textMuted,
                        fontSize: "13px"
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Name input */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Your Name</label>
                  <input type="text" value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                    placeholder="Type your full name"
                    style={{
                      display: "block", width: "100%", marginTop: "6px", padding: "10px 12px",
                      background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: "8px",
                      color: C.text, fontSize: "14px", boxSizing: "border-box"
                    }} />
                </div>

                {/* Style selector */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Style</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "6px", marginTop: "8px" }}>
                    {signatureStyleOptions.map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setSignatureStyle(opt.value)}
                        style={{
                          ...btnBase, padding: "8px 6px", fontSize: "12px",
                          background: signatureStyle === opt.value ? C.accentGlow : "transparent",
                          border: `1px solid ${signatureStyle === opt.value ? C.accent : C.border}`,
                          color: signatureStyle === opt.value ? C.accent : C.textMuted
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font picker */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Font</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                    {signatureFontOptions.map((font) => (
                      <button key={font.value} type="button" onClick={() => setSignatureFont(font.value)}
                        style={{
                          textAlign: "left", borderRadius: "8px", padding: "10px 14px", cursor: "pointer",
                          background: signatureFont === font.value ? C.accentGlow : "transparent",
                          border: `1px solid ${signatureFont === font.value ? C.accent : C.border}`,
                        }}>
                        <div style={{ fontSize: "11px", color: C.textDim, marginBottom: "2px" }}>{font.label}</div>
                        <div style={{
                          fontFamily: font.value, fontSize: "26px", color: "#60a5fa", lineHeight: 1.1,
                          fontStyle: signatureStyle === "bold" ? "normal" : "italic",
                          fontWeight: signatureStyle === "bold" ? 700 : 500
                        }}>
                          {signatureText || "Your Signature"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Typed preview */}
                {signatureMode === "typed" && (
                  <div style={{
                    border: `1px solid ${C.border}`, borderRadius: "10px", padding: "20px",
                    minHeight: "90px", display: "flex", alignItems: "center", justifyContent: "center",
                    background: C.inputBg, marginBottom: "16px"
                  }}>
                    <span style={{ ...typedPreviewStyle, color: "#60a5fa" }}>
                      {typedPreviewText || "Signature Preview"}
                    </span>
                  </div>
                )}

                {/* Draw canvas */}
                {signatureMode === "drawn" && (
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", color: C.textMuted }}>Draw your signature below</span>
                      <button type="button" onClick={clearDrawnSignature} style={{ ...secondaryBtn, padding: "6px 12px", fontSize: "12px" }}>Clear</button>
                    </div>
                    <canvas ref={drawCanvasRef} width={drawCanvasWidth} height={drawCanvasHeight}
                      onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
                      onMouseMove={(e) => continueDrawing(e.clientX, e.clientY)}
                      onMouseUp={endDrawing} onMouseLeave={endDrawing}
                      onTouchStart={(e) => { const t = e.touches[0]; if (t) startDrawing(t.clientX, t.clientY) }}
                      onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; if (t) continueDrawing(t.clientX, t.clientY) }}
                      onTouchEnd={endDrawing}
                      style={{ width: "100%", borderRadius: "8px", border: `1px solid ${C.border}`, touchAction: "none" }} />
                  </div>
                )}

                {/* Upload */}
                {signatureMode === "uploaded" && (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Upload signature photo</label>
                    <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleSignatureUpload}
                      style={{ display: "block", marginTop: "8px", color: C.textMuted }} />
                    {isProcessingUpload && <div style={{ marginTop: "8px", fontSize: "13px", color: C.textMuted }}>Processing...</div>}
                    {uploadError && <div style={{ marginTop: "8px", fontSize: "13px", color: C.danger }}>{uploadError}</div>}
                    {signatureImage && (
                      <div style={{ marginTop: "12px", padding: "12px", background: C.inputBg, borderRadius: "8px", border: `1px solid ${C.border}` }}>
                        <img src={signatureImage} alt="Uploaded signature" style={{ maxWidth: "100%", maxHeight: "100px", objectFit: "contain" }} />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Text Field */}
            {activeField.type === "text" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Text Value</label>
                <input type="text" value={textValue} onChange={(e) => setTextValue(e.target.value)}
                  style={{
                    display: "block", width: "100%", marginTop: "8px", padding: "12px",
                    background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: "8px",
                    color: C.text, fontSize: "15px", boxSizing: "border-box"
                  }} />
              </div>
            )}

            {/* Date Field */}
            {activeField.type === "date" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</label>
                <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)}
                  style={{
                    display: "block", width: "100%", marginTop: "8px", padding: "12px",
                    background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: "8px",
                    color: C.text, fontSize: "15px", boxSizing: "border-box",
                    colorScheme: "dark"
                  }} />
                <p style={{ margin: "6px 0 0", fontSize: "12px", color: C.textDim }}>Defaults to today — change if needed.</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <button type="button" onClick={saveActiveField} style={{ ...primaryBtn, flex: 1 }}>Save</button>
              <button type="button" onClick={closeEditor} style={secondaryBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  }
}

function drawImageOnCanvas(imageSrc: string, canvas: HTMLCanvasElement | null) {
  if (!canvas || !imageSrc) return
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const image = new Image()
  image.onload = () => {
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height)
    const w = image.width * scale, h = image.height * scale
    ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
  }
  image.src = imageSrc
}

function buildSignaturePreviewStyle(fontFamily: string, signatureStyle: SignatureStyle, signatureVariant: number) {
  const rotation = ((signatureVariant % 5) - 2) * 0.8
  const translateY = signatureVariant % 3
  const base: Record<string, string | number> = { fontFamily, lineHeight: 1, display: "inline-block", transformOrigin: "center" }
  if (signatureStyle === "neat") return { ...base, fontSize: "34px", fontWeight: 500, fontStyle: "italic", letterSpacing: "0.01em", transform: `rotate(${rotation * 0.4}deg) translateY(${translateY}px)` }
  if (signatureStyle === "bold") return { ...base, fontSize: "36px", fontWeight: 700, letterSpacing: "0.01em", transform: `rotate(${rotation * 0.6}deg) translateY(${translateY}px) scaleY(1.05)` }
  if (signatureStyle === "quick-scribble") return { ...base, fontSize: "37px", fontStyle: "italic", letterSpacing: "-0.03em", transform: `rotate(${rotation + 1.4}deg) translateY(${translateY + 1}px) skewX(-8deg)` }
  if (signatureStyle === "initials") return { ...base, fontSize: "38px", fontWeight: 700, letterSpacing: "0.12em", transform: `rotate(${rotation + 1}deg) translateY(${translateY}px)` }
  return { ...base, fontSize: "36px", fontStyle: "italic", letterSpacing: "0em", transform: `rotate(${rotation}deg) translateY(${translateY}px) skewX(-4deg)` }
}

function getSignaturePreviewText(text: string, signatureStyle: SignatureStyle) {
  if (signatureStyle !== "initials") return text
  return text.split(" ").filter(Boolean).map((p) => p[0]?.toUpperCase() ?? "").join("")
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === "string") resolve(reader.result); else reject(new Error("Could not read file")) }
    reader.onerror = () => reject(new Error("File read failed"))
    reader.readAsDataURL(file)
  })
}

function loadImage(imageSrc: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Image load failed"))
    image.src = imageSrc
  })
}

async function trimCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  let top = height, left = width, right = 0, bottom = 0, hasInk = false
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (data[i + 3] > 0 && (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245)) {
        hasInk = true
        if (x < left) left = x; if (x > right) right = x
        if (y < top) top = y; if (y > bottom) bottom = y
      }
    }
  }
  if (!hasInk) return ""
  const pad = 8
  const sx = Math.max(left - pad, 0), sy = Math.max(top - pad, 0)
  const sw = Math.min(right - left + pad * 2, width - sx), sh = Math.min(bottom - top + pad * 2, height - sy)
  const out = document.createElement("canvas"); out.width = sw; out.height = sh
  const octx = out.getContext("2d"); if (!octx) return ""
  octx.clearRect(0, 0, sw, sh)
  octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
  return out.toDataURL("image/png")
}

async function processUploadedSignature(imageSrc: string) {
  return trimTransparentImage(await makeTransparentSignature(imageSrc))
}

async function makeTransparentSignature(imageSrc: string) {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height
  const ctx = canvas.getContext("2d"); if (!ctx) return imageSrc
  ctx.drawImage(image, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
    if (avg > 235) { data[i + 3] = 0 } else { data[i] = 96; data[i + 1] = 165; data[i + 2] = 250; data[i + 3] = 255 }
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL("image/png")
}

async function trimTransparentImage(imageSrc: string) {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height
  const ctx = canvas.getContext("2d"); if (!ctx) return imageSrc
  ctx.drawImage(image, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  let top = canvas.height, left = canvas.width, right = 0, bottom = 0, hasInk = false
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 10) {
        hasInk = true
        if (x < left) left = x; if (x > right) right = x
        if (y < top) top = y; if (y > bottom) bottom = y
      }
    }
  }
  if (!hasInk) return imageSrc
  const pad = 10
  const sx = Math.max(left - pad, 0), sy = Math.max(top - pad, 0)
  const sw = Math.min(right - left + pad * 2, canvas.width - sx), sh = Math.min(bottom - top + pad * 2, canvas.height - sy)
  const out = document.createElement("canvas"); out.width = sw; out.height = sh
  const octx = out.getContext("2d"); if (!octx) return imageSrc
  octx.clearRect(0, 0, sw, sh)
  octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
  return out.toDataURL("image/png")
}
