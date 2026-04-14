import React from "react";
import { useState } from "react";
import RiskProfileCard from "./RiskProfileCard";

export default function Screen3Quote({ formData, quoteData, onBack, onActivated }) {
  const [selectedTier, setSelectedTier] = useState(quoteData?.recommended_tier || "Standard");
  const [activated, setActivated] = useState(false);
  const [activating, setActivating] = useState(false);

  const riskColors = { low: "low", medium: "medium", high: "high" };
  const riskEmoji = { low: "🟢", medium: "🟡", high: "🔴" };
  const tier = quoteData?.tiers?.find((t) => t.name === selectedTier);

  const handleActivate = async () => {
    setActivating(true);
    let workerId = null;
    try {
      const res = await fetch("http://localhost:8000/api/activate-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.phone,
          name: formData.name,
          tier: selectedTier,
          weekly_premium: tier?.weekly_premium,
          pin_code: formData.pinCode,
        }),
      });
      const data = await res.json();
      if (data.worker_id) {
        workerId = data.worker_id;
      }
    } catch {
      // Backend offline — simulate success with a local ID
      workerId = "LOCAL-" + formData.phone.slice(-4);
    }
    setTimeout(() => {
      setActivating(false);
      setActivated(true);
      // After 2 seconds on the success screen, move to Policy Dashboard
      setTimeout(() => {
        if (onActivated) onActivated(workerId);
      }, 2000);
    }, 1500);
  };

  if (activated) {
    return <SuccessScreen formData={formData} tier={tier} selectedTier={selectedTier} />;
  }

  return (
    <div className="screen-card">
      <div className="screen-header">
        <div className="screen-eyebrow">Step 3 of 4</div>
        <h1 className="screen-title">Your personalised quote</h1>
        <p className="screen-subtitle">
          Based on your zone and hours, here's what Zenvest recommends for you.
        </p>
      </div>

      {/* AI Risk Profile Card */}
      <RiskProfileCard quoteData={quoteData} />

      {/* Tier Selection */}
      <div className="field">
        <label>Choose Your Coverage Tier</label>
        <div className="quote-tiers">
          {quoteData?.tiers?.map((t) => (
            <div
              key={t.name}
              className={`tier-option ${t.name === quoteData.recommended_tier ? "recommended" : ""} ${selectedTier === t.name ? "selected" : ""}`}
              onClick={() => setSelectedTier(t.name)}
              style={selectedTier === t.name && t.name !== quoteData.recommended_tier ? {
                borderColor: "var(--teal-dim)",
                background: "var(--teal-soft)"
              } : {}}
            >
              {t.name === quoteData.recommended_tier && (
                <span className="recommended-tag">Recommended</span>
              )}
              <div>
                <div className="tier-name">{t.name}</div>
                <div className="tier-detail">
                  {t.events === -1 ? "Unlimited" : `Up to ${t.events}`} events/week · Max ₹{t.max_payout}
                </div>
              </div>
              <div className="tier-price">
                <div className="price">₹{t.weekly_premium}</div>
                <div className="per">/week</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Tier Summary */}
      {tier && (
        <div className="quote-card" style={{ gap: 12 }}>
          <div className="quote-row">
            <span>Weekly Premium</span>
            <strong style={{ color: "var(--teal)" }}>₹{tier.weekly_premium}</strong>
          </div>
          <div className="divider" />
          <div className="quote-row">
            <span>Maximum Weekly Payout</span>
            <strong>₹{tier.max_payout}</strong>
          </div>
          <div className="quote-row">
            <span>Claim Filing Required</span>
            <strong style={{ color: "var(--teal)" }}>Never — fully automatic</strong>
          </div>
        </div>
      )}

      <div className="btn-row">
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <button
          className={`btn-primary ${activating ? "loading" : ""}`}
          onClick={handleActivate}
          disabled={activating}
        >
          {activating ? "Activating..." : "Activate My Policy →"}
        </button>
      </div>

      <div className="brand-footer">Zenvest · Where your income finds stability</div>
    </div>
  );
}

function SuccessScreen({ formData, tier, selectedTier }) {
  return (
    <div className="screen-card" style={{ textAlign: "center", gap: 24, alignItems: "center" }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "var(--teal-soft)", border: "2px solid var(--teal)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36, boxShadow: "0 0 40px rgba(20,168,130,0.3)",
        animation: "slideUp 0.5s ease"
      }}>
        ✓
      </div>

      <div>
        <div className="screen-eyebrow" style={{ textAlign: "center" }}>You're protected</div>
        <h1 className="screen-title" style={{ textAlign: "center", fontSize: 28 }}>
          Welcome to Zenvest, {formData.name.split(" ")[0]}!
        </h1>
        <p className="screen-subtitle" style={{ textAlign: "center", marginTop: 10 }}>
          Your {selectedTier} policy is now active. We're watching your zone 24/7.
        </p>
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
          Taking you to your dashboard...
        </p>
      </div>

      <div className="quote-card" style={{ width: "100%", gap: 14 }}>
        <div className="quote-row">
          <span>Coverage Tier</span>
          <strong style={{ color: "var(--teal)" }}>{selectedTier}</strong>
        </div>
        <div className="divider" />
        <div className="quote-row">
          <span>Weekly Premium</span>
          <strong>₹{tier?.weekly_premium}</strong>
        </div>
        <div className="quote-row">
          <span>Max Payout This Week</span>
          <strong>₹{tier?.max_payout}</strong>
        </div>
        <div className="quote-row">
          <span>Auto-renews</span>
          <strong>Every Monday</strong>
        </div>
        <div className="divider" />
        <div className="quote-row">
          <span>Next premium deduction</span>
          <strong>Next Monday</strong>
        </div>
      </div>

      <div className="success-strip" style={{ width: "100%" }}>
        <span className="success-icon">🔔</span>
        <span>You'll get a WhatsApp alert at <strong>{formData.phone}</strong> if a payout is triggered. No action needed.</span>
      </div>

      <div className="brand-footer">Zenvest · Where your income finds stability</div>
    </div>
  );
}