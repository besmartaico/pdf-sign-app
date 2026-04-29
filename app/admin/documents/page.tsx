"use client"

import { useEffect, useState } from "react"

const C = {
  bg: "#0a0a0f", surface: "#111827", border: "#1e3a5f", borderLight: "#2d4a6e",
  accent: "#3b82f6", accentGlow: "rgba(59,130,246,0.15)", text: "#e2e8f0",
  textMuted: "#94a3b8", textDim: "#64748b", success: "#22c55e",
  successBg: "rgba(34,197,94,0.1)", danger: "#ef4444", dangerBg: "rgba(239,68,68,0.1)",
  inputBg: "#0f172a", modalBg: "rgba(0,0,0,0.75)"
}

type Template = { id: string; name: string; webViewLink?: string }

export default function AdminDocumentsPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sendModal, setSendModal] = useState<{ doc: Template } | null>(null)
  const [blobs, setBlobs] = useState<{ url: string; pathname: string; size: number; uploadedAt: string }[]>([])
  const [blobsLoading, setBlobsLoading] = useState(false)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const [signerEmail, setSignerEmail] = useState("")
  const [signerName, setSignerName] = useState("")
  const [sendStatus, setSendStatus] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewModal, setPreviewModal] = useState<{ doc: Template } | null>(null)

  useEffect(() => {
    loadTemplates()
    fetchBlobs()
  }, [])

  function loadTemplates() {
    setLoading(true)
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : (data.files || []))
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load templates.")
        setLoading(false)
      })
  }

  function fetchBlobs() {
    setBlobsLoading(true)
    fetch("/api/admin/signed-pdfs")
      .then(r => r.json())
      .then(data => setBlobs(data.blobs || []))
      .catch(e => console.error(e))
      .finally(() => setBlobsLoading(false))
  }

  function handleDownloadAndDelete(blob: { url: string; pathname: string }) {
    const a = document.createElement("a")
    a.href = blob.url
    a.download = blob.pathname.split("/").pop() || "signed.pdf"
    a.click()
    setDeletingUrl(blob.url)
    setTimeout(async () => {
      try {
        await fetch("/api/admin/signed-pdfs", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blob.url }),
        })
        setBlobs(prev => prev.filter(b => b.url !== blob.url))
      } catch (e) { console.error(e) }
      finally { setDeletingUrl(null) }
    }, 1500)
  }

  async function handleDelete(doc: Template) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    setDeletingId(doc.id)
    try {
      const res = await fetch(`/api/templates/${doc.id}`, { method: "DELETE" })
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== doc.id))
      } else {
        alert("Failed to delete file.")
      }
    } catch {
      alert("Failed to delete file.")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSendToSigner() {
    if (!sendModal) return
    if (!signerEmail) { setSendStatus("Please enter an email address."); return }
    setIsSending(true)
    setSendStatus("")
    try {
      const res = await fetch("/api/send-sign-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: sendModal.doc.id,
          documentName: sendModal.doc.name,
          signerEmail,
          signerName,
          fields: JSON.parse(localStorage.getItem(`template-fields-${sendModal.doc.id}`) || "[]")
        })
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || "Failed to send")
      setSendStatus("success")
    } catch (e) {
      setSendStatus(e instanceof Error ? e.message : "Failed to send email")
    } finally {
      setIsSending(false)
    }
  }

  const btnBase: React.CSSProperties = {
    padding: "8px 14px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontWeight: 600, fontSize: "13px", transition: "all 0.15s", textDecoration: "none",
    display: "inline-flex", alignItems: "center", gap: "5px"
  }

  return (
    <div style={{ color: C.text }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"10px" }}>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700, color: C.text }}>Documents</h1>
          <div style={{ display:"flex",gap:"8px",flexWrap:"wrap" }}>
            <a href="/admin/signed-pdfs" style={{ background:C.surface,border:`1px solid ${C.border}`,color:C.textMuted,textDecoration:"none",padding:"7px 14px",borderRadius:"7px",fontSize:"13px",fontWeight:500 }}>📥 Signed PDFs</a>
            <a href="/admin/users" style={{ background:C.surface,border:`1px solid ${C.border}`,color:C.textMuted,textDecoration:"none",padding:"7px 14px",borderRadius:"7px",fontSize:"13px",fontWeight:500 }}>👥 Users</a>
          </div>
        </div>
        <p style={{ margin: "6px 0 0", color: C.textMuted, fontSize: "14px" }}>Manage your PDF templates and send them to signers.</p>
      </div>

      {loading && <div style={{ color: C.textMuted, padding: "40px 0", textAlign: "center" }}>Loading templates...</div>}
      {error && <div style={{ color: C.danger, padding: "16px", background: C.dangerBg, borderRadius: "8px" }}>{error}</div>}

      {!loading && !error && templates.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.textMuted }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>📄</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: C.text, marginBottom: "6px" }}>No templates found</div>
          <div style={{ fontSize: "14px" }}>Upload PDF files to your Google Drive templates folder to get started.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {templates.map((doc) => (
          <div key={doc.id} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px",
            padding: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap"
          }}>
            <div style={{
              width: "40px", height: "40px", background: C.accentGlow,
              borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", flexShrink: 0
            }}>📄</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "15px", color: C.text, marginBottom: "3px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.name}
              </div>

            </div>

            <div style={{ display: "flex", gap: "6px", flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}>
              <a href={`/admin/documents/${doc.id}/place-fields`} style={{
                ...btnBase, background: C.accentGlow, color: C.accent, border: `1px solid ${C.border}`
              }}>
                ✏️ Fields
              </a>
              <button style={{ ...btnBase, background: "rgba(34,197,94,0.1)", color: "#34d399", border: "1px solid #065f46" }}
                onClick={() => setPreviewModal({ doc })}>
                👁️ Preview
              </button>
              <button style={{ ...btnBase, background: "rgba(59,130,246,0.1)", color: C.accent, border: `1px solid ${C.border}` }}
                onClick={() => { setSendModal({ doc }); setSignerEmail(""); setSignerName(""); setSendStatus("") }}>
                ✉️ Send
              </button>
              <button
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id}
                title="Delete template"
                style={{
                  ...btnBase, background: "transparent", color: "#ef4444",
                  border: "1px solid #7f1d1d", padding: "8px 10px",
                  opacity: deletingId === doc.id ? 0.5 : 1
                }}>
                {deletingId === doc.id ? "..." : "✕"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Signer Preview Modal */}
      {previewModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000, background: C.modalBg,
          display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)"
        }} onClick={(e) => { if (e.target === e.currentTarget) setPreviewModal(null) }}>
          <div style={{
            background: C.surface, borderRadius: "16px", border: `1px solid ${C.border}`,
            width: "95vw", maxWidth: "1100px", height: "90vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 25px 60px rgba(0,0,0,0.7)"
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 24px", borderBottom: `1px solid ${C.border}`
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: C.text }}>👁️ Signer Preview</h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: C.textMuted }}>{previewModal.doc.name}</p>
              </div>
              <button onClick={() => setPreviewModal(null)} style={{
                background: "transparent", border: "none", color: C.textMuted,
                fontSize: "22px", cursor: "pointer", padding: "4px 10px", borderRadius: "6px"
              }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: "hidden", borderRadius: "0 0 16px 16px" }}>
              <iframe
                src={`/sign/${previewModal.doc.id}`}
                style={{ width: "100%", height: "100%", border: "none", background: C.bg }}
                title="Signer Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Send to Signer Modal */}
      {sendModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000, background: C.modalBg,
          display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)"
        }} onClick={(e) => { if (e.target === e.currentTarget) setSendModal(null) }}>
          <div style={{
            background: C.surface, borderRadius: "16px", border: `1px solid ${C.border}`,
            padding: "28px", width: "460px", maxWidth: "95vw",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: C.text }}>✉️ Send to Signer</h2>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: C.textMuted, maxWidth: "300px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {sendModal.doc.name}
                </p>
              </div>
              <button onClick={() => setSendModal(null)} style={{
                background: "transparent", border: "none", color: C.textMuted,
                fontSize: "22px", cursor: "pointer", padding: "4px 8px"
              }}>×</button>
            </div>

            {sendStatus === "success" ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: C.success, marginBottom: "6px" }}>Email sent!</div>
                <div style={{ fontSize: "14px", color: C.textMuted, marginBottom: "20px" }}>
                  {signerName || signerEmail} will receive a signing link shortly.
                </div>
                <button style={{ ...btnBase, background: C.accent, color: "#fff", padding: "10px 24px" }}
                  onClick={() => setSendModal(null)}>Done</button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Signer Name <span style={{ color: C.textDim }}>(optional)</span>
                  </label>
                  <input type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)}
                    placeholder="e.g. John Smith"
                    style={{ display: "block", width: "100%", marginTop: "6px", padding: "10px 12px",
                      background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: "8px",
                      color: C.text, fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "12px", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Signer Email <span style={{ color: C.danger }}>*</span>
                  </label>
                  <input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="signer@example.com"
                    style={{ display: "block", width: "100%", marginTop: "6px", padding: "10px 12px",
                      background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: "8px",
                      color: C.text, fontSize: "14px", boxSizing: "border-box" }} />
                </div>

                {sendStatus && sendStatus !== "success" && (
                  <div style={{ marginBottom: "14px", padding: "10px 14px", background: C.dangerBg,
                    color: C.danger, borderRadius: "8px", fontSize: "13px" }}>
                    {sendStatus}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button style={{ ...btnBase, background: C.accent, color: "#fff", flex: 1, padding: "11px", justifyContent: "center" }}
                    onClick={handleSendToSigner} disabled={isSending}>
                    {isSending ? "Sending..." : "Send Signing Link"}
                  </button>
                  <button style={{ ...btnBase, background: "transparent", color: C.textMuted,
                    border: `1px solid ${C.border}` }}
                    onClick={() => setSendModal(null)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Signed PDFs Section */}
      <div style={{ marginTop: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: C.text }}>📥 Signed PDFs</h2>
          <button onClick={fetchBlobs} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textMuted, padding: "6px 14px", borderRadius: "7px", cursor: "pointer", fontSize: "13px" }}>
            {blobsLoading ? "Refreshing..." : "⟳ Refresh"}
          </button>
        </div>
        {blobsLoading && <div style={{ color: C.textMuted, fontSize: "14px" }}>Loading...</div>}
        {!blobsLoading && blobs.length === 0 && (
          <div style={{ color: C.textMuted, fontSize: "14px", padding: "20px 0" }}>No signed PDFs stored yet.</div>
        )}
        {blobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {blobs.map(blob => (
              <div key={blob.url} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: "14px", color: C.text }}>{blob.pathname.split("/").pop()}</div>
                  <div style={{ fontSize: "12px", color: C.textDim, marginTop: "2px" }}>
                    {new Date(blob.uploadedAt).toLocaleString()} · {(blob.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadAndDelete(blob)}
                  disabled={deletingUrl === blob.url}
                  style={{ background: deletingUrl === blob.url ? C.surface : C.accent, color: "#fff", padding: "8px 16px", borderRadius: "7px", border: "none", cursor: deletingUrl === blob.url ? "default" : "pointer", fontSize: "13px", fontWeight: 600, opacity: deletingUrl === blob.url ? 0.6 : 1 }}
                >
                  {deletingUrl === blob.url ? "Deleting..." : "⬇ Download & Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
