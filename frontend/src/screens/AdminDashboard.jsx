import React, { useEffect, useState } from "react";

const BASE = "http://localhost:8000";

const teal   = "#14a882";
const dark   = "#0d1f1a";
const surf   = "#111f18";
const surf2  = "#172a20";
const bord   = "#1e3829";
const muted  = "#5a7a6e";
const white  = "#f0f7f4";
const amber  = "#e8a048";
const red    = "#e05a5a";

const s = {
  wrap:  { minHeight:"100vh", background:dark, color:white, fontFamily:"'DM Sans',sans-serif", padding:"24px 20px" },
  h1:    { fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, color:white, marginBottom:4, letterSpacing:"-0.5px" },
  sub:   { fontSize:13, color:muted, marginBottom:28 },
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 },
  grid4: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 },
  card:  { background:surf, border:`1px solid ${bord}`, borderRadius:14, padding:"18px 20px" },
  ch:    { fontSize:11, color:muted, textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 },
  cv:    { fontSize:26, fontWeight:700, color:white, fontFamily:"'Syne',sans-serif" },
  cs:    { fontSize:12, color:muted, marginTop:2 },
  sech:  { fontSize:14, fontWeight:600, color:teal, marginBottom:14, textTransform:"uppercase", letterSpacing:"1px" },
  row:   { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${bord}`, fontSize:13 },
  badge: (c) => ({ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:4,
                   background: c==="auto_approve"?"rgba(20,168,130,0.15)": c==="pay_and_flag"?"rgba(232,160,72,0.15)":"rgba(224,90,90,0.15)",
                   color: c==="auto_approve"?teal: c==="pay_and_flag"?amber:red }),
  btn:   { background:teal, color:dark, border:"none", borderRadius:8, padding:"10px 18px",
           fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Syne',sans-serif" },
  btnO:  { background:"transparent", color:teal, border:`1px solid ${teal}`, borderRadius:8,
           padding:"10px 18px", fontWeight:600, fontSize:13, cursor:"pointer" },
  tag:   (hi) => ({ fontSize:11, padding:"2px 8px", borderRadius:4, fontWeight:600,
                    background: hi?"rgba(224,90,90,0.15)":"rgba(20,168,130,0.15)",
                    color: hi?red:teal }),
};

export default function AdminDashboard() {
  const [summary,  setSummary]  = useState(null);
  const [stats,    setStats]    = useState(null);
  const [claims,   setClaims]   = useState([]);
  const [workers,  setWorkers]  = useState([]);
  const [simMsg,   setSimMsg]   = useState("");
  const [simming,  setSimming]  = useState(false);
  const [loading,  setLoading]  = useState(true);

  const fetchAll = async () => {
    try {
      const [s1, s2, s3, s4] = await Promise.all([
        fetch(`${BASE}/policy-summary`).then(r=>r.json()),
        fetch(`${BASE}/claims/stats`).then(r=>r.json()),
        fetch(`${BASE}/claims/history?limit=10`).then(r=>r.json()),
        fetch(`${BASE}/api/workers`).then(r=>r.json()),
      ]);
      setSummary(s1); setStats(s2);
      setClaims(s3.claims || []); setWorkers(Array.isArray(s4)?s4:[]);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const simulateDemo = async () => {
    setSimming(true); setSimMsg("");
    try {
      const r    = await fetch(`${BASE}/claims/process-demo`, {method:"POST"});
      const data = await r.json();
      const res  = data.demo_claim?.results || [];
      const paid = res.filter(r=>r.decision==="auto_approve"||r.decision==="pay_and_flag");
      setSimMsg(paid.length>0
        ? `✓ Dead Zone payout processed! ₹${paid[0].payout} → ${paid[0].razorpay_ref}. Fraud score: ${paid[0].fraud_score}/100.`
        : "Dead Zone detected — no workers in zone or no shortfall confirmed.");
      setTimeout(fetchAll, 1500);
    } catch { setSimMsg("Backend not reachable."); }
    setSimming(false);
  };

  const lossRatio = summary?.loss_ratio || 0;
  const lossColor = lossRatio > 70 ? red : lossRatio > 50 ? amber : teal;

  if (loading) return <div style={{...s.wrap, display:"flex", alignItems:"center", justifyContent:"center"}}>
    <span style={{color:muted}}>Loading admin dashboard...</span></div>;

  return (
    <div style={s.wrap}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28}}>
        <div>
          <div style={s.h1}>Zenvest Admin</div>
          <div style={s.sub}>Insurer dashboard — live loss ratios, claim analytics, fraud overview</div>
        </div>
        <div style={{display:"flex", gap:10}}>
          <button style={s.btnO} onClick={fetchAll}>↻ Refresh</button>
          <button style={s.btn} onClick={simulateDemo} disabled={simming}>
            {simming ? "Processing..." : "⚡ Simulate Dead Zone"}
          </button>
        </div>
      </div>

      {simMsg && (
        <div style={{background:"rgba(20,168,130,0.08)", border:`1px solid rgba(20,168,130,0.25)`,
          borderRadius:10, padding:"12px 16px", fontSize:13, color:teal, marginBottom:20}}>
          {simMsg}
        </div>
      )}

      {/* KPI row */}
      <div style={s.grid4}>
        {[
          ["Active Workers",     summary?.total_workers || 0,                    "policies this week"],
          ["Premiums Collected", `₹${summary?.total_premium_collected || 0}`,   "this week"],
          ["Total Paid Out",     `₹${summary?.total_claimed || 0}`,             "in claims"],
          ["Loss Ratio",         `${lossRatio}%`,                               "target < 60%"],
        ].map(([label, val, sub]) => (
          <div key={label} style={s.card}>
            <div style={s.ch}>{label}</div>
            <div style={{...s.cv, color: label==="Loss Ratio"?lossColor:white}}>{val}</div>
            <div style={s.cs}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={s.grid2}>
        {/* Claims breakdown */}
        <div style={s.card}>
          <div style={s.sech}>Claims breakdown</div>
          {[
            ["Auto approved",   stats?.auto_approved  || 0, teal],
            ["Pay & flag",      stats?.flagged        || 0, amber],
            ["Hold & verify",   stats?.held           || 0, red],
            ["No shortfall",    stats?.no_shortfall   || 0, muted],
            ["Total processed", stats?.total          || 0, white],
          ].map(([label, val, color]) => (
            <div key={label} style={s.row}>
              <span style={{color:muted}}>{label}</span>
              <span style={{fontWeight:600, color}}>{val}</span>
            </div>
          ))}
          <div style={{...s.row, borderBottom:"none", marginTop:8}}>
            <span style={{color:muted}}>Avg fraud score</span>
            <span style={{fontWeight:600, color: (stats?.avg_fraud_score||0)>50?amber:teal}}>
              {stats?.avg_fraud_score || 0} / 100
            </span>
          </div>
        </div>

        {/* Tier breakdown */}
        <div style={s.card}>
          <div style={s.sech}>Policy tiers</div>
          {[
            ["Basic (₹29/week)",    summary?.tier_breakdown?.basic    || 0],
            ["Standard (₹49/week)", summary?.tier_breakdown?.standard || 0],
            ["Pro (₹79/week)",      summary?.tier_breakdown?.pro      || 0],
          ].map(([label, val]) => {
            const total = (summary?.total_workers || 1);
            const pct   = Math.round((val/total)*100);
            return (
              <div key={label} style={{marginBottom:14}}>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5}}>
                  <span style={{color:muted}}>{label}</span>
                  <span style={{color:white, fontWeight:600}}>{val} workers</span>
                </div>
                <div style={{height:6, background:bord, borderRadius:3, overflow:"hidden"}}>
                  <div style={{width:`${pct}%`, height:"100%", background:teal, borderRadius:3, transition:"width 0.6s"}}/>
                </div>
              </div>
            );
          })}
          <div style={{...s.row, borderBottom:"none", marginTop:8}}>
            <span style={{color:muted}}>Total premium / week</span>
            <span style={{fontWeight:700, color:teal}}>₹{summary?.total_premium_collected || 0}</span>
          </div>
        </div>
      </div>

      {/* Recent claims */}
      <div style={{...s.card, marginBottom:20}}>
        <div style={s.sech}>Recent processed claims</div>
        {claims.length === 0 ? (
          <div style={{fontSize:13, color:muted, fontStyle:"italic"}}>
            No claims processed yet. Click "Simulate Dead Zone" to create one.
          </div>
        ) : claims.map((c, i) => (
          <div key={i} style={s.row}>
            <div style={{display:"flex", flexDirection:"column", gap:2}}>
              <span style={{fontSize:13, color:white}}>{c.trigger_type?.replace(/_/g," ") || "—"}</span>
              <span style={{fontSize:11, color:muted}}>Zone {c.zone_id} · Worker {c.worker_id}</span>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <span style={{fontSize:13, fontWeight:600, color:c.payout_amount>0?teal:muted}}>
                {c.payout_amount>0?`₹${Math.round(c.payout_amount)}`:"₹0"}
              </span>
              <span style={s.badge(c.decision)}>{c.decision?.replace(/_/g," ")}</span>
              <span style={{...s.tag(c.fraud_score>50), minWidth:60, textAlign:"center"}}>
                Score {c.fraud_score}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Workers table */}
      <div style={s.card}>
        <div style={s.sech}>Active workers</div>
        {workers.length === 0 ? (
          <div style={{fontSize:13, color:muted, fontStyle:"italic"}}>No workers registered yet.</div>
        ) : workers.map((w, i) => (
          <div key={i} style={s.row}>
            <div style={{display:"flex", flexDirection:"column", gap:2}}>
              <span style={{fontSize:13, color:white}}>{w.worker_id}</span>
              <span style={{fontSize:11, color:muted}}>Pin {w.pin_code} · {w.tier} · ₹{w.weekly_premium}/wk</span>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <span style={{fontSize:13, color:teal, fontWeight:600}}>₹{w.total_claimed || 0} claimed</span>
              <span style={{fontSize:11, padding:"2px 8px", borderRadius:4,
                background:"rgba(20,168,130,0.1)", color:teal}}>{w.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{textAlign:"center", marginTop:28, fontSize:12, color:"#2d5a4e", fontStyle:"italic"}}>
        Zenvest · CodeBlooded · Guidewire DEVTrails 2026
      </div>
    </div>
  );
}
