
import React from "react";
import { useState } from "react";

const KNOWN_ZONES = {
  "560034": "Koramangala, Bengaluru",
  "560095": "Indiranagar, Bengaluru",
  "560068": "JP Nagar, Bengaluru",
  "600042": "Velachery, Chennai",
  "600091": "Adyar, Chennai",
  "600040": "T. Nagar, Chennai",
  "400053": "Andheri West, Mumbai",
  "400069": "Powai, Mumbai",
  "400050": "Bandra, Mumbai",
  "110075": "Dwarka, Delhi",
  "110001": "Connaught Place, Delhi",
  "500032": "Kondapur, Hyderabad",
};

export default function Screen2ZoneSetup({ formData, updateForm, onBack, onNext }) {
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [zoneName, setZoneName] = useState("");

  const handlePinChange = (val) => {
    const pin = val.replace(/\D/g, "").slice(0, 6);
    updateForm({ pinCode: pin });
    setZoneName(KNOWN_ZONES[pin] || (pin.length === 6 ? "Zone detected" : ""));
  };

  const validate = () => {
    const e = {};
    if (formData.pinCode.length !== 6) e.pinCode = "Enter a valid 6-digit pin code";
    if (!formData.workStart) e.workStart = "Required";
    if (!formData.workEnd) e.workEnd = "Required";
    if (formData.workStart && formData.workEnd && formData.workStart >= formData.workEnd)
      e.workEnd = "End time must be after start time";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/risk-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          platform: formData.platform,
          pin_code: formData.pinCode,
          work_start: formData.workStart,
          work_end: formData.workEnd,
        }),
      });
      const data = await res.json();
      onNext(data);
    } catch {
      // Fallback mock if backend not running
      const mockQuote = getMockQuote(formData.pinCode, formData.workStart, formData.workEnd);
      onNext(mockQuote);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-card">
      <div className="screen-header">
        <div className="screen-eyebrow">Step 2 of 3</div>
        <h1 className="screen-title">Your work zone</h1>
        <p className="screen-subtitle">
          We use your pin code and hours to calculate your personalised risk score — down to the street level.
        </p>
      </div>

      <div className="field-group">
        <div className="field">
          <label>Dark Store Pin Code</label>
          <input
            type="text"
            placeholder="6-digit pin code"
            value={formData.pinCode}
            onChange={(e) => handlePinChange(e.target.value)}
          />
          {zoneName && (
            <span style={{ fontSize: 12, color: "var(--teal)", marginTop: -4 }}>
              📍 {zoneName}
            </span>
          )}
          {errors.pinCode && <span className="field-error">{errors.pinCode}</span>}
        </div>

        <div className="field">
          <label>Working Hours</label>
          <div className="time-row">
            <div className="field">
              <label>Start</label>
              <input
                type="time"
                value={formData.workStart}
                onChange={(e) => updateForm({ workStart: e.target.value })}
              />
              {errors.workStart && <span className="field-error">{errors.workStart}</span>}
            </div>
            <div className="field">
              <label>End</label>
              <input
                type="time"
                value={formData.workEnd}
                onChange={(e) => updateForm({ workEnd: e.target.value })}
              />
              {errors.workEnd && <span className="field-error">{errors.workEnd}</span>}
            </div>
          </div>
        </div>

        <div style={{
          background: "var(--teal-soft)",
          border: "1px solid rgba(20,168,130,0.2)",
          borderRadius: "var(--radius-sm)",
          padding: "14px 16px",
          fontSize: 13,
          color: "var(--muted)",
          lineHeight: 1.5
        }}>
          🔒 Your location data is only used to calculate zone-level disruption risk. We never share individual worker locations.
        </div>
      </div>

      <div className="btn-row">
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <button
          className={`btn-primary ${loading ? "loading" : ""}`}
          onClick={handleNext}
          disabled={loading}
        >
          {loading ? "Calculating risk..." : "Get My Quote →"}
        </button>
      </div>

      <div className="brand-footer">Zenvest · Where your income finds stability</div>
    </div>
  );
}

// Fallback mock if backend is offline
function getMockQuote(pinCode, workStart, workEnd) {
  const highRiskPins = ["560034", "400053", "600042"];
  const lowRiskPins = ["560095", "110001", "500032"];

  let riskTier = "medium";
  let riskScore = 5;
  if (highRiskPins.includes(pinCode)) { riskTier = "high"; riskScore = 8; }
  if (lowRiskPins.includes(pinCode)) { riskTier = "low"; riskScore = 3; }

  const startH = parseInt(workStart?.split(":")?.[0] ?? 8);
  const endH = parseInt(workEnd?.split(":")?.[0] ?? 20);
  const activeHours = endH - startH;

  const tiers = [
    { name: "Basic", weekly_premium: 29, max_payout: 400, events: 2 },
    { name: "Standard", weekly_premium: 49, max_payout: 800, events: 4 },
    { name: "Pro", weekly_premium: 79, max_payout: 1500, events: -1 },
  ];

  const multiplier = riskTier === "high" ? 1.2 : riskTier === "low" ? 0.85 : 1.0;
  const adjustedTiers = tiers.map((t) => ({
    ...t,
    weekly_premium: Math.round(t.weekly_premium * multiplier),
  }));

  const recommended = riskTier === "high" ? "Pro" : riskTier === "low" ? "Basic" : "Standard";

  return {
    risk_tier: riskTier,
    risk_score: riskScore,
    zone_name: KNOWN_ZONES[pinCode] || "Your Zone",
    active_hours: activeHours,
    tiers: adjustedTiers,
    recommended_tier: recommended,
    disruption_frequency: riskTier === "high" ? "3–4×/month" : riskTier === "low" ? "0–1×/month" : "1–2×/month",
  };
}