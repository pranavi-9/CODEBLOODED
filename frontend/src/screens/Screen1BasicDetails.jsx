import React from "react";
import { useState } from "react";


export default function Screen1BasicDetails({ formData, updateForm, onNext }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = "Name is required";
    if (!/^[6-9]\d{9}$/.test(formData.phone)) e.phone = "Enter a valid 10-digit Indian mobile number";
    if (!formData.platform) e.platform = "Please select your delivery platform";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  return (
    <div className="screen-card">
      <div className="screen-header">
        <div className="screen-eyebrow">Step 1 of 3</div>
        <h1 className="screen-title">Tell us about yourself</h1>
        <p className="screen-subtitle">We'll use this to set up your protection profile.</p>
      </div>

      <div className="field-group">
        <div className="field">
          <label>Full Name</label>
          <input
            type="text"
            placeholder="e.g. Ravi Kumar"
            value={formData.name}
            onChange={(e) => updateForm({ name: e.target.value })}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="field">
          <label>Mobile Number</label>
          <input
            type="tel"
            placeholder="10-digit mobile number"
            maxLength={10}
            value={formData.phone}
            onChange={(e) => updateForm({ phone: e.target.value.replace(/\D/g, "") })}
          />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>

        <div className="field">
          <label>Your Delivery Platform</label>
          <div className="platform-picker">
            {["Zepto", "Blinkit"].map((p) => (
              <button
                key={p}
                className={`platform-btn ${formData.platform === p ? "selected" : ""}`}
                onClick={() => updateForm({ platform: p })}
                type="button"
              >
                <span className="platform-icon">{p === "Zepto" ? "⚡" : "🟡"}</span>
                {p}
              </button>
            ))}
          </div>
          {errors.platform && <span className="field-error">{errors.platform}</span>}
        </div>
      </div>

      <button className="btn-primary" onClick={handleNext}>
        Continue →
      </button>

      <div className="brand-footer">Zenvest · Where your income finds stability</div>
    </div>
  );
}