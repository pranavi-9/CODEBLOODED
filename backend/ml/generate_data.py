import pandas as pd
import numpy as np
import random

random.seed(42)
np.random.seed(42)

zones = {
    "koramangala": {"flood_risk": 0.8, "rain_freq": 0.7},
    "indiranagar":  {"flood_risk": 0.3, "rain_freq": 0.5},
    "whitefield":   {"flood_risk": 0.2, "rain_freq": 0.4},
    "velachery":    {"flood_risk": 0.7, "rain_freq": 0.8},
    "hsr_layout":   {"flood_risk": 0.4, "rain_freq": 0.5},
    "bandra":       {"flood_risk": 0.6, "rain_freq": 0.6},
    "andheri":      {"flood_risk": 0.5, "rain_freq": 0.55},
    "dwarka":       {"flood_risk": 0.3, "rain_freq": 0.3},
}

rows = []
for _ in range(1000):
    zone = random.choice(list(zones.keys()))
    zone_flood_risk   = zones[zone]["flood_risk"]
    zone_rain_freq    = zones[zone]["rain_freq"]
    month             = random.randint(1, 12)
    is_monsoon        = 1 if month in [6, 7, 8, 9] else 0
    past_claims       = random.randint(0, 6)
    fraud_flag        = 1 if past_claims > 4 else 0
    hours_per_day     = round(random.uniform(4, 12), 1)
    sensitivity_index = round(random.uniform(0.2, 1.0), 2)

    base = 1.0
    base += zone_flood_risk * 0.3
    base += zone_rain_freq * 0.2
    base += is_monsoon * 0.15
    base -= (past_claims == 0) * 0.1
    base += fraud_flag * 0.25
    base += sensitivity_index * 0.1
    base = round(min(max(base, 0.7), 1.5), 2)

    rows.append({
        "zone_flood_risk":    zone_flood_risk,
        "zone_rain_freq":     zone_rain_freq,
        "is_monsoon":         is_monsoon,
        "month":              month,
        "past_claims":        past_claims,
        "fraud_flag":         fraud_flag,
        "hours_per_day":      hours_per_day,
        "sensitivity_index":  sensitivity_index,
        "premium_multiplier": base
    })

df = pd.DataFrame(rows)
df.to_csv("training_data.csv", index=False)
print(f"Generated {len(df)} rows → training_data.csv")