import Script from "next/script";
import Link from "next/link";

export default function AccessibilityPage() {
  return (
    <div id="main-content" className="max-w-3xl mx-auto px-6 py-16">
      <Link href="/" className="text-[15px] text-muted hover:text-plum mb-6 block">
        &larr; Back to home
      </Link>
      <h1 className="text-[28px] font-semibold text-plum mb-6">Accessibility Statement</h1>
      <div
        data-name="termly-embed"
        data-id="86ea1168-d4b3-4f80-a73a-633886f8f034"
      />
      <Script
        id="termly-jssdk"
        src="https://app.termly.io/embed-policy.min.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
