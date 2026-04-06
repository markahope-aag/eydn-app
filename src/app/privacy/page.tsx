import Script from "next/script";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div id="main-content" className="max-w-3xl mx-auto px-6 py-16">
      <Link href="/" className="text-[15px] text-muted hover:text-plum mb-6 block">
        &larr; Back to home
      </Link>
      <h1 className="text-[28px] font-semibold text-plum mb-6">Privacy Policy</h1>
      <div
        data-name="termly-embed"
        data-id="653e52d3-2b91-46a2-8daf-dc8c8dd39ec3"
      />
      <Script
        id="termly-jssdk"
        src="https://app.termly.io/embed-policy.min.js"
        strategy="afterInteractive"
      />
    </div>
  );
}
