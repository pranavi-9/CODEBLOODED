import React, { useEffect, useState } from "react";
import "./PolicyDashboard.css";
import TriggerSimMap from "./TriggerSimMap";
import EarningsTimeline from "./EarningsTimeline";

export default function PolicyDashboard({ workerId = "W001" }) {
  const [policy,   setPolicy]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [showAdmin,setShowAdmin]= useState(false);

  const fetchPolicy = () => {
    setLoading(true);
    fetch(`http://localhost:8000/policy/${workerId}`)
      .then(r=>r.json()).then(d=>{setPolicy(d);setLoading(false);})
      .catch(()=>setLoading(false));
  };

  useEffect(()=>{fetchPolicy();},[workerId]);

  const triggerDemo = async () => {
    setClaiming(true); setClaimMsg("");
    try {
      const r    = await fetch("http://localhost:8000/claims/process-demo",{method:"POST"});
      const data = await r.json();
      const res  = data.demo_claim?.results || [];
      const paid = res.filter(r=>r.decision==="auto_approve"||r.decision==="pay_and_flag");
      if(paid.length>0){
        setClaimMsg(`✓ ₹${paid[0].payout} credited to your UPI · Ref: ${paid[0].razorpay_ref} · Fraud score: ${paid[0].fraud_score}/100 (${paid[0].decision.replace(/_/g," ")})`);
      } else {
        setClaimMsg("Dead Zone detected — no shortfall confirmed for your zone today.");
      }
      setTimeout(fetchPolicy, 1500);
    } catch { setClaimMsg("Could not connect to backend."); }
    setClaiming(false);
  };

  if(loading) return <div className="pd-loading">Loading your policy...</div>;
  if(!policy) return <div className="pd-loading">Could not load policy.</div>;

  const usedPct = Math.min(100, Math.round((policy.coverage_used/policy.max_payout)*100));

  if(showAdmin){
    const AdminDashboard = React.lazy(()=>import("./AdminDashboard"));
    return (
      <React.Suspense fallback={<div className="pd-loading">Loading admin...</div>}>
        <div style={{position:"relative"}}>
          <button onClick={()=>setShowAdmin(false)}
            style={{position:"absolute",top:16,right:16,background:"transparent",
              border:"1px solid #1e3829",color:"#5a7a6e",borderRadius:8,
              padding:"6px 12px",cursor:"pointer",fontSize:12}}>
            ← Worker View
          </button>
          <AdminDashboard/>
        </div>
      </React.Suspense>
    );
  }

  return (
    <div className="pd-wrap">
      <div className="pd-header">
        <div>
          <div className="pd-brand">Zenvest</div>
          <div className="pd-sub">Active Policy</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span className="pd-badge">● Protected</span>
          <button className="pd-admin-btn" onClick={()=>setShowAdmin(true)}>Admin ↗</button>
        </div>
      </div>

      <div className="pd-card">
        {[
          ["Zone",           policy.zone],
          ["Coverage tier",  policy.tier.charAt(0).toUpperCase()+policy.tier.slice(1)],
          ["Weekly premium", `₹${policy.weekly_premium}`],
          ["Max payout",     `₹${policy.max_payout} / week`],
          ["Days remaining", `${policy.days_remaining} days`],
        ].map(([label,value])=>(
          <div className="pd-row" key={label}>
            <span className="pd-label">{label}</span>
            <span className="pd-value">{value}</span>
          </div>
        ))}
      </div>

      <div className="pd-progress-wrap">
        <div className="pd-progress-top">
          <span>Protection used</span>
          <span className="pd-teal">₹{policy.coverage_used} / ₹{policy.max_payout}</span>
        </div>
        <div className="pd-track">
          <div className="pd-fill" style={{width:`${usedPct}%`}}/>
        </div>
      </div>

      <div className="pd-history">
        <div className="pd-history-title">Payout history</div>
        {policy.payout_history && policy.payout_history.length > 0 ? (
          policy.payout_history.map((item,i)=>(
            <div className="pd-history-row" key={i}>
              <div className="pd-history-left">
                <span className="pd-date">{item.date}</span>
                <span className="pd-trigger">{item.trigger}</span>
                {item.ref && <span className="pd-ref">{item.ref}</span>}
              </div>
              <span className={`pd-amount ${item.status}`}>
                {item.status==="paid"?`+₹${item.amount} ✓`:"₹0 — no shortfall"}
              </span>
            </div>
          ))
        ) : (
          <div className="pd-empty">No payouts yet this week. Zone monitored 24/7.</div>
        )}
      </div>

      {claimMsg && <div className="pd-claim-msg">{claimMsg}</div>}

      {/* Earnings timeline chart */}
      <div style={{ background: "rgba(20,168,130,0.04)", border: "1px solid #1e3829", borderRadius: 12, padding: "16px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#8a9490", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
          This week's earnings
        </div>
        <EarningsTimeline expectedDaily={policy.max_payout === 1500 ? 1100 : policy.max_payout === 400 ? 700 : 900} />
      </div>

      {/* Live trigger simulation */}
      <div style={{ background: "rgba(20,168,130,0.04)", border: "1px solid #1e3829", borderRadius: 12, padding: "16px 14px", marginBottom: 12 }}>
        <TriggerSimMap />
      </div>

      <button className="pd-demo-btn" onClick={triggerDemo} disabled={claiming}>
        {claiming?"Processing claim...":"⚡ Simulate Dead Zone Payout (Demo)"}
      </button>

      <button className="pd-renew" onClick={()=>alert("Policy renewed for next week!")}>
        Renew — ₹{policy.weekly_premium} next week
      </button>
    </div>
  );
}