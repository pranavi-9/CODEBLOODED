import React, { useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Generate a week of earnings data with trigger events
function generateWeekData(expectedDaily = 900) {
  const triggers = [
    { day: 1, type: "Heavy Rain",   icon: "🌧", color: "#3b8ef8", payout: 72 },
    { day: 4, type: "Dead Zone",    icon: "📡", color: "#e8a048", payout: 108 },
  ];
  return DAYS.map((label, i) => {
    const trigger = triggers.find(t => t.day === i);
    const hasTrigger = !!trigger;
    const actual = hasTrigger
      ? Math.round(expectedDaily * (0.42 + Math.random() * 0.18))
      : Math.round(expectedDaily * (0.88 + Math.random() * 0.2));
    return { label, actual, expected: expectedDaily, trigger: trigger || null };
  });
}

export default function EarningsTimeline({ expectedDaily = 900 }) {
  const [data] = useState(() => generateWeekData(expectedDaily));
  const [hovered, setHovered] = useState(null);

  const maxVal = Math.max(expectedDaily * 1.1, ...data.map(d => d.actual));
  const H = 130; // chart height px
  const W = 100; // percent width

  const toY = (val) => H - (val / maxVal) * H;
  const toX = (i) => (i / (DAYS.length - 1)) * 100;

  const actualPath = data.map((d, i) =>
    `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.actual)}`
  ).join(" ");

  const expectedPath = data.map((d, i) =>
    `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.expected)}`
  ).join(" ");

  const areaPath = [
    ...data.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.actual)}`),
    `L ${toX(data.length - 1)} ${H}`,
    `L 0 ${H}`,
    "Z"
  ].join(" ");

  const totalPaid = data.reduce((s, d) => s + (d.trigger?.payout || 0), 0);
  const totalEarned = data.reduce((s, d) => s + d.actual, 0);
  const triggerDays = data.filter(d => d.trigger).length;

  return (
    <div style={{ fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>
      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          ["This week", `₹${totalEarned.toLocaleString("en-IN")}`, "#f0f7f4"],
          ["Zenvest paid", `₹${totalPaid}`, "#14a882"],
          ["Trigger days", `${triggerDays} of 7`, "#e8a048"],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#5a7a6e", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: "var(--font-display, 'Syne', sans-serif)" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <svg
          viewBox={`0 0 100 ${H + 4}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: H + 4, display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14a882" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#14a882" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaPath} fill="url(#earnGrad)" />

          {/* Expected baseline dashed */}
          <path d={expectedPath} stroke="#3d5a4e" strokeWidth="0.5" strokeDasharray="2,1.5" fill="none" />

          {/* Actual line */}
          <path d={actualPath} stroke="#14a882" strokeWidth="1.2" fill="none" strokeLinejoin="round" strokeLinecap="round" />

          {/* Trigger dip shading */}
          {data.map((d, i) => {
            if (!d.trigger) return null;
            const x = toX(i);
            const yActual = toY(d.actual);
            const yExpected = toY(d.expected);
            return (
              <rect
                key={i}
                x={x - 5}
                width={10}
                y={Math.min(yActual, yExpected)}
                height={Math.abs(yExpected - yActual)}
                fill={d.trigger.color}
                fillOpacity="0.12"
                rx="1"
              />
            );
          })}

          {/* Data points */}
          {data.map((d, i) => {
            const x = toX(i);
            const y = toY(d.actual);
            const isHov = hovered === i;
            return (
              <g key={i}>
                <circle
                  cx={x} cy={y} r={isHov ? 2.5 : 1.8}
                  fill={d.trigger ? d.trigger.color : "#14a882"}
                  stroke={isHov ? "#fff" : "none"}
                  strokeWidth="0.5"
                  style={{ cursor: "pointer", transition: "r 0.15s" }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
                {/* Trigger icon */}
                {d.trigger && (
                  <text x={x} y={y - 4} textAnchor="middle" fontSize="5" style={{ userSelect: "none" }}>
                    {d.trigger.icon}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered !== null && (
          <div style={{
            position: "absolute",
            left: `calc(${toX(hovered)}% - 55px)`,
            top: 0,
            background: "#0d1a14",
            border: "1px solid #1e3829",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            color: "#d4ede7",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            minWidth: 110,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>{data[hovered].label}</div>
            <div style={{ color: "#5a7a6e" }}>Earned: <span style={{ color: "#f0f7f4" }}>₹{data[hovered].actual}</span></div>
            <div style={{ color: "#5a7a6e" }}>Expected: <span style={{ color: "#f0f7f4" }}>₹{data[hovered].expected}</span></div>
            {data[hovered].trigger && (
              <div style={{ color: data[hovered].trigger.color, marginTop: 4, fontSize: 11 }}>
                {data[hovered].trigger.icon} +₹{data[hovered].trigger.payout} payout
              </div>
            )}
          </div>
        )}
      </div>

      {/* Day labels */}
      <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "1%", paddingRight: "1%", marginBottom: 12 }}>
        {data.map((d, i) => (
          <div key={i} style={{ fontSize: 10, color: d.trigger ? "#e8a048" : "#3d5a4e", fontWeight: d.trigger ? 700 : 400, textAlign: "center", flex: 1 }}>
            {d.label}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { color: "#14a882",  label: "Actual earnings", dashed: false },
          { color: "#3d5a4e",  label: "Expected baseline", dashed: true },
          { color: "#3b8ef8",  label: "Rain trigger", dashed: false },
          { color: "#e8a048",  label: "Dead zone trigger", dashed: false },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 18, height: 2,
              background: item.dashed ? "none" : item.color,
              borderTop: item.dashed ? `2px dashed ${item.color}` : "none",
              borderRadius: 1,
            }} />
            <span style={{ fontSize: 10, color: "#5a7a6e" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}