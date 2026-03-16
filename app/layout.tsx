export const metadata = {
  title: "PDF Sign App",
  description: "Simple document signing MVP"
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
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 1px 20px rgba(59,130,246,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "28px", height: "28px", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
              borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", fontWeight: 700, color: "#fff"
            }}>S</div>
            <span style={{ fontWeight: 700, fontSize: "16px", color: "#f1f5f9", letterSpacing: "-0.3px" }}>SignFlow</span>
          </div>
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
