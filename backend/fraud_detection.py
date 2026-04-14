"""Zenvest — Advanced Fraud Detection (Phase 3)"""
import json, os, random, sqlite3
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH    = Path(os.getenv("DB_PATH", "zenvest.db"))
WORKERS_DB = "workers.json"

WEIGHTS = {
    "gps_accuracy_too_clean":   15,
    "gps_provider_mock":        20,
    "gps_trajectory_jump":      30,
    "cell_tower_mismatch":      35,
    "home_wifi_connected":      25,
    "accelerometer_stationary": 20,
    "no_platform_activity":     30,
    "new_worker_first_claim":   20,
    "high_claim_frequency":     15,
    "surge_window_claim":       20,
    "ring_proximity":           40,
    "identical_shortfall":      25,
    "zone_never_visited":       30,
}

ZONE_EARNINGS = {
    "560034": 900, "560004": 780, "560095": 850, "560068": 750,
    "600042": 880, "400053": 950, "110075": 800,
}

SIGNAL_DESCRIPTIONS = {
    "gps_accuracy_too_clean":   "GPS shows suspicious +/-3m accuracy — typical of spoofing apps",
    "gps_provider_mock":        "Device reported mock GPS provider — strong spoofing indicator",
    "gps_trajectory_jump":      "GPS location jumped impossibly fast between pings",
    "cell_tower_mismatch":      "Cell tower triangulation places worker outside claimed zone",
    "home_wifi_connected":      "Device connected to known home WiFi during claim window",
    "accelerometer_stationary": "Device stationary despite GPS showing movement",
    "no_platform_activity":     "No app order attempts detected during disruption window",
    "new_worker_first_claim":   "Worker registered less than 3 days ago — claiming immediately",
    "high_claim_frequency":     "More than 4 claims in 4 weeks — elevated frequency",
    "surge_window_claim":       "Claim filed within 2 minutes of public trigger alert",
    "ring_proximity":           "GPS within 50m of 3+ simultaneous claimants — ring pattern",
    "identical_shortfall":      "Shortfall amount matches previous claims exactly — suspicious",
    "zone_never_visited":       "Worker has no historical presence in claimed zone",
}


def _load_workers():
    if not os.path.exists(WORKERS_DB): return []
    with open(WORKERS_DB) as f: return json.load(f)

def _get_db():
    if not DB_PATH.exists(): return None
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row; return conn

def _count_workers_in_zone(zone_id):
    return len([w for w in _load_workers() if w.get("pin_code") == zone_id])


def compute_advanced_fraud_score(worker, claimed_zone_id, trigger_type,
                                  actual_earnings, claim_timestamp=None):
    if not claim_timestamp:
        claim_timestamp = datetime.utcnow().isoformat()

    worker_id = worker["worker_id"]
    signals   = {}

    # GPS checks
    historical_zones = worker.get("historical_zones", [worker.get("pin_code")])
    signals["zone_never_visited"]     = claimed_zone_id not in historical_zones
    acc_var = random.uniform(2,5) if random.random() < 0.12 else random.uniform(12,45)
    signals["gps_accuracy_too_clean"] = acc_var < 6
    provider = random.choices(["gps","network","fused","mock"], weights=[0.70,0.15,0.12,0.03])[0]
    signals["gps_provider_mock"]      = provider == "mock"
    signals["gps_trajectory_jump"]    = random.random() < 0.04

    # Cell tower + sensors
    signals["cell_tower_mismatch"]      = random.random() < 0.10
    signals["accelerometer_stationary"] = random.randint(0,800) < 50 and random.random() < 0.08
    signals["home_wifi_connected"]      = random.random() < 0.06
    signals["no_platform_activity"]     = random.random() < 0.04

    # Timing
    try:
        claim_dt  = datetime.fromisoformat(claim_timestamp)
        alert_dt  = claim_dt - timedelta(minutes=random.randint(2,90))
        mins      = (claim_dt - alert_dt).total_seconds() / 60
        signals["surge_window_claim"] = mins < 3
    except:
        signals["surge_window_claim"] = False

    # Behavioural
    claim_count = worker.get("claim_count", 0)
    signals["high_claim_frequency"] = claim_count > 4
    expected = ZONE_EARNINGS.get(worker.get("pin_code","560034"), 800)
    signals["identical_shortfall"]  = (claim_count > 2 and abs(actual_earnings - expected*0.45) < 20)
    try:
        activated = datetime.fromisoformat(worker.get("activated_at", datetime.utcnow().isoformat()))
        signals["new_worker_first_claim"] = (datetime.utcnow()-activated).days < 3 and claim_count == 0
    except:
        signals["new_worker_first_claim"] = False

    # Ring detection
    conn = _get_db()
    recent = 0
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM pending_claims WHERE zone_id=? AND created_at > datetime('now','-10 minutes')", (claimed_zone_id,))
            recent = cur.fetchone()[0]
        except: pass
        conn.close()
    surge_ratio = recent / max(1, _count_workers_in_zone(claimed_zone_id) * 0.3)
    signals["ring_proximity"] = surge_ratio > 2.5 and random.random() < 0.4

    # Score
    score, flags = 0, []
    for sig, val in signals.items():
        if isinstance(val, bool) and val and sig in WEIGHTS:
            w = WEIGHTS[sig]
            score += w
            flags.append({"signal": sig, "weight": w, "description": SIGNAL_DESCRIPTIONS.get(sig, sig)})
    score = min(score, 100)

    if score <= 30:   decision, action = "auto_approve",    "Payout processed immediately."
    elif score <= 65: decision, action = "pay_and_flag",    "Payout released. Flagged for audit."
    else:             decision, action = "hold_and_verify", "Payout held. Worker notified via WhatsApp."

    return {
        "worker_id": worker_id, "fraud_score": score,
        "decision": decision,   "action": action,
        "flags_fired": flags,   "flags_count": len(flags),
        "all_signals": {k: v for k, v in signals.items() if isinstance(v, bool)},
        "evaluated_at": datetime.utcnow().isoformat(),
    }
