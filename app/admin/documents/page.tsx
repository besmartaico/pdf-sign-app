"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminDocumentsPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    const res = await fetch("/api/google-drive-test")
    const data = await res.json()

    if (data.success) {
      setTemplates(data.templates)
    }
  }

  function openTemplate(template: any) {
    router.push(`/admin/documents/${template.id}/place-fields`)
  }

  return (
    <div>
      <h1>Admin Documents</h1>

      <p>Select a template to start a signing session.</p>

      <div style={{ marginTop: "30px" }}>
        {templates.map((t) => (
          <div
            key={t.id}
            onClick={() => openTemplate(t)}
            style={{
              padding: "10px",
              border: "1px solid #ccc",
              marginBottom: "10px",
              cursor: "pointer"
            }}
          >
            {t.name}
          </div>
        ))}
      </div>
    </div>
  )
}