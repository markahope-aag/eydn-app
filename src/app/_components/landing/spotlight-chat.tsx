export function SpotlightChat() {
  return (
    <div style={{ background: "#1E2340", borderRadius: 16, padding: 24, maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A84C" }} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#FAF6F1", fontWeight: 600 }}>Eydn AI</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "rgba(250,246,241,0.65)", marginLeft: "auto" }}>Online</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ alignSelf: "flex-end", background: "#2C3E2D", color: "#FAF6F1", borderRadius: "14px 14px 4px 14px", padding: "10px 16px", maxWidth: "78%", fontFamily: "var(--font-body)", fontSize: 13 }}>
          Find me florists near Madison under $3,000
        </div>
        <div style={{ alignSelf: "flex-start", background: "#252B45", color: "#E8D5B7", borderRadius: "14px 14px 14px 4px", padding: "10px 16px", maxWidth: "85%", fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.55 }}>
          I found 3 great options! <span style={{ color: "#E8C97A" }}>Bloom & Petal</span> starts at $2,200 with amazing reviews. Want me to add them to your vendor list?
        </div>
        <div style={{ alignSelf: "flex-end", background: "#2C3E2D", color: "#FAF6F1", borderRadius: "14px 14px 4px 14px", padding: "10px 16px", maxWidth: "78%", fontFamily: "var(--font-body)", fontSize: 13 }}>
          Yes, add them and mark as contacted
        </div>
        <div style={{ alignSelf: "flex-start", background: "#252B45", color: "#E8D5B7", borderRadius: "14px 14px 14px 4px", padding: "10px 16px", maxWidth: "85%", fontFamily: "var(--font-body)", fontSize: 13, lineHeight: 1.55 }}>
          Done! <span style={{ color: "#7BC67E" }}>✓</span> Added Bloom &amp; Petal to your vendors <span style={{ color: "#7BC67E" }}>✓</span> Status set to contacted
        </div>
      </div>
      {/* Input bar */}
      <div style={{ marginTop: 16, background: "#1A1A2E", borderRadius: 100, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(250,246,241,0.55)", flex: 1 }}>Ask Eydn anything...</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8C97A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </div>
    </div>
  );
}
