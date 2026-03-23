"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AcceptableUsePage() {
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
      <div
        data-name="termly-embed"
        data-id="1cf81d10-f361-45ed-ae84-de4d7daeb013"
      />
    </div>
  );
}
