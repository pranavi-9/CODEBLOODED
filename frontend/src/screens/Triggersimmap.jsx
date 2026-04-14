import React, { useState, useEffect, useRef } from "react";

const ZONES = [
  { id: "560034", name: "Koramangala", x: 52, y: 58, risk: 8, city: "Bengaluru" },
  { id: "560095", name: "Indiranagar", x: 62, y: 45, risk: 3, city: "Bengaluru" },
  { id: "560068", name: "JP Nagar",    x: 40, y: 70, risk: 5, city: "Bengaluru" },
  { id: "600042", name: "Velachery",   x: 78, y: 82, risk: 8, city: "Chennai"   },
  { id: "400053", name: "Andheri W",   x: 22, y: 38, risk: 9, city: "Mumbai"    },
  { id: "110075", name: "Dwarka",      x: 30, y: 14, risk: 6, city: "Delhi"     },
  { id: "500032", name: "Kondapur",    x: 60, y: 72, risk: 4, city: "Hyderabad" },
];

const TRIGGERS = [
  { type: "heavy_rain",       label: "Heavy Rain",        icon: "🌧",  color: "#3b8ef8", payout: 0.80 },
  { type: "dead_zone",        label: "Dead Zone",          icon: "📡",  color: "#e8a048", payout: 0.70 },
  { type: "civic_disruption", label: "Civic Disruption",  icon: "🚧",  color: "#e05a5a", payout: 0.75 },
  { type: "extreme_heat",     label: "Extreme Heat",       icon: "🌡",  color: "#ef9f27", payout: 0.50 },
  { type: "severe_aqi",       label: "Severe AQI",         icon: "💨",  color: "#9f7ae8", payout: 0.60 },
];

const WORKER_EARNINGS = { low: 540, medium: 720, high: 900 };

function getRiskLevel(r) { return r >= 7 ? "high" : r >= 4 ? "medium" : "low"; }

