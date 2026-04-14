# Zenvest — Trigger Pipeline (Person 3)

> This folder is owned by **Person 3**. It covers everything between _"API fires"_ and _"earnings gap check begins"_ — which is the handoff point to Person 4.

---

## What's in this folder

```
zenvest-triggers/
├── mock_platform_api/
│   ├── main.py              ← Simulated Zepto/Blinkit order velocity API
│   └── disruptions.json     ← Mock civic disruption alerts (hartal, curfew etc.)
├── trigger_pipeline/
│   ├── trigger_engine.py    ← All 5 trigger checks (rain, heat, AQI, civic, Dead Zone)
│   ├── poller.py            ← Runs every 5 min, writes to DB, creates pending claims
│   └── routes.py            ← FastAPI routes for admin dashboard + main backend
├── requirements.txt
└── .env.example
```

---

## Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Copy env file and add your OpenWeatherMap key
cp .env.example .env
# Edit .env → set OPENWEATHER_API_KEY

# 3. Get a free API key at:
#    https://openweathermap.org/api → "Current Weather Data" (free tier)
#    No credit card needed. Key activates in ~10 minutes.
```

---

## Running the services

**Terminal 1 — Mock Platform API (Dead Zone simulator)**
```bash
uvicorn mock_platform_api.main:app --port 8001 --reload
```

**Terminal 2 — Trigger Polling Service**
```bash
python -m trigger_pipeline.poller
```

The poller runs immediately on startup, then every 5 minutes. You'll see logs like:
```
2026-03-28 14:00:01 [INFO] ═══ Poll cycle started — 7 zones ═══
2026-03-28 14:00:03 [INFO]   Checking zone 560034...
2026-03-28 14:00:05 [WARNING] 🚨 TRIGGER FIRED: dead_zone | zone=560034 | rate=0.7
2026-03-28 14:00:05 [INFO]   → Pending claim created for zone 560034
```

---

## The 5 triggers

| # | Trigger | API | Threshold | Payout rate |
|---|---------|-----|-----------|-------------|
| 1 | Heavy Rain | OpenWeatherMap | >15mm/hr | 80% |
| 2 | Extreme Heat Index | OpenWeatherMap | feels-like >44°C | 50% |
| 3 | Severe AQI | OpenAQ (free) | AQI >400 | 60% |
| 4 | Civic Disruption | `disruptions.json` | `active: true` | 75% |
| 5 | **Dead Zone** ⭐ | Mock Platform API | velocity ratio <40% for 25 min | 70% |

---

## Demo: Triggering a Dead Zone live

```bash
# Start a Dead Zone simulation in Koramangala for 35 minutes
curl -X POST "http://localhost:8001/simulate/dead-zone?zone_id=560034&duration_minutes=35"

# Check simulation status
curl "http://localhost:8001/simulate/status"

# Clear simulation early
curl -X POST "http://localhost:8001/simulate/clear?zone_id=560034"
```

The next poll cycle (≤5 min) will detect the velocity drop. After **5 consecutive low-velocity polls** (25 min), the Dead Zone trigger fires and a `pending_claims` row is created for Person 4.

For the **2-minute demo video**, the admin dashboard has a "Simulate Dead Zone" button that calls this endpoint — so judges can see the entire flow live.

---

## Demo: Triggering a civic disruption

Open `mock_platform_api/disruptions.json` and set `"active": true` on any entry. The next poll will pick it up automatically.

---

## Handoff to Person 4 (Claims Engine)

When any trigger fires, this service writes a row to the `pending_claims` table:

```sql
SELECT * FROM pending_claims WHERE status = 'pending';
-- Returns: trigger_event_id, zone_id, trigger_type, payout_rate, details_json
```

**Person 4's claims engine polls this table** and processes each pending claim through the earnings gap check + fraud scoring + payout.

The API endpoint Person 4 can use:
```
GET /triggers/pending-claims          ← all pending
GET /triggers/pending-claims?zone_id=560034  ← filtered by zone
```

---

## Integrating with the main backend (Person 1/2)

Add this to the main `app.py`:

```python
from trigger_pipeline.routes import router as trigger_router
app.include_router(trigger_router, prefix="/triggers", tags=["Triggers"])
```

Then the admin dashboard can call:
- `GET /triggers/status/{zone_id}` — live trigger status per zone
- `GET /triggers/fired/today` — all triggers fired today (for heatmap)
- `GET /triggers/summary/all-zones` — zone risk levels (high/medium/low)

---

## API keys needed (free, get today)

1. **OpenWeatherMap** — https://openweathermap.org/api → sign up → API Keys tab
   - Use "Current Weather Data" (free, 60 calls/min)
   - Paste key into `.env` as `OPENWEATHER_API_KEY`

2. **OpenAQ** — https://openaq.org → no key needed for v2 basic endpoints (free, open)

That's it. No paid APIs. No credit card.
