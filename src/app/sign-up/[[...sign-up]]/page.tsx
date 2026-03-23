import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Cormorant_Garamond, DM_Sans, Great_Vibes } from "next/font/google";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "600"] });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500"] });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400" });

export default function SignUpPage() {
  return (
    <div className={dmSans.className} style={{ minHeight: "100vh", display: "flex" }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex"
        style={{
          width: "45%",
          background: "#2C3E2D",
          padding: "80px 60px",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, opacity: 0.08, backgroundImage: "radial-gradient(circle at 30% 20%, #C9A84C 0%, transparent 50%), radial-gradient(circle at 70% 80%, #C9A84C 0%, transparent 50%)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <Link href="/" className={cormorant.className} style={{ fontSize: 28, fontWeight: 600, color: "#FAF6F1", textDecoration: "none" }}>
            Eydn
          </Link>
          <p className={greatVibes.className} style={{ fontSize: 24, color: "#C9A84C", marginTop: 48 }}>
            Let the adventure begin
          </p>
          <h1 className={cormorant.className} style={{ fontSize: 52, fontWeight: 600, color: "#FAF6F1", lineHeight: 1.1, marginTop: 8 }}>
            Plan your dream<br />wedding.
          </h1>
          <p style={{ fontSize: 16, color: "rgba(250,246,241,0.6)", lineHeight: 1.7, marginTop: 24, maxWidth: 360 }}>
            Join thousands of couples who are planning smarter with an AI-powered guide that remembers everything.
          </p>

          {/* Value props */}
          <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { title: "14-day free trial", desc: "Full access, no credit card" },
              { title: "One-time $79", desc: "No subscriptions, ever" },
              { title: "AI that knows you", desc: "Remembers your style & preferences" },
            ].map((item) => (
              <div key={item.title} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ color: "#C9A84C", fontSize: 16, marginTop: 2 }}>✦</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#FAF6F1" }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: "rgba(250,246,241,0.5)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — sign up form */}
      <div
        style={{
          flex: 1,
          background: "#FAF6F1",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden" style={{ marginBottom: 32, textAlign: "center" }}>
          <Link href="/" className={cormorant.className} style={{ fontSize: 24, fontWeight: 600, color: "#2C3E2D", textDecoration: "none" }}>
            Eydn
          </Link>
          <p style={{ fontSize: 14, color: "#6B6B6B", marginTop: 4 }}>Start your 14-day free trial</p>
        </div>

        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#2C3E2D",
              colorTextOnPrimaryBackground: "#FAF6F1",
              colorBackground: "#FFFFFF",
              colorText: "#1A1A2E",
              colorTextSecondary: "#6B6B6B",
              colorInputBackground: "#FFFFFF",
              colorInputText: "#1A1A2E",
              borderRadius: "8px",
              fontFamily: "'DM Sans', sans-serif",
            },
            elements: {
              card: { boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid #E8D5B7", borderRadius: 16 },
              headerTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: "#1A1A2E" },
              headerSubtitle: { fontFamily: "'DM Sans', sans-serif", color: "#6B6B6B" },
              formButtonPrimary: { background: "#2C3E2D", borderRadius: 100, fontWeight: 600, fontSize: 15, height: 48 },
              formFieldInput: { borderColor: "#E8D5B7", borderRadius: 8, fontSize: 15 },
              footerActionLink: { color: "#2C3E2D", fontWeight: 600 },
              socialButtonsBlockButton: { borderColor: "#E8D5B7", borderRadius: 8 },
              dividerLine: { background: "#E8D5B7" },
            },
          }}
        />

        <p style={{ marginTop: 32, fontSize: 13, color: "#6B6B6B", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/sign-in" style={{ color: "#2C3E2D", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