export default function TriggerSimMap() {
  const [phase, setPhase]         = useState("idle"); // idle | selecting | triggered | calculating | paid
  const [selectedZone, setZone]   = useState(null);
  const [selectedTrigger, setTrigger] = useState(null);
  const [rainDrops, setRainDrops] = useState([]);
  const [payout, setPayout]       = useState(null);
  const [pulseZone, setPulseZone] = useState(null);
  const timerRef = useRef(null);

  const cleanup = () => { clearTimeout(timerRef.current); };

  const startSim = (zone, trigger) => {
    cleanup();
    setZone(zone);
    setTrigger(trigger);
    setPayout(null);
    setPhase("triggered");
    setPulseZone(zone.id);

    // Animate rain drops
    if (trigger.type === "heavy_rain") {
      const drops = Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: zone.x + (Math.random() - 0.5) * 14,
        y: zone.y + (Math.random() - 0.5) * 14,
        delay: Math.random() * 0.8,
      }));
      setRainDrops(drops);
      timerRef.current = setTimeout(() => setRainDrops([]), 2200);
    } else {
      setRainDrops([]);
    }

    timerRef.current = setTimeout(() => {
      setPhase("calculating");
      timerRef.current = setTimeout(() => {
        const level = getRiskLevel(zone.risk);
        const expected = WORKER_EARNINGS[level];
        const actual   = Math.round(expected * (0.45 + Math.random() * 0.2));
        const shortfall = expected - actual;
        const hours = parseFloat((2 + Math.random() * 3).toFixed(1));
        const attrPct = Math.round((hours / 9) * 100);
        const attrLoss = Math.round(shortfall * attrPct / 100);
        const amount = Math.round(attrLoss * trigger.payout);
        setPayout({ expected, actual, shortfall, hours, attrPct, attrLoss, amount });
        setPhase("paid");
      }, 1800);
    }, 1400);
  };

  const reset = () => {
    cleanup();
    setPhase("idle");
    setZone(null);
    setTrigger(null);
    setPayout(null);
    setPulseZone(null);
    setRainDrops([]);
  };

  useEffect(() => () => cleanup(), []);

  return (
    <div style={{ fontFamily: "var(--font-body, 'DM Sans', sans-serif)", padding: "0 0 8px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#14a882", fontWeight: 600, marginBottom: 4 }}>
            Live Trigger Simulation
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f0f7f4", fontFamily: "var(--font-display, 'Syne', sans-serif)" }}>
            Pick a zone + trigger
          </div>
        </div>
        {phase !== "idle" && (
          <button onClick={reset} style={{ background: "transparent", border: "1px solid #1e3829", color: "#5a7a6e", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>
            Reset
          </button>
        )}
      </div>

      {/* Trigger selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {TRIGGERS.map(t => (
          <button
            key={t.type}
            onClick={() => { if (selectedZone) startSim(selectedZone, t); else setTrigger(t); }}
            style={{
              background: selectedTrigger?.type === t.type ? t.color + "22" : "rgba(255,255,255,0.03)",
              border: `1px solid ${selectedTrigger?.type === t.type ? t.color : "#1e3829"}`,
              borderRadius: 8, padding: "6px 12px", cursor: "pointer",
              color: selectedTrigger?.type === t.type ? t.color : "#5a7a6e",
              fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s"
            }}
          >
            <span style={{ fontSize: 14 }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div style={{
        position: "relative", background: "#0d1a14", border: "1px solid #1e3829",
        borderRadius: 14, overflow: "hidden", marginBottom: 14,
        height: 220, userSelect: "none"
      }}>
        {/* Grid lines */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.15 }}>
          {[20, 40, 60, 80].map(v => (
            <React.Fragment key={v}>
              <line x1={`${v}%`} y1="0" x2={`${v}%`} y2="100%" stroke="#14a882" strokeWidth="0.5" />
              <line x1="0" y1={`${v}%`} x2="100%" y2={`${v}%`} stroke="#14a882" strokeWidth="0.5" />
            </React.Fragment>
          ))}
        </svg>

        {/* City labels */}
        {["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad"].map((city, i) => {
          const pos = [
            { x: "48%", y: "12%" }, { x: "14%", y: "30%" },
            { x: "22%", y: "7%" }, { x: "74%", y: "75%" }, { x: "57%", y: "65%" }
          ][i];
          return (
            <div key={city} style={{ position: "absolute", left: pos.x, top: pos.y, fontSize: 9, color: "#2d5a4a", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", transform: "translateX(-50%)" }}>
              {city}
            </div>
          );
        })}

        {/* Rain drops */}
        {rainDrops.map(d => (
          <div key={d.id} style={{
            position: "absolute",
            left: `${d.x}%`, top: `${d.y}%`,
            width: 2, height: 8,
            background: "#3b8ef8",
            borderRadius: 1,
            opacity: 0,
            animation: `rainFall 0.6s ease-in ${d.delay}s forwards`,
            transform: "rotate(15deg)",
          }} />
        ))}

        {/* Zone dots */}
        {ZONES.map(zone => {
          const isSelected = selectedZone?.id === zone.id;
          const isPulsing  = pulseZone === zone.id;
          const riskColor  = zone.risk >= 7 ? "#e05a5a" : zone.risk >= 4 ? "#e8a048" : "#14a882";
          return (
            <div
              key={zone.id}
              onClick={() => {
                if (phase === "idle" || phase === "selecting") {
                  if (selectedTrigger) startSim(zone, selectedTrigger);
                  else { setZone(zone); setPhase("selecting"); }
                }
              }}
              style={{
                position: "absolute",
                left: `${zone.x}%`, top: `${zone.y}%`,
                transform: "translate(-50%, -50%)",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              {/* Pulse ring */}
              {isPulsing && (
                <div style={{
                  position: "absolute", inset: -10,
                  borderRadius: "50%",
                  border: `2px solid ${selectedTrigger?.color || "#14a882"}`,
                  animation: "pingOut 1s ease-out infinite",
                }} />
              )}
              {/* Dot */}
              <div style={{
                width: isSelected ? 18 : 13,
                height: isSelected ? 18 : 13,
                borderRadius: "50%",
                background: isSelected ? (selectedTrigger?.color || "#14a882") : riskColor,
                border: `2px solid ${isSelected ? "#fff" : riskColor + "88"}`,
                boxShadow: isSelected ? `0 0 16px ${selectedTrigger?.color || "#14a882"}88` : "none",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isPulsing && phase === "paid" && (
                  <div style={{ fontSize: 8 }}>✓</div>
                )}
              </div>
              {/* Label */}
              <div style={{
                position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                marginTop: 4, fontSize: 9, color: isSelected ? "#f0f7f4" : "#5a7a6e",
                fontWeight: 600, whiteSpace: "nowrap", transition: "color 0.2s"
              }}>
                {zone.name}
              </div>
            </div>
          );
        })}

        {/* Instruction overlay */}
        {phase === "idle" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ fontSize: 12, color: "#3d5a4e", textAlign: "center", lineHeight: 1.6 }}>
              Select a trigger above, then tap a zone dot
            </div>
          </div>
        )}

        {/* Calculating overlay */}
        {phase === "calculating" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(13,22,16,0.7)", backdropFilter: "blur(2px)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 8, animation: "spin 1s linear infinite", display: "inline-block" }}>⚙</div>
              <div style={{ fontSize: 13, color: "#14a882", fontWeight: 600 }}>Computing payout...</div>
              <div style={{ fontSize: 11, color: "#5a7a6e", marginTop: 4 }}>Earnings gap · Attribution · Coverage</div>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      {phase === "selecting" && !selectedTrigger && (
        <div style={{ background: "rgba(20,168,130,0.06)", border: "1px solid rgba(20,168,130,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#5a7a6e", marginBottom: 12 }}>
          Zone selected: <strong style={{ color: "#14a882" }}>{selectedZone?.name}</strong>. Now pick a trigger above.
        </div>
      )}

      {phase === "triggered" && (
        <div style={{ background: "rgba(20,168,130,0.06)", border: "1px solid rgba(20,168,130,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#5a7a6e", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{selectedTrigger?.icon}</span>
          <span><strong style={{ color: "#f0f7f4" }}>{selectedTrigger?.label}</strong> detected in <strong style={{ color: "#14a882" }}>{selectedZone?.name}</strong> — threshold breached</span>
        </div>
      )}

      {/* Payout card */}
      {phase === "paid" && payout && (
        <div style={{ background: "rgba(20,168,130,0.06)", border: "1px solid rgba(20,168,130,0.3)", borderRadius: 12, padding: "16px", animation: "slideUp 0.4s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#5a7a6e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Payout processed</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#14a882", fontFamily: "var(--font-display, 'Syne', sans-serif)" }}>
                ₹{payout.amount}
              </div>
              <div style={{ fontSize: 11, color: "#5a7a6e", marginTop: 2 }}>credited to UPI · instant</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#e8a048", background: "rgba(232,160,72,0.1)", border: "1px solid rgba(232,160,72,0.3)", borderRadius: 6, padding: "3px 10px", marginBottom: 4 }}>
                {selectedTrigger?.label}
              </div>
              <div style={{ fontSize: 11, color: "#5a7a6e" }}>{selectedZone?.name}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              ["Expected", `₹${payout.expected}`],
              ["Actual", `₹${payout.actual}`],
              ["Shortfall", `₹${payout.shortfall}`],
              ["Trigger hrs", `${payout.hours}h`],
              ["Attribution", `${payout.attrPct}%`],
              ["Coverage rate", `${Math.round(selectedTrigger.payout * 100)}%`],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: "#5a7a6e", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#d4ede7" }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: "#3d7a6a", fontFamily: "monospace" }}>
            Ref: ZNVST-{Math.random().toString(36).slice(2,10).toUpperCase()} · Fraud score: {Math.floor(20 + Math.random() * 40)}/100
          </div>
        </div>
      )}

      <style>{`
        @keyframes pingOut {
          0%   { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes rainFall {
          0%   { opacity: 0.8; transform: rotate(15deg) translateY(0); }
          100% { opacity: 0;   transform: rotate(15deg) translateY(12px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}