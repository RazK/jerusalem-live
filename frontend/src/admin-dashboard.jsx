// Jerusalem.live — Task C complete
// Admin review dashboard: pending event queue with confidence scoring, inline edit, bulk actions

import { useState, useMemo } from "react";

// ── Mock data ───────────────────────────────────────────────────────────────

const MOCK_PENDING = [
  {
    id: "ev-001",
    event_name: "מסיבת גג — אברהם הוסטל",
    date: "2026-05-07",
    start_time: "21:00",
    end_time: "03:00",
    venue_name: "Abraham Hostel",
    address: "הנביאים 67, Jerusalem",
    category: "party",
    description: "מסיבת גג עם DJ עדן. כניסה חינם לפני 22:00.",
    price: "Free before 22:00, ₪40 after",
    confidence_score: 0.61,
    source_group: "Jerusalem Parties 🎉",
    raw_message: "🎉 מסיבת גג הלילה! מגיעים לאברהם הוסטל, רחוב הנביאים 67, ירושלים\nמ-21:00 עד 3:00 בבוקר\nכניסה חינם לפני 22:00, 40 שקל אחרי\nDJ עדן ספין 🎧",
    created_at: "2026-05-07T14:22:11Z",
    status: "pending",
  },
  {
    id: "ev-002",
    event_name: "Jazz Night @ La Vache",
    date: "2026-05-08",
    start_time: "20:00",
    end_time: "23:00",
    venue_name: "La Vache Qui Rit",
    address: "German Colony, Jerusalem",
    category: "music",
    description: "Intimate jazz evening with the Jerusalem Jazz Quartet.",
    price: "₪60",
    confidence_score: 0.43,
    source_group: "Jerusalem Culture & Events",
    raw_message: "Jazz Night at La Vache Qui Rit, German Colony\nFriday May 8th, 8pm–11pm\nIntimate evening with the Jerusalem Jazz Quartet\nTickets: https://eventbrite.com/e/12345\nNIS 60",
    created_at: "2026-05-07T13:10:05Z",
    status: "pending",
  },
  {
    id: "ev-003",
    event_name: "שוק הלילה — מחנה יהודה",
    date: "2026-05-07",
    start_time: "18:00",
    end_time: null,
    venue_name: "Mahane Yehuda Market",
    address: "כיכר מחנה יהודה, Jerusalem",
    category: "market",
    description: "ליל שוק עם אוכל רחוב ומוזיקה חיה.",
    price: "Free",
    confidence_score: 0.88,
    source_group: "מחנה יהודה Events",
    raw_message: "שוק הלילה של מחנה יהודה — Night Market!\nTonight from 18:00\nאוכל רחוב, מוזיקה חיה, אמנים מקומיים\nכיכר מחנה יהודה, ירושלים\nFree entrance!",
    created_at: "2026-05-07T12:01:33Z",
    status: "pending",
  },
  {
    id: "ev-004",
    event_name: "Techno Night @ Talpiot Warehouse",
    date: "2026-05-08",
    start_time: "23:00",
    end_time: "06:00",
    venue_name: "Talpiot Warehouse",
    address: "Talpiot, Jerusalem",
    category: "party",
    description: "Techno night at a Talpiot warehouse with full sound system.",
    price: "₪50",
    confidence_score: 0.91,
    source_group: "Jerusalem Underground",
    raw_message: "[Image flyer: TECHNO NIGHT @ TALPIOT WAREHOUSE, Friday 23:00–06:00, 50 NIS]",
    created_at: "2026-05-07T11:55:00Z",
    status: "pending",
  },
  {
    id: "ev-005",
    event_name: "ערב אקוסטי — נחלאות",
    date: null,
    start_time: null,
    end_time: null,
    venue_name: "חצר של יוסי",
    address: "Nachlaot, Jerusalem",
    category: "music",
    description: "ערב אקוסטי בנחלאות בחצר פרטית. תאריך יפורסם בקרוב.",
    price: null,
    confidence_score: 0.37,
    source_group: "Nachlaot Neighbors",
    raw_message: "יש לנו ערב אקוסטי בנחלאות בקרוב!\nיודיעו תאריך בקרוב 🎸\nבחצר של יוסי",
    created_at: "2026-05-07T10:30:00Z",
    status: "pending",
  },
  {
    id: "ev-006",
    event_name: "Stand-up Comedy Night @ Club 52",
    date: "2026-05-21",
    start_time: "21:00",
    end_time: "22:30",
    venue_name: "Club 52",
    address: "Mahane Yehuda, Jerusalem",
    category: "culture",
    description: "Stand-up comedy show with 4 comedians. Limited seats.",
    price: "₪80",
    confidence_score: 0.97,
    source_group: "Jerusalem Comedy Nights",
    raw_message: "Stand-up Comedy Night 🎤\nClub 52, Mahane Yehuda\nThursday 21 May at 21:00\n4 comedians, 1.5 hour show\nNIS 80 — reservations: 054-123-4567\nLimited seats!",
    created_at: "2026-05-07T09:15:00Z",
    status: "pending",
  },
];

