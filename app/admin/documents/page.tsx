"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Template = {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string | null;
  thumbnailLink?: string | null;
  createdTime?: string | null;
  modifiedTime?: string | null;
  size?: string | null;
};

export default function AdminDocumentsPage() {
  const router = useRouter();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTemplates() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/templates", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.details || data?.error || "Failed to load templates.");
        }

        if (!Array.isArray(data)) {
          throw new Error("Unexpected API response. Expected an array of templates.");
        }

        if (isMounted) {
          setTemplates(data);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load templates.";

        if (isMounted) {
          setError(message);
          setTemplates([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  function openTemplate(template: Template) {
    router.push(`/admin/documents/${template.id}/place-fields`);
  }

  return (
    <main style={{ padding: "32px" }}>
      <h1 style={{ fontSize: "2.25rem", fontWeight: 700, marginBottom: "12px" }}>
        Admin Documents
      </h1>

      <p style={{ fontSize: "1.1rem", marginBottom: "24px" }}>
        Select a template to start a signing session.
      </p>

      {isLoading ? (
        <div
          style={{
            padding: "16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "#fafafa",
            maxWidth: "720px",
          }}
        >
          Loading templates...
        </div>
      ) : null}

      {!isLoading && error ? (
        <div
          style={{
            padding: "16px",
            border: "1px solid #f5c2c7",
            borderRadius: "8px",
            background: "#f8d7da",
            color: "#842029",
            maxWidth: "720px",
            marginBottom: "20px",
          }}
        >
          <strong>Could not load templates.</strong>
          <div style={{ marginTop: "8px" }}>{error}</div>
        </div>
      ) : null}

      {!isLoading && !error && templates.length === 0 ? (
        <div
          style={{
            padding: "16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "#fafafa",
            maxWidth: "720px",
          }}
        >
          No PDF templates were found in the configured Google Drive folder.
        </div>
      ) : null}

      {!isLoading && !error && templates.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
            maxWidth: "1100px",
          }}
        >
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openTemplate(t)}
              style={{
                textAlign: "left",
                padding: "16px",
                border: "1px solid #ccc",
                borderRadius: "10px",
                background: "#fff",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "8px",
                  wordBreak: "break-word",
                }}
              >
                {t.name}
              </div>

              <div style={{ fontSize: "0.9rem", color: "#555", marginBottom: "6px" }}>
                ID: {t.id}
              </div>

              {t.modifiedTime ? (
                <div style={{ fontSize: "0.9rem", color: "#555", marginBottom: "6px" }}>
                  Updated: {new Date(t.modifiedTime).toLocaleString()}
                </div>
              ) : null}

              {t.size ? (
                <div style={{ fontSize: "0.9rem", color: "#555", marginBottom: "10px" }}>
                  Size: {formatBytes(Number(t.size))}
                </div>
              ) : null}

              <div
                style={{
                  marginTop: "12px",
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "#111827",
                  color: "#fff",
                  fontSize: "0.92rem",
                  fontWeight: 600,
                }}
              >
                Place fields
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </main>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Unknown";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
