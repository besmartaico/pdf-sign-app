"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") || "/admin/documents"
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      })
      if (res.ok) {
        router.push(from)
        router.refresh()
      } else {
        setError("Incorrect password. Please try again.")
        setPassword("")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0f", fontFamily: "'Inter','Segoe UI',Arial,sans-serif", padding: "20px"
    }}>
      <div style={{
        background: "#111827", border: "1px solid #1e3a5f", borderRadius: "16px",
        padding: "40px 36px", width: "380px", maxWidth: "100%",
        boxShadow: "0 25px 60px rgba(0,0,0,0.6)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src="https://images.squarespace-cdn.com/content/v1/69270d3f55d63e364a913bdd/68b6d2d1-03ce-44bb-88c2-85618d6a7eff/BeSmartAI.png?format=100w"
            alt="BeSmartAI"
            style={{ height: "60px", objectFit: "contain", marginBottom: "14px", display: "block", margin: "0 auto 14px" }}
          />
          <div style={{ fontWeight: 700, fontSize: "20px", color: "#f1f5f9", marginBottom: "4px" }}>
            health.<span style={{ color: "#3b82f6" }}>BeSmartAI</span>
          </div>
          <div style={{ fontSize: "13px", color: "#64748b" }}>Document Signing · Admin</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block", fontSize: "12px", color: "#94a3b8",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px"
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
              required
              style={{
                display: "block", width: "100%", padding: "12px 14px",
                background: "#0f172a", border: "1px solid #1e3a5f", borderRadius: "8px",
                color: "#e2e8f0", fontSize: "15px", boxSizing: "border-box", outline: "none"
              }}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: "16px", padding: "10px 14px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px", color: "#ef4444", fontSize: "13px"
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: "100%", padding: "13px", background: "#3b82f6", color: "#fff",
              border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "15px",
              cursor: loading || !password ? "not-allowed" : "pointer",
              opacity: loading || !password ? 0.6 : 1, transition: "opacity 0.15s"
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0f" }} />}>
      <LoginForm />
    </Suspense>
  )
}
