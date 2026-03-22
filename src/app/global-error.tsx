"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[Global Error Boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#dc2626",
                marginBottom: "0.75rem",
              }}
            >
              Something went wrong
            </h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
              A critical error occurred. Our team has been notified. Please try
              refreshing the page.
            </p>
            {error.digest && (
              <p style={{ color: "#9ca3af", fontSize: "0.75rem", marginBottom: "1rem" }}>
                Error ID: <code>{error.digest}</code>
              </p>
            )}
            <button
              onClick={reset}
              style={{
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: "0.375rem",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}