"use client"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

const C = {
  bg: "#0a0a0f", surface: "#111827", border: "#1e3a5f",
  accent: "#3b82f6", text: "#e2e8f0", textMuted: "#94a3b8",
  danger: "#ef4444", inputBg: "#0f172a",
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get("from") || "/admin/documents"
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(from)
      } else {
        setError(data.error || "Incorrect credentials")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "400px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 700, color: C.text }}>Admin Login</h1>
        <p style={{ margin: "0 0 28px", color: C.textMuted, fontSize: "14px" }}>Sign in to manage documents</p>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${C.danger}`, borderRadius: "8px", padding: "10px 14px", color: C.danger, fontSize: "14px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <label style={{ display: "block", fontSize: "13px", color: C.textMuted, marginBottom: "6px", fontWeight: 500 }}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoFocus
            required
            style={{ display: "block", width: "100%", padding: "11px 14px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.text, fontSize: "15px", marginBottom: "16px", boxSizing: "border-box" as const, outline: "none" }}
          />

          {/* Password with eye toggle */}
          <label style={{ display: "block", fontSize: "13px", color: C.textMuted, marginBottom: "6px", fontWeight: 500 }}>Password</label>
          <div style={{ position: "relative", marginBottom: "24px" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              style={{ display: "block", width: "100%", padding: "11px 44px 11px 14px", background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.text, fontSize: "15px", boxSizing: "border-box" as const, outline: "none" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: "18px", padding: "2px", lineHeight: 1 }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "12px", background: loading ? C.border : C.accent, color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 600, cursor: loading ? "default" : "pointer" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
