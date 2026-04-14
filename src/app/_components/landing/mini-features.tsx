/* Mini product-preview widgets shown alongside each feature row. */

export function MiniTaskTimeline() {
  const groups = [
    { phase: "This Week", tasks: [{ t: "Confirm florist contract", s: "urgent" }, { t: "Mail save-the-dates", s: "done" }] },
    { phase: "Next Week", tasks: [{ t: "Cake tasting appointment", s: "upcoming" }, { t: "Book rehearsal dinner venue", s: "upcoming" }] },
  ];
  const statusColor: Record<string, string> = { urgent: "#D4A5A5", done: "#2C3E2D", upcoming: "#C9A84C" };
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 360, border: "1px solid #E8D5B7", boxShadow: "0 4px 20px rgba(180,140,130,.15)" }}>
      {groups.map((g, gi) => (
        <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? 16 : 0 }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{g.phase}</p>
          {g.tasks.map((t, ti) => (
            <div key={ti} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: statusColor[t.s], flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2A2018", textDecoration: t.s === "done" ? "line-through" : "none" }}>{t.t}</span>
            </div>
          ))}
          {gi === 0 && (
            <div style={{ height: 4, borderRadius: 100, background: "#F3EAE0", marginTop: 10 }}>
              <div style={{ height: "100%", borderRadius: 100, background: "#2C3E2D", width: "60%" }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function MiniBudgetTracker() {
  const rows = [
    { cat: "Venue", est: "$12,000", paid: "$6,000", pct: 50 },
    { cat: "Catering", est: "$8,500", paid: "$2,000", pct: 24 },
    { cat: "Photography", est: "$3,200", paid: "$1,600", pct: 50 },
    { cat: "Florals", est: "$2,800", paid: "$0", pct: 0 },
  ];
  return (
    <div style={{ background: "#1E2E1F", borderRadius: 12, padding: 20, maxWidth: 380, border: "1px solid rgba(201,168,76,0.3)", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "#FAF6F1" }}>Total Budget</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "#E8C97A" }}>$26,500</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px 16px", fontFamily: "var(--font-body)", fontSize: 11, marginBottom: 12 }}>
        <span style={{ color: "rgba(250,246,241,0.65)", fontWeight: 600 }}>Category</span>
        <span style={{ color: "rgba(250,246,241,0.65)", fontWeight: 600 }}>Estimated</span>
        <span style={{ color: "rgba(250,246,241,0.65)", fontWeight: 600 }}>Paid</span>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "contents" }}>
            <span style={{ fontSize: 13, color: "#FAF6F1" }}>{r.cat}</span>
            <span style={{ fontSize: 13, color: "rgba(250,246,241,0.7)" }}>{r.est}</span>
            <span style={{ fontSize: 13, color: "#E8C97A", fontWeight: 600 }}>{r.paid}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(250,246,241,0.15)", paddingTop: 10, display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 16px", fontFamily: "var(--font-body)", fontSize: 12 }}>
        <span style={{ color: "rgba(250,246,241,0.65)" }}>Total</span>
        <span style={{ color: "rgba(250,246,241,0.7)", fontWeight: 600 }}>$26,500</span>
        <span style={{ color: "#E8C97A", fontWeight: 600 }}>$9,600</span>
      </div>
    </div>
  );
}

export function MiniGuestList() {
  const guests = [
    { name: "Emma Johnson", rsvp: "Confirmed", color: "#2E7D4F", bg: "#D6F5E3" },
    { name: "David Chen", rsvp: "Pending", color: "#8A5200", bg: "#FFF3CC" },
    { name: "Sarah Williams", rsvp: "Confirmed", color: "#2E7D4F", bg: "#D6F5E3" },
    { name: "Michael Brown", rsvp: "Declined", color: "#A0204A", bg: "#FFE0EC" },
  ];
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 360, border: "1px solid #E8D5B7", boxShadow: "0 4px 20px rgba(180,140,130,.15)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px 20px" }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase" }}>Guest</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", textTransform: "uppercase" }}>RSVP</span>
        {guests.map((g, i) => (
          <div key={i} style={{ display: "contents" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2A2018" }}>{g.name}</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, background: g.bg, color: g.color, borderRadius: 100, padding: "3px 10px" }}>{g.rsvp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MiniVendorPipeline() {
  const cols = [
    { label: "Researching", items: ["DJ", "Florist"] },
    { label: "Contacted", items: ["Baker"] },
    { label: "Booked", items: ["Photographer", "Venue"] },
  ];
  const colColors = ["#FFF3CC", "#E8D5B7", "#D6F5E3"];
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 380, border: "1px solid #E8D5B7", boxShadow: "0 4px 20px rgba(180,140,130,.15)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {cols.map((c, ci) => (
          <div key={ci}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#6B5E50", marginBottom: 8, textTransform: "uppercase" }}>{c.label}</p>
            {c.items.map((item, ii) => (
              <div key={ii} style={{ background: colColors[ci], borderRadius: 8, padding: "6px 10px", marginBottom: 6, fontFamily: "var(--font-body)", fontSize: 12, color: "#2A2018" }}>
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MiniWeddingSite() {
  return (
    <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", maxWidth: 360, border: "1px solid #E8D5B7", boxShadow: "0 4px 20px rgba(180,140,130,.15)" }}>
      <div style={{ background: "#2C3E2D", padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4A5A5" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A84C" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D6F5E3" }} />
        <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#FAF6F1", marginLeft: 8 }}>eydn.app/w/mark-and-sarah</span>
      </div>
      <div style={{ padding: 20, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-script)", fontSize: 22, color: "#C9A84C" }}>Mark & Sarah</p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "#2A2018", marginTop: 4 }}>September 20, 2026</p>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#6B5E50", marginTop: 6 }}>The Grand Estate, Napa Valley</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14 }}>
          {["Schedule", "Travel", "RSVP", "Registry"].map((l) => (
            <span key={l} style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#2C3E2D", background: "#F3EAE0", borderRadius: 100, padding: "4px 10px" }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MiniDayOfBinder() {
  return (
    <div style={{ background: "#1E2E1F", borderRadius: 12, padding: 20, maxWidth: 340, border: "1px solid rgba(201,168,76,0.3)", position: "relative", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #C9A84C, #E8C97A)", borderRadius: "12px 12px 0 0" }} />
      <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: "#FAF6F1", marginBottom: 4 }}>Day-of Binder</p>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(250,246,241,0.65)", marginBottom: 14 }}>Complete wedding guide &middot; PDF</p>
      {["Ceremony Timeline", "Vendor Contact Sheet", "Music & Readings", "Setup Assignments", "Emergency Kit List"].map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ width: 16, height: 2, background: i < 3 ? "#E8C97A" : "rgba(250,246,241,0.2)", borderRadius: 2 }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: i < 3 ? "#FAF6F1" : "rgba(250,246,241,0.5)" }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

export function MiniDataSecurity() {
  const items = ["256-bit encryption at rest", "Daily encrypted backups", "Soft-delete recovery (30 days)", "Full data export anytime", "Audit logging"];
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 20, maxWidth: 360, border: "1px solid #E8D5B7", boxShadow: "0 4px 20px rgba(180,140,130,.15)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F3EAE0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C3E2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#2A2018" }}>Data Protection</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2C3E2D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2A2018" }}>{item}</span>
        </div>
      ))}
    </div>
  );
}
