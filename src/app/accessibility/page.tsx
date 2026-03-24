"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AccessibilityPage() {
  useEffect(() => {
    if (!document.getElementById("termly-jssdk")) {
      const script = document.createElement("script");
      script.id = "termly-jssdk";
      script.src = "https://app.termly.io/embed-policy.min.js";
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link href="/" className="text-[15px] text-muted hover:text-plum mb-6 block">
        &larr; Back to home
      </Link>
      <h1 className="text-[28px] font-semibold text-plum mb-6">Accessibility Statement</h1>
      <div
        data-name="termly-embed"
        data-id="86ea1168-d4b3-4f80-a73a-633886f8f034"
      />
    </div>
  );
}
