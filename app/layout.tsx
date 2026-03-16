import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "health.BeSmartAI",
  description: "Document signing powered by BeSmartAI",
  icons: {
    icon: "https://images.squarespace-cdn.com/content/v1/69270d3f55d63e364a913bdd/68b6d2d1-03ce-44bb-88c2-85618d6a7eff/BeSmartAI.png?format=100w",
    apple: "https://images.squarespace-cdn.com/content/v1/69270d3f55d63e364a913bdd/68b6d2d1-03ce-44bb-88c2-85618d6a7eff/BeSmartAI.png?format=100w"
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        margin: 0,
        padding: 0,
        background: "#0a0a0f",
        color: "#e2e8f0",
        minHeight: "100vh"
      }}>
        <nav style={{
          background: "#111827",
          borderBottom: "1px solid #1e3a5f",
          padding: "0 32px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 20px rgba(59,130,246,0.1)"
        }}>
          <a href="/admin/documents" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <img
              src="https://images.squarespace-cdn.com/content/v1/69270d3f55d63e364a913bdd/68b6d2d1-03ce-44bb-88c2-85618d6a7eff/BeSmartAI.png?format=100w"
              alt="BeSmartAI Logo"
              style={{ width: "36px", height: "36px", objectFit: "contain", filter: "invert(1) brightness(2)" }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#f1f5f9", letterSpacing: "-0.3px", lineHeight: 1.1 }}>
                health<span style={{ color: "#3b82f6" }}>.</span>BeSmartAI
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                Document Signing
              </div>
            </div>
          </a>
          <div style={{ display: "flex", gap: "24px" }}>
            <a href="/admin/documents" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>Documents</a>
          </div>
        </nav>
        <main style={{ padding: "32px" }}>
          {children}
        </main>
      </body>
    </html>
  )
}
