import React, { useEffect, useState } from "react";

const RISK_FACTORS = {
  high:   { color: "#e05a5a", bg: "rgba(224,90,90,0.1)",   border: "rgba(224,90,90,0.3)",   label: "High Risk" },
  medium: { color: "#e8a048", bg: "rgba(232,160,72,0.1)",  border: "rgba(232,160,72,0.3)",  label: "Medium Risk" },
  low:    { color: "#14a882", bg: "rgba(20,168,130,0.1)",  border: "rgba(20,168,130,0.3)",  label: "Low Risk" },
};

function ScoreDial({ score, color }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    let start = null;
    const target = score;
    const duration = 900;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimated(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const radius = 38;
  const cx = 50, cy = 50;
  const circumference = Math.PI * radius; // half circle
  const pct = animated / 10;
  const dashOffset = circumference * (1 - pct);

  return (
    <div style={{ position: "relative", width: 100, height: 60, margin: "0 auto" }}>
      <svg viewBox="0 0 100 55" style={{ width: "100%", height: "100%" }}>
        {/* Track */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" stroke="#1e3829" strokeWidth="8" strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />
        {/* Score number */}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fontWeight="800" fill={color} fontFamily="Syne, sans-serif">
          {animated}
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="#5a7a6e">
          / 10
        </text>
      </svg>
    </div>
  );
}

export default function RiskProfileCard({ quoteData }) {
  const [expanded, setExpanded] = useState(false);

  if (!quoteData) return null;

  const {
    risk_tier = "medium",
    risk_score = 5,
    zone_name = "Your Zone",
    active_hours = 8,
    disruption_frequency = "1–2×/month",
    recommended_tier = "Standard",
  } = quoteData;

  const theme = RISK_FACTORS[risk_tier] || RISK_FACTORS.medium;
  const month = new Date().getMonth() + 1;
  const isMonsoon = [6, 7, 8, 9].includes(month);

  const factors = [
    {
      label: "Zone disruption rate",
      value: disruption_frequency,
      icon: "📍",
      active: risk_score >= 5,
      color: risk_score >= 7 ? "#e05a5a" : "#e8a048",
    },
    {
      label: "Monsoon season",
      value: isMonsoon ? "+20% risk" : "Off-season",
      icon: "🌧",
      active: isMonsoon,
      color: "#3b8ef8",
    },
    {
      label: "Active hours",
      value: `${active_hours}h shift`,
      icon: "⏱",
      active: active_hours > 8,
      color: "#e8a048",
    },
    {
      label: "No prior claims",
      value: "Loyalty −10%",
      icon: "🎖",
      active: true,
      positive: true,
      color: "#14a882",
    },
  ];

  return (
    <div style={{
      background: "var(--surface2, #172a20)",
      border: `1px solid ${theme.border}`,
      borderRadius: 14,
      padding: "18px 18px 14px",
      animation: "slideUp 0.5s ease",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#5a7a6e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
            AI Risk Profile
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f0f7f4", fontFamily: "Syne, sans-serif", marginBottom: 4 }}>
            {zone_name}
          </div>
          <span style={{
            display: "inline-block", fontSize: 11, fontWeight: 700,
            color: theme.color, background: theme.bg,
            border: `1px solid ${theme.border}`,
            borderRadius: 20, padding: "3px 10px",
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            ● {theme.label}
          </span>
        </div>
        <ScoreDial score={risk_score} color={theme.color} />
      </div>

      {/* Risk factors */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {factors.map((f, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: f.active ? (f.positive ? "rgba(20,168,130,0.05)" : "rgba(0,0,0,0.15)") : "rgba(0,0,0,0.1)",
            borderRadius: 8, padding: "8px 12px",
            border: f.active ? `1px solid ${f.color}22` : "1px solid transparent",
            opacity: f.active ? 1 : 0.5,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>{f.icon}</span>
              <span style={{ fontSize: 12, color: "#8a9490" }}>{f.label}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: f.active ? f.color : "#3d5a4e" }}>
              {f.value}
            </span>
          </div>
        ))}
      </div>

      {/* Recommendation strip */}
      <div style={{
        background: "rgba(20,168,130,0.08)",
        border: "1px solid rgba(20,168,130,0.2)",
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer",
      }} onClick={() => setExpanded(e => !e)}>
        <div>
          <div style={{ fontSize: 10, color: "#5a7a6e", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            AI recommends
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#14a882", fontFamily: "Syne, sans-serif" }}>
            {recommended_tier} Plan
          </div>
        </div>
        <span style={{ color: "#5a7a6e", fontSize: 12 }}>{expanded ? "▲" : "▼"} Why?</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#5a7a6e", lineHeight: 1.6, animation: "slideUp 0.2s ease" }}>
          {risk_tier === "high" && "Your zone has frequent disruptions and high flood risk. Pro gives you unlimited events and ₹1,500/week max payout — essential for high-exposure zones like yours."}
          {risk_tier === "medium" && "Standard coverage balances cost and protection for your zone's disruption frequency. You get 4 events/week and ₹800 max payout at a fair weekly premium."}
          {risk_tier === "low" && "Your zone has low disruption history. Basic coverage gives you essential protection without overpaying — you can always upgrade if patterns change."}
        </div>
      )}
    </div>
  );
}