const AUTO_PUBLISHED_TODAY = 14;
const REJECTED_TODAY = 3;

const CATEGORIES = {
  party:   { label: "Party",      color: "#FF3366", icon: "🎉" },
  music:   { label: "Live Music", color: "#FF9500", icon: "🎸" },
  market:  { label: "Market",     color: "#30D158", icon: "🛍️" },
  outdoor: { label: "Outdoor",    color: "#64D2FF", icon: "🌿" },
  culture: { label: "Culture",    color: "#BF5AF2", icon: "🎨" },
};

// ── Confidence helpers ───────────────────────────────────────────────────────

function confidenceColor(score) {
  if (score >= 0.85) return { bg: "#30D15822", border: "#30D15855", text: "#30D158", label: "HIGH" };
  if (score >= 0.60) return { bg: "#FF950022", border: "#FF950055", text: "#FF9500", label: "MED" };
  return { bg: "#FF336622", border: "#FF336655", text: "#FF3366", label: "LOW" };
}

// ── Inline edit form ─────────────────────────────────────────────────────────

function EditForm({ event, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...event });
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "#fff",
    fontSize: 12,
    padding: "6px 10px",
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
  const labelStyle = { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 600, letterSpacing: 0.5, marginBottom: 3, display: "block" };

  return (
    <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>EVENT NAME</label>
          <input style={inputStyle} value={draft.event_name || ""} onChange={e => set("event_name", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>DATE</label>
          <input style={inputStyle} type="date" value={draft.date || ""} onChange={e => set("date", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>START TIME</label>
          <input style={inputStyle} type="time" value={draft.start_time || ""} onChange={e => set("start_time", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>END TIME</label>
          <input style={inputStyle} type="time" value={draft.end_time || ""} onChange={e => set("end_time", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>VENUE</label>
          <input style={inputStyle} value={draft.venue_name || ""} onChange={e => set("venue_name", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>ADDRESS</label>
          <input style={inputStyle} value={draft.address || ""} onChange={e => set("address", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>CATEGORY</label>
          <select style={inputStyle} value={draft.category || ""} onChange={e => set("category", e.target.value)}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>PRICE</label>
          <input style={inputStyle} value={draft.price || ""} onChange={e => set("price", e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>DESCRIPTION</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            value={draft.description || ""}
            onChange={e => set("description", e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onSave(draft)} style={{
          flex: 1, padding: "9px", borderRadius: 8, border: "none",
          background: "#30D158", color: "#fff", fontSize: 12, fontWeight: 700,
          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        }}>✅ Save & Approve</button>
        <button onClick={onCancel} style={{
          padding: "9px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
          background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12,
          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event, onApprove, onReject, onEdit, onPreview, selected, onSelect }) {
  const [showRaw, setShowRaw] = useState(false);
  const [editing, setEditing] = useState(false);
  const conf = confidenceColor(event.confidence_score);
  const cat = CATEGORIES[event.category] || { label: event.category, color: "#888", icon: "📌" };

  return (
    <div style={{
      background: "#12142a",
      border: `1px solid ${selected ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 14,
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}>
      {/* Card header */}
      <div style={{ padding: "12px 14px 10px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        {/* Checkbox */}
        <div
          onClick={() => onSelect(event.id)}
          style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
            border: `2px solid ${selected ? "#fff" : "rgba(255,255,255,0.2)"}`,
            background: selected ? "#fff" : "transparent",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {selected && <span style={{ fontSize: 10, color: "#12142a", fontWeight: 900 }}>✓</span>}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row: category + confidence */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{
              background: `${cat.color}20`, border: `1px solid ${cat.color}44`,
              color: cat.color, fontSize: 10, fontWeight: 600,
              padding: "2px 8px", borderRadius: 20,
            }}>{cat.icon} {cat.label}</span>
            <span style={{
              background: conf.bg, border: `1px solid ${conf.border}`,
              color: conf.text, fontSize: 10, fontWeight: 700,
              padding: "2px 8px", borderRadius: 20,
              letterSpacing: 0.5,
            }}>{conf.label} {(event.confidence_score * 100).toFixed(0)}%</span>
            {!event.date && (
              <span style={{ background: "#FF336622", border: "1px solid #FF336655", color: "#FF3366", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>
                ⚠ NO DATE
              </span>
            )}
            {!event.start_time && (
              <span style={{ background: "#FF950022", border: "1px solid #FF950055", color: "#FF9500", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>
                ⚠ NO TIME
              </span>
            )}
          </div>

          {/* Event name */}
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 3, direction: "rtl", textAlign: "right" }}>
            {event.event_name || <span style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Unnamed event</span>}
          </div>

          {/* Meta row */}
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            {event.date && <span>📅 {event.date}</span>}
            {event.start_time && <span>🕐 {event.start_time}{event.end_time ? `–${event.end_time}` : ""}</span>}
            {event.venue_name && <span>📍 {event.venue_name}</span>}
            {event.price && <span>💰 {event.price}</span>}
          </div>

          {/* Description */}
          {event.description && (
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, lineHeight: 1.55, margin: "0 0 6px", direction: "rtl", textAlign: "right" }}>
              {event.description}
            </p>
          )}

          {/* Source group (admin-only) */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,0.04)", borderRadius: 6,
            padding: "3px 8px", marginBottom: 6,
          }}>
            <span style={{ fontSize: 10 }}>📱</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontStyle: "italic" }}>
              {event.source_group}
            </span>
          </div>

          {/* Raw message toggle */}
          <div>
            <button
              onClick={() => setShowRaw(v => !v)}
              style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                fontSize: 10, cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif",
                textDecoration: "underline",
              }}
            >
              {showRaw ? "Hide" : "Show"} raw message
            </button>
            {showRaw && (
              <pre style={{
                marginTop: 6, padding: "8px 10px",
                background: "rgba(0,0,0,0.3)", borderRadius: 7,
                color: "rgba(255,255,255,0.45)", fontSize: 10,
                fontFamily: "'DM Mono', monospace", lineHeight: 1.6,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>{event.raw_message}</pre>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {!editing && (
        <div style={{
          display: "flex", gap: 0,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          {[
            { icon: "✅", label: "Approve", color: "#30D158", fn: () => onApprove(event.id) },
            { icon: "✏️", label: "Edit",    color: "#FF9500", fn: () => setEditing(true) },
            { icon: "❌", label: "Reject",  color: "#FF3366", fn: () => onReject(event.id) },
            { icon: "👁️", label: "Preview", color: "#64D2FF", fn: () => onPreview(event.id) },
          ].map((btn, i) => (
            <button key={btn.label} onClick={btn.fn} style={{
              flex: 1, padding: "9px 4px",
              background: "transparent",
              border: "none",
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
              color: btn.color,
              fontSize: 11, fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "background 0.12s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
            }}>
              <span style={{ fontSize: 12 }}>{btn.icon}</span>
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <EditForm
          event={event}
          onSave={(draft) => { onEdit(event.id, draft); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [events, setEvents] = useState(MOCK_PENDING);
  const [selected, setSelected] = useState(new Set());
  const [dismissed, setDismissed] = useState(new Set()); // approved/rejected
  const [toast, setToast] = useState(null);
  const [filterConf, setFilterConf] = useState("all"); // all | high | med | low
  const [previewId, setPreviewId] = useState(null);

  const pending = events.filter(e => !dismissed.has(e.id));
  const avgConf = pending.length
    ? (pending.reduce((s, e) => s + e.confidence_score, 0) / pending.length).toFixed(2)
    : "—";

  const filtered = useMemo(() => {
    if (filterConf === "high") return pending.filter(e => e.confidence_score >= 0.85);
    if (filterConf === "med")  return pending.filter(e => e.confidence_score >= 0.60 && e.confidence_score < 0.85);
    if (filterConf === "low")  return pending.filter(e => e.confidence_score < 0.60);
    return pending;
  }, [pending, filterConf]);

  const showToast = (msg, color = "#30D158") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2800);
  };

  const approve = (id) => {
    setDismissed(s => new Set([...s, id]));
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
    showToast("✅ Event approved and published", "#30D158");
  };

  const reject = (id) => {
    setDismissed(s => new Set([...s, id]));
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
    showToast("❌ Event rejected", "#FF3366");
  };

  const editAndApprove = (id, draft) => {
    setEvents(evs => evs.map(e => e.id === id ? { ...e, ...draft } : e));
    setDismissed(s => new Set([...s, id]));
    showToast("✏️ Event edited and approved", "#FF9500");
  };

  const toggleSelect = (id) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const bulkApproveHigh = () => {
    const highConf = pending.filter(e => e.confidence_score >= 0.85).map(e => e.id);
    setDismissed(s => new Set([...s, ...highConf]));
    setSelected(new Set());
    showToast(`✅ Approved ${highConf.length} high-confidence events`, "#30D158");
  };

  const bulkRejectLow = () => {
    const low = pending.filter(e => e.confidence_score < 0.60).map(e => e.id);
    setDismissed(s => new Set([...s, ...low]));
    setSelected(new Set());
    showToast(`❌ Rejected ${low.length} low-confidence events`, "#FF3366");
  };

  const bulkApproveSelected = () => {
    setDismissed(s => new Set([...s, ...selected]));
    showToast(`✅ Approved ${selected.size} selected events`, "#30D158");
    setSelected(new Set());
  };

  const bulkRejectSelected = () => {
    setDismissed(s => new Set([...s, ...selected]));
    showToast(`❌ Rejected ${selected.size} selected events`, "#FF3366");
    setSelected(new Set());
  };

  const highCount = pending.filter(e => e.confidence_score >= 0.85).length;
  const lowCount  = pending.filter(e => e.confidence_score < 0.60).length;

  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: "#0b0d1c",
      fontFamily: "'DM Sans', sans-serif",
      color: "#fff",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 60px" }}>

        {/* ── Header ── */}
        <div style={{
          padding: "24px 0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          marginBottom: 20,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          flexWrap: "wrap", gap: 10,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>Jerusalem.live</span>
              <span style={{
                background: "#FF336622", border: "1px solid #FF336644",
                color: "#FF3366", fontSize: 10, fontWeight: 700,
                padding: "2px 8px", borderRadius: 20, letterSpacing: 0.5,
              }}>ADMIN</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
              Event review queue · May 7, 2026
            </div>
          </div>
          <button
            onClick={() => window.open("/", "_blank")}
            style={{
              padding: "8px 14px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)",
              fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            🗺️ Open App
          </button>
        </div>

        {/* ── Stats bar ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
          marginBottom: 20,
        }}>
          {[
            { label: "Pending Review", value: pending.length, color: "#FF9500" },
            { label: "Auto-published Today", value: AUTO_PUBLISHED_TODAY, color: "#30D158" },
            { label: "Rejected Today", value: REJECTED_TODAY, color: "#FF3366" },
            { label: "Avg Confidence", value: avgConf, color: "#64D2FF" },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "#12142a",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12, padding: "14px 16px",
            }}>
              <div style={{ color: stat.color, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 4 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter chips + bulk actions ── */}
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          marginBottom: 14, flexWrap: "wrap",
        }}>
          {/* Confidence filter */}
          {[
            { k: "all", label: `All (${pending.length})` },
            { k: "high", label: `High ≥85% (${highCount})`, color: "#30D158" },
            { k: "med",  label: `Med 60–85%`, color: "#FF9500" },
            { k: "low",  label: `Low <60% (${lowCount})`, color: "#FF3366" },
          ].map(f => (
            <button key={f.k} onClick={() => setFilterConf(f.k)} style={{
              padding: "6px 12px", borderRadius: 20,
              border: `1px solid ${filterConf === f.k ? (f.color || "#fff") : "rgba(255,255,255,0.12)"}`,
              background: filterConf === f.k ? `${f.color || "#fff"}18` : "transparent",
              color: filterConf === f.k ? (f.color || "#fff") : "rgba(255,255,255,0.4)",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "nowrap",
            }}>{f.label}</button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Bulk action buttons */}
          {selected.size > 0 && (
            <>
              <button onClick={bulkApproveSelected} style={{
                padding: "6px 12px", borderRadius: 20,
                border: "1px solid #30D15855",
                background: "#30D15822", color: "#30D158",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>✅ Approve {selected.size} selected</button>
              <button onClick={bulkRejectSelected} style={{
                padding: "6px 12px", borderRadius: 20,
                border: "1px solid #FF336655",
                background: "#FF336622", color: "#FF3366",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>❌ Reject {selected.size} selected</button>
            </>
          )}
          <button onClick={bulkApproveHigh} disabled={highCount === 0} style={{
            padding: "6px 12px", borderRadius: 20,
            border: `1px solid ${highCount > 0 ? "#30D15855" : "rgba(255,255,255,0.08)"}`,
            background: highCount > 0 ? "#30D15815" : "transparent",
            color: highCount > 0 ? "#30D158" : "rgba(255,255,255,0.2)",
            fontSize: 11, fontWeight: 600,
            cursor: highCount > 0 ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
          }}>✅ Approve all high</button>
          <button onClick={bulkRejectLow} disabled={lowCount === 0} style={{
            padding: "6px 12px", borderRadius: 20,
            border: `1px solid ${lowCount > 0 ? "#FF336655" : "rgba(255,255,255,0.08)"}`,
            background: lowCount > 0 ? "#FF336615" : "transparent",
            color: lowCount > 0 ? "#FF3366" : "rgba(255,255,255,0.2)",
            fontSize: 11, fontWeight: 600,
            cursor: lowCount > 0 ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
          }}>❌ Reject all low</button>
        </div>

        {/* ── Event queue ── */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 0",
            color: "rgba(255,255,255,0.25)", fontSize: 14,
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
            Queue is empty for this filter.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(ev => (
              <EventCard
                key={ev.id}
                event={ev}
                selected={selected.has(ev.id)}
                onSelect={toggleSelect}
                onApprove={approve}
                onReject={reject}
                onEdit={editAndApproveId => editAndApprove(ev.id, editAndApproveId)}
                onPreview={(id) => setPreviewId(id === previewId ? null : id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Preview modal (map placeholder) ── */}
      {previewId && (() => {
        const ev = events.find(e => e.id === previewId);
        if (!ev) return null;
        const cat = CATEGORIES[ev.category] || { color: "#888", label: "Unknown", icon: "📌" };
        return (
          <div
            onClick={() => setPreviewId(null)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.7)", zIndex: 500,
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: "#12142a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 18, width: 380, overflow: "hidden",
                boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
              }}
            >
              {/* Map placeholder */}
              <div style={{
                height: 180,
                background: `linear-gradient(135deg,#1a1c2e,#12142a)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: `radial-gradient(circle at 50% 50%, ${cat.color}15 0%, transparent 70%)`,
                }} />
                <div style={{ textAlign: "center", zIndex: 1 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📍</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                    {ev.address || ev.venue_name || "Location unknown"}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 4 }}>
                    Map preview requires geocoded coordinates
                  </div>
                </div>
              </div>
              {/* Event info */}
              <div style={{ padding: "14px 16px 18px" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: `${cat.color}20`, borderRadius: 20, padding: "3px 10px",
                  border: `1px solid ${cat.color}44`, marginBottom: 8,
                }}>
                  <span style={{ fontSize: 10 }}>{cat.icon}</span>
                  <span style={{ color: cat.color, fontSize: 10, fontWeight: 600 }}>{cat.label}</span>
                </div>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 4, direction: "rtl", textAlign: "right" }}>
                  {ev.event_name}
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                  {ev.date} · {ev.start_time}{ev.end_time ? `–${ev.end_time}` : ""}
                </div>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "10px 16px" }}>
                <button onClick={() => setPreviewId(null)} style={{
                  width: "100%", padding: "9px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)",
                  fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>Close Preview</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#12142a", border: `1px solid ${toast.color}44`,
          borderRadius: 12, padding: "10px 18px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          color: "#fff", fontSize: 13, fontWeight: 600,
          zIndex: 1000, whiteSpace: "nowrap",
          animation: "fadeInUp 0.25s ease",
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        select option { background: #12142a; }
      `}</style>
    </div>
  );
}
