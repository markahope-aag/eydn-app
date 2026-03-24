"use client";

import { useState, useEffect } from "react";

/**
 * Shows a loading spinner while Clerk loads, then a fallback message
 * if it takes too long (e.g., blocked by content blocker on mobile).
 */
export function ClerkFallback() {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (showFallback) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <p style={{ fontSize: 14, color: "#6B6B6B", marginBottom: 12 }}>
          Having trouble loading? Try disabling your ad blocker or content blocker, then refresh the page.
        </p>
        <p style={{ fontSize: 13, color: "#6B6B6B" }}>
          Or try a different browser if the issue persists.
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{
        width: 32, height: 32, border: "3px solid #EDE7DF", borderTopColor: "#2C3E2D",
        borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
      }} />
      <p style={{ fontSize: 14, color: "#6B6B6B" }}>Loading...</p>
      <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg); } }" }} />
    </div>
  );
}
