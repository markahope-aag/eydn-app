/* Floating mock UI cards shown over the hero illustration. */

export function HeroTaskCard() {
  const tasks = [
    { label: "Book photographer", due: "Mar 15", color: "#C9A84C", done: true },
    { label: "Finalize guest list", due: "Mar 22", color: "#2C3E2D", done: false },
    { label: "Cake tasting", due: "Apr 2", color: "#D4A5A5", done: false },
    { label: "Send invitations", due: "Apr 10", color: "#C9A84C", done: false },
  ];
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "18px 20px",
        width: 260,
        boxShadow: "0 8px 32px rgba(180,140,130,.2)",
        transform: "rotate(-2deg)",
        animation: "float1 5s ease-in-out infinite",
        position: "absolute",
        top: "8%",
        right: "10%",
      }}
    >
      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Task Timeline</p>
      {tasks.map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < tasks.length - 1 ? 10 : 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, flexShrink: 0, opacity: t.done ? 0.5 : 1 }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: t.done ? "#6B5E50" : "#2A2018", textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.label}</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#6B5E50" }}>{t.due}</span>
        </div>
      ))}
    </div>
  );
}

export function HeroBudgetCard() {
  const rows = [
    { cat: "Venue", est: "$12,000", paid: "$6,000" },
    { cat: "Catering", est: "$8,500", paid: "$2,000" },
    { cat: "Photography", est: "$3,200", paid: "$1,600" },
  ];
  return (
    <div
      style={{
        background: "#2C3E2D",
        borderRadius: 12,
        padding: "18px 20px",
        width: 270,
        boxShadow: "0 12px 40px rgba(0,0,0,.3)",
        transform: "rotate(1deg)",
        animation: "float2 6s ease-in-out infinite",
        position: "absolute",
        top: "38%",
        left: "5%",
      }}
    >
      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(250,246,241,0.65)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Budget Tracker</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "6px 14px", fontFamily: "var(--font-body)", fontSize: 11 }}>
        <span style={{ color: "rgba(250,246,241,0.65)", fontWeight: 600 }}>Category</span>
        <span style={{ color: "rgba(250,246,241,0.65)", fontWeight: 600 }}>Estimated</span>
        <span style={{ color: "rgba(250,246,241,0.65)", fontWeight: 600 }}>Paid</span>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "contents" }}>
            <span style={{ fontSize: 13, color: "#FAF6F1" }}>{r.cat}</span>
            <span style={{ fontSize: 13, color: "rgba(250,246,241,0.7)" }}>{r.est}</span>
            <span style={{ fontSize: 13, color: "#C9A84C", fontWeight: 600 }}>{r.paid}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroAIChatCard() {
  return (
    <div
      style={{
        background: "#1A1A2E",
        borderRadius: 12,
        padding: "18px 20px",
        width: 280,
        boxShadow: "0 12px 40px rgba(0,0,0,.3)",
        transform: "rotate(2deg)",
        animation: "float3 7s ease-in-out infinite",
        position: "absolute",
        bottom: "10%",
        right: "8%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg, #C08080, #C9A84C)" }} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(250,246,241,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>eydn AI</span>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", marginLeft: "auto" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ alignSelf: "flex-end", background: "#2C3E2D", color: "#FAF6F1", borderRadius: "12px 12px 4px 12px", padding: "8px 12px", maxWidth: "80%", fontFamily: "var(--font-body)", fontSize: 12.5 }}>
          What should I prioritize this month?
        </div>
        <div style={{ alignSelf: "flex-start", background: "#252B45", color: "rgba(250,246,241,0.85)", borderRadius: "12px 12px 12px 4px", padding: "8px 12px", maxWidth: "85%", fontFamily: "var(--font-body)", fontSize: 12.5, lineHeight: 1.45 }}>
          Focus on booking your <span style={{ color: "#E8C97A", fontWeight: 600 }}>photographer</span> and finalizing the <span style={{ color: "#E8C97A", fontWeight: 600 }}>guest list</span>. Both have March deadlines.
        </div>
      </div>
    </div>
  );
}
