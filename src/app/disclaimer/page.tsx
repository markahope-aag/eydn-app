"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DisclaimerPage() {
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
      <h1 className="text-[28px] font-semibold text-plum mb-6">Disclaimer</h1>
      <div
        data-name="termly-embed"
        data-id="5c8d13e0-20be-4737-a068-e9f9571580ed"
      />
    </div>
  );
}
