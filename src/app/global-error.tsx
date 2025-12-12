"use client";

/**
 * Global Error Boundary for Next.js App Router
 *
 * This component catches errors that occur in the root layout.
 * It reports errors to Sentry and displays a fallback UI.
 *
 * Note: This must be a Client Component with "use client" directive.
 */

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
    // Report the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginBottom: "1rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#666",
              marginBottom: "2rem",
              maxWidth: "400px",
            }}
          >
            We apologize for the inconvenience. Our team has been notified and
            is working on a fix.
          </p>
          <button
            onClick={() => reset()}
            style={{
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
