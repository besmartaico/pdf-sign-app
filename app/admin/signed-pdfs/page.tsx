"use client"
import { useEffect, useState } from "react"

const C = {
  bg: "#0a0a0f", surface: "#111827", border: "#1e3a5f",
  accent: "#3b82f6", text: "#e2e8f0", textMuted: "#94a3b8",
  textDim: "#64748b", danger: "#ef4444"
}

type Blob = { url: string; pathname: string; size: number; uploadedAt: string }

export default function SignedPdfsPage() {
  const [blobs, setBlobs] = useState<Blob[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const fetchBlobs = () => {
    setLoading(true)
    fetch("/api/admin/signed-pdfs")
      .then(r => r.json())
      .then(d => setBlobs(d.blobs || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchBlobs() }, [])

  const handleDownloadAndDelete = (blob: Blob) => {
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

  const filtered = blobs.filter(b => !search || b.pathname.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a href="/admin/documents" style={{ color: C.textMuted, textDecoration: "none", fontSize: "14px" }}>← Documents</a>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>📥 Signed PDFs</h1>
          </div>
          <button onClick={fetchBlobs} disabled={loading} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textMuted, padding: "7px 14px", borderRadius: "7px", cursor: "pointer", fontSize: "13px" }}>
            {loading ? "Refreshing..." : "⟳ Refresh"}
          </button>
        </div>

        <input
          placeholder="Search by filename..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: "14px", marginBottom: "20px", boxSizing: "border-box" as const, outline: "none" }}
        />

        {loading && <div style={{ color: C.textMuted, padding: "40px 0", textAlign: "center" }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ color: C.textMuted, padding: "40px 0", textAlign: "center" }}>
            {search ? "No matches." : "No signed PDFs yet. Completed signings will appear here."}
          </div>
        )}
        {filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map(blob => (
              <div key={blob.url} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: "14px", color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {blob.pathname.split("/").pop()}
                  </div>
                  <div style={{ fontSize: "12px", color: C.textDim, marginTop: "2px" }}>
                    {new Date(blob.uploadedAt).toLocaleString()} · {(blob.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadAndDelete(blob)}
                  disabled={deletingUrl === blob.url}
                  style={{ background: deletingUrl === blob.url ? C.surface : C.accent, color: "#fff", padding: "8px 16px", borderRadius: "7px", border: "none", cursor: deletingUrl === blob.url ? "default" : "pointer", fontSize: "13px", fontWeight: 600, opacity: deletingUrl === blob.url ? 0.6 : 1, whiteSpace: "nowrap" }}
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
