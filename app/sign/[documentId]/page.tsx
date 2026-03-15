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
    loading: () => <p>Loading signer preview...</p>
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
  const [dateValue, setDateValue] = useState("")
  const [signatureMode, setSignatureMode] = useState<SignatureMode>(defaultSignatureMode)
  const [signatureText, setSignatureText] = useState("")
  const [signatureFont, setSignatureFont] = useState(signatureFontOptions[0].value)
  const [signatureStyle, setSignatureStyle] =
    useState<SignatureStyle>(defaultSignatureStyle)
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

    if (savedFields) {
      const parsed = JSON.parse(savedFields) as PdfField[]
      setFields(parsed)
    }

    if (savedValues) {
      const parsed = JSON.parse(savedValues) as Record<string, FilledFieldValue>
      setValues(parsed)
    }

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

    const context = canvas.getContext("2d")
    if (!context) return

    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.lineCap = "round"
    context.lineJoin = "round"
    context.strokeStyle = "#14532d"
    context.lineWidth = 2.4
  }, [])

  useEffect(() => {
    if (activeField?.type === "signature" && signatureMode === "drawn") {
      requestAnimationFrame(() => {
        initializeCanvas()

        if (signatureImage) {
          drawImageOnCanvas(signatureImage, drawCanvasRef.current)
        }
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

    if (field.type === "text") {
      setTextValue(existing?.value ?? "")
    }

    if (field.type === "date") {
      setDateValue(existing?.value ?? "")
    }
  }

  function saveActiveField() {
    if (!activeField) return

    if (activeField.type === "signature") {
      const nextValue: FilledFieldValue = {
        signatureMode,
        signatureText,
        signatureFont,
        signatureStyle,
        signatureVariant
      }

      if (signatureMode === "drawn" || signatureMode === "uploaded") {
        nextValue.signatureImage = signatureImage
      }

      setValues((current) => ({
        ...current,
        [activeField.id]: nextValue
      }))
    }

    if (activeField.type === "text") {
      setValues((current) => ({
        ...current,
        [activeField.id]: {
          value: textValue
        }
      }))
    }

    if (activeField.type === "date") {
      setValues((current) => ({
        ...current,
        [activeField.id]: {
          value: dateValue
        }
      }))
    }

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

      if (!cleanedImage) {
        throw new Error("Could not process image")
      }

      setSignatureMode("uploaded")
      setSignatureImage(cleanedImage)
    } catch (error) {
      console.error("Signature upload failed:", error)
      setUploadError("That image could not be processed. Try a clearer photo or another file.")
    } finally {
      setIsProcessingUpload(false)
      if (uploadInputRef.current) {
        uploadInputRef.current.value = ""
      }
    }
  }

  function startDrawing(clientX: number, clientY: number) {
    const canvas = drawCanvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    const point = getCanvasPoint(canvas, clientX, clientY)
    context.beginPath()
    context.moveTo(point.x, point.y)
    isDrawingRef.current = true
    setSignatureMode("drawn")
  }

  function continueDrawing(clientX: number, clientY: number) {
    if (!isDrawingRef.current) return

    const canvas = drawCanvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    const point = getCanvasPoint(canvas, clientX, clientY)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  function endDrawing() {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    const canvas = drawCanvasRef.current
    if (!canvas) return

    trimCanvas(canvas).then((trimmed) => {
      if (trimmed) {
        setSignatureImage(trimmed)
      }
    })
  }

  async function submitSignedDocument() {
    setSubmitMessage("")
    setSavedFileLink("")
    setSavedFileName("")

    setIsSubmittingSignedDocument(true)

    try {
      const response = await fetch("/api/sign-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          documentId,
          fields,
          values
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save signed document")
      }

      setSubmitMessage("Signed PDF saved to Signed Liability Forms.")
      setSavedFileLink(result.webViewLink || "")
      setSavedFileName(result.fileName || "")
    } catch (error) {
      console.error(error)
      setSubmitMessage(
        error instanceof Error ? error.message : "Failed to save signed document"
      )
    } finally {
      setIsSubmittingSignedDocument(false)
    }
  }

  const typedPreviewStyle = buildSignaturePreviewStyle(
    signatureFont,
    signatureStyle,
    signatureVariant
  )

  const typedPreviewText = getSignaturePreviewText(signatureText, signatureStyle)

  return (
    <div>
      <h1>Signer Preview</h1>
      <p>Click a field on the PDF to fill it in.</p>

      <div
        style={{
          display: "flex",
          gap: "30px",
          alignItems: "flex-start",
          marginTop: "30px"
        }}
      >
        <div style={{ width: "380px" }}>
          <div
            style={{
              border: "1px solid #ccc",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "20px"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Fill Field</h3>

            {!activeField ? (
              <p>Select a field on the PDF.</p>
            ) : (
              <>
                <div style={{ marginBottom: "12px" }}>
                  <strong>Type:</strong> {activeField.type}
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <strong>Label:</strong> {activeField.label}
                </div>

                {activeField.type === "signature" && (
                  <>
                    <div style={{ marginBottom: "12px" }}>
                      <label>Signature Input</label>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: "8px",
                          marginTop: "8px"
                        }}
                      >
                        {[
                          { label: "Typed", value: "typed" },
                          { label: "Drawn", value: "drawn" },
                          { label: "Upload Photo", value: "uploaded" }
                        ].map((option) => {
                          const isSelected = signatureMode === option.value

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setUploadError("")
                                setSignatureMode(option.value as SignatureMode)
                              }}
                              style={{
                                padding: "10px 8px",
                                borderRadius: "8px",
                                border: isSelected
                                  ? "2px solid #166534"
                                  : "1px solid #cbd5e1",
                                background: isSelected ? "#dcfce7" : "#fff",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label>Signature Name</label>
                      <br />
                      <input
                        type="text"
                        value={signatureText}
                        onChange={(e) => setSignatureText(e.target.value)}
                        style={{ width: "100%", marginTop: "6px", padding: "8px" }}
                        placeholder="Type your name"
                      />
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label>Signature Style</label>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: "8px",
                          marginTop: "8px"
                        }}
                      >
                        {signatureStyleOptions.map((option) => {
                          const isSelected = signatureStyle === option.value

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setSignatureStyle(option.value)}
                              style={{
                                padding: "10px 8px",
                                borderRadius: "8px",
                                border: isSelected
                                  ? "2px solid #166534"
                                  : "1px solid #cbd5e1",
                                background: isSelected ? "#dcfce7" : "#fff",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label>Font Choices</label>
                      <div
                        style={{
                          display: "grid",
                          gap: "8px",
                          marginTop: "8px"
                        }}
                      >
                        {signatureFontOptions.map((font) => {
                          const isSelected = signatureFont === font.value
                          const previewText = signatureText || "Type Signature"

                          return (
                            <button
                              key={font.value}
                              type="button"
                              onClick={() => setSignatureFont(font.value)}
                              style={{
                                textAlign: "left",
                                borderRadius: "8px",
                                border: isSelected
                                  ? "2px solid #166534"
                                  : "1px solid #cbd5e1",
                                background: isSelected ? "#dcfce7" : "#fff",
                                padding: "10px",
                                cursor: "pointer"
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#475569",
                                  marginBottom: "4px"
                                }}
                              >
                                {font.label}
                              </div>
                              <div
                                style={{
                                  fontFamily: font.value,
                                  fontSize: "28px",
                                  color: "#14532d",
                                  lineHeight: 1.1,
                                  fontStyle: signatureStyle === "bold" ? "normal" : "italic",
                                  fontWeight: signatureStyle === "bold" ? 700 : 500,
                                  letterSpacing:
                                    signatureStyle === "quick-scribble" ? "-0.02em" : "0.01em"
                                }}
                              >
                                {previewText}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {signatureMode === "typed" && (
                      <div
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          padding: "16px",
                          minHeight: "110px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#fafafa",
                          marginBottom: "16px"
                        }}
                      >
                        <span
                          style={{
                            ...typedPreviewStyle,
                            color: "#166534"
                          }}
                        >
                          {typedPreviewText || "Signature Preview"}
                        </span>
                      </div>
                    )}

                    {signatureMode === "drawn" && (
                      <div style={{ marginBottom: "16px" }}>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#475569",
                            marginBottom: "6px"
                          }}
                        >
                          Draw your signature below.
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                          <button type="button" onClick={clearDrawnSignature}>
                            Clear Drawing
                          </button>
                        </div>
                        <canvas
                          ref={drawCanvasRef}
                          width={drawCanvasWidth}
                          height={drawCanvasHeight}
                          onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
                          onMouseMove={(e) => continueDrawing(e.clientX, e.clientY)}
                          onMouseUp={endDrawing}
                          onMouseLeave={endDrawing}
                          onTouchStart={(e) => {
                            const touch = e.touches[0]
                            if (!touch) return
                            startDrawing(touch.clientX, touch.clientY)
                          }}
                          onTouchMove={(e) => {
                            e.preventDefault()
                            const touch = e.touches[0]
                            if (!touch) return
                            continueDrawing(touch.clientX, touch.clientY)
                          }}
                          onTouchEnd={endDrawing}
                          style={{
                            width: "100%",
                            maxWidth: "100%",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            background: "#fff",
                            touchAction: "none"
                          }}
                        />
                      </div>
                    )}

                    {signatureMode === "uploaded" && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ marginBottom: "8px" }}>
                          <label>Upload a photo of your paper signature</label>
                          <br />
                          <input
                            ref={uploadInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleSignatureUpload}
                            style={{ marginTop: "6px" }}
                          />
                        </div>

                        {isProcessingUpload && (
                          <div
                            style={{
                              marginBottom: "8px",
                              fontSize: "13px",
                              color: "#475569"
                            }}
                          >
                            Processing image...
                          </div>
                        )}

                        {uploadError && (
                          <div
                            style={{
                              marginBottom: "8px",
                              fontSize: "13px",
                              color: "#b91c1c"
                            }}
                          >
                            {uploadError}
                          </div>
                        )}

                        <div
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            padding: "12px",
                            minHeight: "110px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#fafafa"
                          }}
                        >
                          {signatureImage ? (
                            <img
                              src={signatureImage}
                              alt="Uploaded signature preview"
                              style={{
                                maxWidth: "100%",
                                maxHeight: "120px",
                                objectFit: "contain",
                                display: "block"
                              }}
                            />
                          ) : (
                            <span style={{ color: "#64748b" }}>
                              No signature image uploaded yet.
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeField.type === "text" && (
                  <div style={{ marginBottom: "12px" }}>
                    <label>Text Value</label>
                    <br />
                    <input
                      type="text"
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>
                )}

                {activeField.type === "date" && (
                  <div style={{ marginBottom: "12px" }}>
                    <label>Date</label>
                    <br />
                    <input
                      type="date"
                      value={dateValue}
                      onChange={(e) => setDateValue(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={saveActiveField}>
                    Save Field
                  </button>
                  <button type="button" onClick={closeEditor}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          <div
            style={{
              border: "1px solid #ccc",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "20px"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Save Signed PDF</h3>

            <button
              type="button"
              onClick={submitSignedDocument}
              disabled={isSubmittingSignedDocument}
            >
              {isSubmittingSignedDocument
                ? "Saving to Signed Liability Forms..."
                : "Save Signed PDF to Drive"}
            </button>

            {submitMessage ? (
              <div style={{ marginTop: "12px", color: submitMessage.includes("saved") ? "#166534" : "#b91c1c" }}>
                {submitMessage}
              </div>
            ) : null}

            {savedFileLink ? (
              <div style={{ marginTop: "10px" }}>
                <a href={savedFileLink} target="_blank" rel="noreferrer">
                  Open {savedFileName || "signed file"} in Google Drive
                </a>
              </div>
            ) : null}
          </div>

          <div
            style={{
              border: "1px solid #ccc",
              padding: "16px",
              borderRadius: "8px"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Filled Values</h3>

            {Object.keys(values).length === 0 ? (
              <p>No fields filled yet.</p>
            ) : (
              fields.map((field) => {
                const value = values[field.id]
                if (!value) return null

                return (
                  <div
                    key={field.id}
                    style={{
                      padding: "8px",
                      border: "1px solid #e5e5e5",
                      borderRadius: "6px",
                      marginBottom: "8px"
                    }}
                  >
                    <div><strong>{field.label}</strong></div>
                    <div>Type: {field.type}</div>
                    {field.type === "signature" ? (
                      <>
                        <div>Mode: {value.signatureMode}</div>
                        {value.signatureText ? <div>Text: {value.signatureText}</div> : null}
                        {value.signatureStyle ? <div>Style: {value.signatureStyle}</div> : null}
                        {value.signatureImage ? <div>Image: saved</div> : null}
                      </>
                    ) : (
                      <div>Value: {value.value}</div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div>
          {isLoaded && (
            <SignPdfViewer
              fileUrl={fileUrl}
              fields={fields}
              values={values}
              onFieldClick={handleFieldClick}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  }
}

function drawImageOnCanvas(imageSrc: string, canvas: HTMLCanvasElement | null) {
  if (!canvas || !imageSrc) return

  const context = canvas.getContext("2d")
  if (!context) return

  const image = new Image()
  image.onload = () => {
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, canvas.width, canvas.height)

    const scale = Math.min(canvas.width / image.width, canvas.height / image.height)
    const width = image.width * scale
    const height = image.height * scale
    const x = (canvas.width - width) / 2
    const y = (canvas.height - height) / 2

    context.drawImage(image, x, y, width, height)
  }
  image.src = imageSrc
}

function buildSignaturePreviewStyle(
  fontFamily: string,
  signatureStyle: SignatureStyle,
  signatureVariant: number
) {
  const rotation = ((signatureVariant % 5) - 2) * 0.8
  const translateY = signatureVariant % 3

  const baseStyle: Record<string, string | number> = {
    fontFamily,
    lineHeight: 1,
    display: "inline-block",
    transformOrigin: "center"
  }

  if (signatureStyle === "neat") {
    return {
      ...baseStyle,
      fontSize: "34px",
      fontWeight: 500,
      fontStyle: "italic",
      letterSpacing: "0.01em",
      transform: `rotate(${rotation * 0.4}deg) translateY(${translateY}px)`
    }
  }

  if (signatureStyle === "bold") {
    return {
      ...baseStyle,
      fontSize: "36px",
      fontWeight: 700,
      letterSpacing: "0.01em",
      transform: `rotate(${rotation * 0.6}deg) translateY(${translateY}px) scaleY(1.05)`
    }
  }

  if (signatureStyle === "quick-scribble") {
    return {
      ...baseStyle,
      fontSize: "37px",
      fontStyle: "italic",
      letterSpacing: "-0.03em",
      transform: `rotate(${rotation + 1.4}deg) translateY(${translateY + 1}px) skewX(-8deg)`
    }
  }

  if (signatureStyle === "initials") {
    return {
      ...baseStyle,
      fontSize: "38px",
      fontWeight: 700,
      letterSpacing: "0.12em",
      transform: `rotate(${rotation + 1}deg) translateY(${translateY}px)`
    }
  }

  return {
    ...baseStyle,
    fontSize: "36px",
    fontStyle: "italic",
    letterSpacing: "0em",
    transform: `rotate(${rotation}deg) translateY(${translateY}px) skewX(-4deg)`
  }
}

function getSignaturePreviewText(text: string, signatureStyle: SignatureStyle) {
  if (signatureStyle !== "initials") return text

  return text
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Could not read file"))
      }
    }

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
  const context = canvas.getContext("2d")
  if (!context) return ""

  const { width, height } = canvas
  const imageData = context.getImageData(0, 0, width, height)
  const data = imageData.data

  let top = height
  let left = width
  let right = 0
  let bottom = 0
  let hasInk = false

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]
      const alpha = data[index + 3]

      const isInk = alpha > 0 && (red < 245 || green < 245 || blue < 245)

      if (isInk) {
        hasInk = true
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }

  if (!hasInk) return ""

  const padding = 8
  const sourceX = Math.max(left - padding, 0)
  const sourceY = Math.max(top - padding, 0)
  const sourceWidth = Math.min(right - left + padding * 2, width - sourceX)
  const sourceHeight = Math.min(bottom - top + padding * 2, height - sourceY)

  const outputCanvas = document.createElement("canvas")
  outputCanvas.width = sourceWidth
  outputCanvas.height = sourceHeight

  const outputContext = outputCanvas.getContext("2d")
  if (!outputContext) return ""

  outputContext.clearRect(0, 0, sourceWidth, sourceHeight)
  outputContext.drawImage(
    canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight
  )

  return outputCanvas.toDataURL("image/png")
}

async function processUploadedSignature(imageSrc: string) {
  const transparent = await makeTransparentSignature(imageSrc)
  return trimTransparentImage(transparent)
}

async function makeTransparentSignature(imageSrc: string) {
  const image = await loadImage(imageSrc)

  const canvas = document.createElement("canvas")
  canvas.width = image.width
  canvas.height = image.height

  const context = canvas.getContext("2d")
  if (!context) return imageSrc

  context.drawImage(image, 0, 0)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index]
    const green = data[index + 1]
    const blue = data[index + 2]
    const average = (red + green + blue) / 3

    if (average > 235) {
      data[index + 3] = 0
    } else {
      data[index] = 20
      data[index + 1] = 83
      data[index + 2] = 45
      data[index + 3] = 255
    }
  }

  context.putImageData(imageData, 0, 0)
  return canvas.toDataURL("image/png")
}

async function trimTransparentImage(imageSrc: string) {
  const image = await loadImage(imageSrc)

  const canvas = document.createElement("canvas")
  canvas.width = image.width
  canvas.height = image.height

  const context = canvas.getContext("2d")
  if (!context) return imageSrc

  context.drawImage(image, 0, 0)

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  let top = canvas.height
  let left = canvas.width
  let right = 0
  let bottom = 0
  let hasInk = false

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4
      const alpha = data[index + 3]

      if (alpha > 10) {
        hasInk = true
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }

  if (!hasInk) return imageSrc

  const padding = 10
  const sourceX = Math.max(left - padding, 0)
  const sourceY = Math.max(top - padding, 0)
  const sourceWidth = Math.min(right - left + padding * 2, canvas.width - sourceX)
  const sourceHeight = Math.min(bottom - top + padding * 2, canvas.height - sourceY)

  const outputCanvas = document.createElement("canvas")
  outputCanvas.width = sourceWidth
  outputCanvas.height = sourceHeight

  const outputContext = outputCanvas.getContext("2d")
  if (!outputContext) return imageSrc

  outputContext.clearRect(0, 0, sourceWidth, sourceHeight)
  outputContext.drawImage(
    canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight
  )

  return outputCanvas.toDataURL("image/png")
}
