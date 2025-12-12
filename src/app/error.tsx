"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Root Error Boundary (Next.js App Router)
 *
 * This component is automatically rendered when an error occurs
 * in any child component of the app. It provides a user-friendly
 * error page with options to retry or navigate home.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error("Global error:", error);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === "production") {
      // TODO: Integrate with Sentry or similar
      // captureException(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            We apologize for the inconvenience. An unexpected error has occurred. Please try
            again or return to the home page.
          </p>

          {process.env.NODE_ENV === "development" && (
            <div className="p-4 bg-muted rounded-lg text-start">
              <p className="text-xs font-mono text-destructive break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs font-mono text-muted-foreground mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={reset}>
              <RefreshCw className="w-4 h-4 me-2" />
              Try Again
            </Button>
            <Button onClick={() => (window.location.href = "/")}>
              <Home className="w-4 h-4 me-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
