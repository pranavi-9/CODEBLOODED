import React, { useState } from "react";
import Screen1BasicDetails from "./screens/Screen1BasicDetails";
import Screen2ZoneSetup from "./screens/Screen2ZoneSetup";
import Screen3Quote from "./screens/Screen3Quote";
import PolicyDashboard from "./screens/PolicyDashboard";
import "./App.css";

export default function App() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    platform: "",
    pinCode: "",
    workStart: "",
    workEnd: "",
  });
  const [quoteData, setQuoteData]     = useState(null);
  const [workerId, setWorkerId]       = useState(null);

  const updateForm = (fields) =>
    setFormData((prev) => ({ ...prev, ...fields }));

  return (
    <div className="app-shell">
      <ProgressBar step={step} />

      {step === 1 && (
        <Screen1BasicDetails
          formData={formData}
          updateForm={updateForm}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Screen2ZoneSetup
          formData={formData}
          updateForm={updateForm}
          onBack={() => setStep(1)}
          onNext={(quote) => {
            setQuoteData(quote);
            setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <Screen3Quote
          formData={formData}
          quoteData={quoteData}
          onBack={() => setStep(2)}
          onActivated={(id) => {
            setWorkerId(id);
            setStep(4);
          }}
        />
      )}

      {step === 4 && (
        <PolicyDashboard
          workerId={workerId}
          workerName={formData.name}
        />
      )}
    </div>
  );
}

function ProgressBar({ step }) {
  const labels = ["Details", "Zone", "Quote", "Policy"];

  return (
    <div className="progress-bar">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={`progress-step ${step >= s ? "active" : ""} ${step === s ? "current" : ""}`}
        >
          <div className="step-dot">{step > s ? "✓" : s}</div>
          <span>{labels[s - 1]}</span>
        </div>
      ))}
      <div className="progress-line">
        <div
          className="progress-fill"
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}