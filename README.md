# Zenvest

> ### *"Where your income finds stability"*

**AI-Powered Parametric Income Insurance for Q-Commerce Delivery Partners**

> **Guidewire DEVTrails 2026** | University Hackathon  
> Persona: Q-Commerce Delivery Partners (Zepto / Blinkit)

---

## Table of Contents
1. [Problem Context](#1-problem-context)
2. [Persona & Scenarios](#2-persona--scenarios)
3. [Application Workflow](#3-application-workflow)
4. [Weekly Premium Model](#4-weekly-premium-model)
5. [Parametric Triggers](#5-parametric-triggers)
6. [Core Differentiator — Earnings Gap Protection](#6-core-differentiator--earnings-gap-protection)
7. [AI/ML Integration Plan](#7-aiml-integration-plan)
8. [Fraud Detection Architecture](#8-fraud-detection-architecture)
9. [Adversarial Defense & Anti-Spoofing Strategy](#9-adversarial-defense--anti-spoofing-strategy)
10. [Platform Choice](#10-platform-choice)
11. [Tech Stack](#11-tech-stack)
12. [Development Plan](#12-development-plan)

---

## 1. Problem Context

India's Q-commerce delivery partners (Zepto, Blinkit) are structurally different from food delivery workers. They are **stationed at dark stores** — physically present, logged in, and ready — but entirely dependent on platform-driven order volume. When that volume collapses due to external disruptions (weather, civil events, or demand crashes), the worker loses income instantly with no recourse.

Current reality:
- Workers earn ₹600–₹1,200/day depending on zone, time slot, and order flow
- External disruptions cause **20–30% monthly income loss** with zero safety net
- Existing micro-insurance products cover health or accidents — **nobody insures income**
- Q-commerce workers face a unique risk: even without any natural disaster, a **platform-level demand collapse** can zero out their earnings for hours while they remain physically present and willing to work

Zenvest is built exclusively for this segment. We insure **lost income**, not vehicles, not health, not accidents.

---

## 2. Persona & Scenarios

### Who We Serve
**Zepto / Blinkit delivery partners** in Tier-1 Indian cities: Bengaluru, Mumbai, Chennai, Hyderabad, Delhi.
- Age: 20–38 years
- Device: Android smartphone, 4G connectivity
- Earnings cycle: Daily cash + weekly platform payout
- Working pattern: 6–12 hour shifts, stationed at a fixed dark store zone
- Financial literacy: Low-to-moderate; prefers vernacular language, WhatsApp-first communication

---

### Scenario 1 — The Bengaluru Rain Collapse
**Ravi**, a Blinkit partner in Koramangala, earns an average of ₹900/day. On a Tuesday afternoon, heavy rain (>15mm/hr) hits his zone. Orders drop to near-zero for 3 hours. He stays at the dark store, logged in, earning nothing.

**Without Zenvest:** Ravi loses ₹337 with no recourse.

**With Zenvest:** The weather API detects rainfall threshold breach in Ravi's zone. His actual earnings for the day (₹540) are compared to his expected earnings (₹900). Shortfall = ₹360. Rain-attributable hours = 3 out of 8 active hours (37.5%). Attributable loss = ₹360 × 37.5% = ₹135. At 80% coverage rate, **₹108 is credited to his UPI before he leaves the dark store.** No filing. No waiting.

---

### Scenario 2 — The Chennai Dead Zone (Platform Demand Collapse)
**Meena**, a Zepto partner in Velachery, is at her dark store at 2 PM on a Wednesday. There is no rain, no curfew, no AQI alert. But order velocity at her dark store zone has dropped to 18% of the historical Wednesday 2 PM baseline — a classic post-lunch demand collapse accelerated by a competitor app's flash sale.

**Without Zenvest:** No trigger exists for this. No insurance product anywhere covers it. Meena earns ₹0 for 2 hours.

**With Zenvest:** The Dead Zone monitor detects that order velocity has been below 40% of baseline for 28 consecutive minutes. Meena's app status confirms she is present and active. Her daily earnings at the time are ₹410 against an expected ₹900. Shortfall is real. Dead Zone accounts for 25% of her shift. **₹89 payout processed automatically.**

*This is a trigger category that exists nowhere else in the insurance industry.*

---

### Scenario 3 — The Rain That Didn't Hurt (No Payout)
**Karthik**, a Blinkit partner in Indiranagar, had a strong morning. By 1 PM he had already earned ₹870 — close to his ₹900 daily average. Heavy rain hits at 3 PM. He stops working at 3:30 PM.

**With Zenvest:** Rain trigger fires. But Karthik's actual earnings (₹920 including a surge order just before he stopped) exceed his daily average. **Shortfall = ₹0. Payout = ₹0.** No free money handed out. The system is financially honest.

---

### Scenario 4 — The Bangalore Bandh
**Suresh**, a Blinkit partner operating in HSR Layout, cannot access his pickup zone due to a local hartal. A civic alert NLP trigger detects the disruption. His zone is confirmed affected. His earnings that day: ₹200 vs expected ₹850. Shortfall = ₹650. Bandh duration = 6 of his 9 active hours (67%). Attributable loss = ₹650 × 67% = ₹435. **₹348 payout at 80% coverage.**

---

## 3. Application Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                        WORKER JOURNEY                       │
└─────────────────────────────────────────────────────────────┘

  [Onboarding]
       │
       ▼
  Worker registers via PWA
  → Platform verified (Zepto/Blinkit partner ID)
  → Zone history collected (last 4 weeks, simulated)
  → AI Risk Profile generated (zone fingerprint, peak hours, sensitivity score)
  → Weekly premium calculated and shown
       │
       ▼
  [Weekly Policy Activation]
  → Worker selects coverage tier (Basic / Standard / Pro)
  → ₹ premium auto-deducted every Monday from UPI / wallet
  → Policy active for 7 days
  → Worker receives WhatsApp confirmation
       │
       ▼
  [Real-Time Monitoring — Runs Continuously]
  → Weather API polling (OpenWeatherMap, pin-code level)
  → AQI feed (OpenAQ)
  → Dark store order velocity monitor (mock platform API)
  → Civic alert NLP scanner (news API + mock)
       │
       ▼
  [Trigger Detected in Worker's Zone + Active Hours]
       │
       ├──► Earnings Gap Check
       │     → Compare actual earnings to daily expected baseline
       │     → If shortfall exists → proceed to payout
       │     → If no shortfall → log event, no payout
       │
       ├──► Fraud & Anti-Spoofing Validation
       │     → Multi-signal presence stack (GPS + cell tower + sensors)
       │     → Platform activity log check
       │     → Cross-worker cluster validation
       │     → Coordinated ring detection
       │
       └──► Payout Calculation
             → Shortfall × Attribution % × Coverage rate
             → Payout credited to UPI / wallet instantly
             → Worker notified via WhatsApp + app
             → Dashboard updated

┌─────────────────────────────────────────────────────────────┐
│                      ADMIN / INSURER VIEW                   │
└─────────────────────────────────────────────────────────────┘

  Real-time dashboard → Active triggers, payout queue, fraud flags
  Loss ratio monitor → Weekly premium collected vs payouts disbursed
  Predictive analytics → Next week's expected claims by zone
  Risk heatmap → Zone-level disruption risk scores
```

---

## 4. Weekly Premium Model

Gig workers think week-to-week, not month-to-month. Our entire financial model is structured on a **7-day cycle**, resetting every Monday.

### Pricing Tiers

| Tier | Weekly Premium | Max Weekly Payout | Trigger Events Covered |
|------|---------------|-------------------|----------------------|
| Basic | ₹29 | ₹500 | Up to 2 events/week |
| Standard | ₹49 | ₹900 | Up to 4 events/week |
| Pro | ₹79 | ₹1,800 | Unlimited events |

### Dynamic Pricing (AI-adjusted every Sunday night)

The base tier premium is adjusted weekly by our risk model based on:

- **Zone risk score** — historical disruption frequency for the worker's primary zone
- **Seasonal factor** — monsoon months (June–September) carry higher baseline risk
- **Worker sensitivity index** — how much past disruptions have impacted this specific worker's income
- **Claim history** — fraud-free workers with low claim frequency get a small discount

**Example:** Standard tier base = ₹49. Worker operates in a historically flood-prone zone in July → adjusted to ₹61. Worker operates in a low-disruption zone in February → adjusted to ₹42.

The worker sees their personalised quote every Sunday evening and can choose to renew, upgrade, or pause. Auto-renews unless opted out.

### Payout Formula

```
Shortfall          = Expected daily earnings − Actual earnings
Attribution %      = Verified disruption hours ÷ Total active hours
Attributable loss  = Shortfall × Attribution %
Payout             = Attributable loss × Coverage rate (80%)
```

**Expected daily earnings** = Rolling 4-week average, adjusted for day-of-week and festival calendar.

**Critical design decision:** A payout only fires when BOTH conditions are true simultaneously:
1. A verified external trigger occurred in the worker's zone during their active hours
2. The worker's actual earnings are below their expected baseline

This prevents the "free money" problem — a worker who had a great morning and hit their daily target before a disruption hit receives ₹0, because they were not financially harmed.

---

## 5. Parametric Triggers

All triggers are **zone-specific** (pin-code polygon level, not city-wide) and **time-specific** (must overlap with the worker's active hour window).

| Trigger | Data Source | Threshold | Notes |
|---------|------------|-----------|-------|
| Heavy rain | OpenWeatherMap API | >15mm/hr for 45+ min | Pin-code polygon match required |
| Extreme heat | OpenWeatherMap API | Feels-like >44°C | Uses heat index (temp + humidity), not raw temp |
| Severe AQI | OpenAQ API | AQI >400 for 2+ hrs | Bengaluru, Delhi, Mumbai winters |
| Flash flood / Red Alert | IMD alert feed (mock) | Red alert issued for zone | 100% attribution rate |
| Civic disruption | News NLP + mock civic API | Hartal / curfew / zone closure confirmed | Requires multi-source corroboration |
| **Dead Zone (demand collapse)** | Mock platform order API | Velocity <40% of baseline for 25+ min | Original trigger — see Section 6 |

**Why heat index instead of raw temperature:** A raw temperature of 40°C at 80% humidity produces a feels-like temperature of 51°C. Outdoor delivery workers are affected by physiological heat stress, not thermometer readings. Using the heat index is more accurate and shows domain understanding.

---

## 6. Core Differentiator — Earnings Gap Protection

### The Problem Nobody Has Solved

Q-commerce workers face a risk category that has never been insured: **platform-level demand collapse**. This is not weather. It is not a government curfew. It is the silent evaporation of orders from a dark store zone due to:

- Post-lunch / post-dinner lull windows (predictable, daily)
- Competitor app flash sales diverting order flow
- Viral social media events pulling attention away (IPL match goes live, orders stop)
- Dark store inventory stockouts causing app-side suppression
- WhatsApp rumours causing localised demand panic

The worker is physically present. The app is open. The dark store is operational. But no orders come. No existing insurance product on earth recognises this as a trigger event.

### How Dead Zone Detection Works

The Zenvest order velocity monitor polls the mock platform API every 5 minutes and computes:

```
Current velocity  = Orders dispatched in last 30 min × 2  (extrapolated to per-hour)
Baseline velocity = Historical average for this zone × this hour × this day-of-week
Velocity ratio    = Current velocity ÷ Baseline velocity

If velocity ratio < 0.40 for ≥ 25 consecutive minutes:
    → Dead Zone status declared for this zone
    → Worker presence validated (app status: active + logged in)
    → Earnings Gap check initiated
```

The baseline is built from 4 weeks of historical order data per zone, per hour slot, per day of week — stored as a lookup table updated nightly.

### The Earnings Gap Check (The Key Innovation)

Simply detecting a Dead Zone is not enough to pay out. A worker who had a productive morning and already hit their daily earnings target should not receive a payout for a Dead Zone that didn't financially harm them. That would be a subsidy, not insurance.

**Both conditions must be true for a payout:**

```
Condition 1: A verified external trigger exists (weather OR Dead Zone OR civic event)
Condition 2: Worker's actual earnings < expected earnings baseline
```

Only when both are true does the attribution calculation run.

### Why This is Fraud-Proof

Dead Zone is the only trigger type that is inherently fraud-resistant by design. Order velocity is a zone-wide platform metric — it reflects all 15–30 workers stationed at a given dark store simultaneously. A worker cannot fake a demand collapse. If the zone-wide velocity is normal but one worker claims a Dead Zone, the cross-worker consistency check flags it immediately. Genuine Dead Zones affect every worker in the zone at the same time.

### The Demo Moment

In a live demonstration, a judge will see: the admin dashboard detects a Dead Zone at 2:47 PM in Koramangala. Within 90 seconds, the system has validated worker presence, run the earnings gap check, computed the payout, and sent a UPI credit notification to the worker's phone — while the worker is still sitting at the dark store, unaware anything has been processed. The payout arrives before they even thought to check.

---

## 7. AI/ML Integration Plan

### Module 1: Dynamic Premium Calculation
- **Model type:** Gradient Boosted Trees (XGBoost / LightGBM)
- **Features:** Zone disruption frequency (historical), season, day-of-week, worker's active hours, past claim count, worker sensitivity index
- **Output:** Weekly premium adjustment multiplier (0.7× to 1.5× of base tier)
- **Training data:** Synthetic dataset built from IMD historical weather + simulated claim records
- **Update frequency:** Retrained weekly on Sunday night

### Module 2: Risk Profiling at Onboarding
- **Model type:** K-Means clustering on zone + hour + earnings patterns
- **Output:** Worker Risk Tier (Low / Medium / High) + initial zone fingerprint
- **Cold start solution:** New workers default to zone-level averages for first 2 weeks, personal data blended in progressively from week 3

### Module 3: Dead Zone Baseline Model
- **Model type:** Time-series regression (SARIMA or simple rolling average with day-of-week correction)
- **Input:** 4 weeks of historical order velocity per zone per hour slot per day
- **Output:** Expected velocity baseline + acceptable deviation band
- **Trigger logic:** Velocity drop below 40% of baseline for 25+ minutes

### Module 4: Fraud & Anti-Spoofing Detection
- **Model type:** Isolation Forest for anomaly scoring + rule-based hard blocks
- **Signals monitored:**
  - GPS trajectory continuity and accuracy variance
  - Cell tower cross-validation against declared location
  - Device accelerometer / sensor fusion signals
  - Worker platform activity log during claimed disruption
  - Cross-worker cluster consistency (zone-wide event must affect multiple workers)
  - Claim surge rate vs expected rate
  - Claim onset timing distribution
  - Social graph proximity (coordinated registration patterns)
  - Cross-day earnings ratio (claim-day vs non-claim-day)
- **Output:** Fraud confidence score (0–100)
  - Score 0–30 → auto-approve and pay within 90 seconds
  - Score 31–65 → pay immediately and flag for post-hoc audit
  - Score 66–100 → hold and request WhatsApp location verification

### Module 5: Predictive Disruption Forecasting
- **Purpose:** Insurer dashboard — predict next week's likely payout exposure by zone
- **Model type:** Random Forest on historical trigger events + seasonal patterns + IMD forecast
- **Output:** Expected claims count and value per zone for the coming week

---

## 8. Fraud Detection Architecture

Beyond the ML layer, Zenvest enforces four hard rule-based checks:

1. **Zone presence check** — Worker's last GPS ping must fall within the triggered zone polygon. No polygon overlap = automatic rejection.

2. **Activity validation** — Worker's platform app must show "active / waiting for order" status during the trigger window. Workers who were offline or had already logged out are excluded.

3. **Cross-worker cluster check** — Environmental and Dead Zone triggers must show correlated income drops across multiple workers in the same zone. A lone claim in a zone where everyone else earned normally is flagged.

4. **Duplicate claim prevention** — A single trigger event can only generate one claim per worker per day. Multiple trigger events in one day are de-duplicated and merged into a single payout calculation.

---

## 9. Adversarial Defense & Anti-Spoofing Strategy

### The Threat

A coordinated syndicate of delivery workers organising via Telegram uses GPS-spoofing applications to fake their location inside a verified disruption zone (e.g., a red-alert flood zone) while physically resting at home. They trigger mass false claims simultaneously, draining the liquidity pool.

This attack breaks simple parametric insurance. It does not break Zenvest — and here is exactly why.

### Why Zenvest's Architecture is Already Partially Immune

Most parametric platforms ask one question: **"Is the worker in the affected zone?"**  
Spoof your GPS → answer is yes → payout fires.

Zenvest asks two questions simultaneously:
1. Is there a verified trigger in the worker's zone?
2. **Did the worker actually suffer a provable income shortfall?**

A worker sitting at home spoofing their GPS is not logged into the Zepto/Blinkit platform as active. Their platform activity log shows no delivery attempts, no order assignments, no dark store presence. Their actual earnings for the day are either zero (not working at all) or normal (working elsewhere). In neither case does a genuine shortfall appear against their expected baseline.

**The GPS spoof clears check one. It fails at check two.**

This is the structural advantage of Earnings Gap Protection over event-only parametric triggers. However, we go further.

---

### 1. The Differentiation — Genuine Worker vs GPS Spoofer

Zenvest uses a **multi-signal presence validation stack**, not a single GPS coordinate check. A worker must pass all five layers to qualify for a payout:

#### Layer 1 — GPS Consistency Score
Raw GPS coordinates are the weakest signal and we treat them as such. We do not trust a single GPS ping. Instead, we analyse:

- **GPS trajectory continuity** — a genuine worker travels from home to the dark store. Their location history shows movement along a plausible route. A spoofer's GPS jumps instantly from one location to another or shows an unnaturally static position inside the zone with no travel history preceding it.
- **GPS accuracy variance** — real GPS in a severe weather event shows natural accuracy fluctuation (±15–40m radius variance). A spoofed GPS signal typically shows an impossibly stable accuracy reading (±3–5m) regardless of weather conditions. We flag suspiciously clean GPS signals during declared disruption events.
- **GPS provider metadata** — legitimate device GPS comes from a mix of satellite, cell tower, and WiFi triangulation signals. Spoofing apps often report only mock provider data. We log and analyse the GPS provider field from the device API.

#### Layer 2 — Platform Activity Fingerprint
We cross-validate the worker's GPS claim against their **platform-side activity log**:

- Is the worker's app in "waiting for order" status at the dark store?
- Was an order assigned to them and declined/timed out (consistent with disruption)?
- Or is their app completely idle — suggesting they are not actually working?

A genuine stranded worker has an active session with order assignment attempts. A spoofer at home has no platform activity.

#### Layer 3 — Device Sensor Fusion
Modern smartphones carry sensors that GPS spoofing apps cannot fake simultaneously:

- **Accelerometer / step counter** — if GPS says "moving through Koramangala" but the accelerometer shows the device has been stationary for 3 hours, that is a conflict flag.
- **Network cell tower ID** — a worker claiming to be in Koramangala but whose device is connected to a cell tower serving Whitefield is flagged immediately. GPS can be spoofed; cell tower association cannot.
- **WiFi network fingerprint** — if the device is connected to a known home WiFi network while claiming to be at the dark store, it is flagged.

#### Layer 4 — Earnings Reality Check
A payout only fires when actual earnings fall below the expected baseline. This is the hardest layer for a syndicate to game collectively. Coordinating 50 workers to all simultaneously have low earnings on a specific day — without any of them actually logging into the platform — produces a detectable pattern: an abnormal cluster of workers with zero platform activity, all claiming the same event, all showing identical shortfall profiles. This cluster signature triggers the Coordinated Fraud Ring detector.

#### Layer 5 — Behavioural Baseline Deviation
Each worker has a historical behaviour profile built over 4 weeks. The fraud model flags: workers whose GPS history shows they have never physically been near the claimed dark store zone in any previous session, workers who claim in week 1 and again on the first major event in a new zone, and unusual patterns relative to their established baseline.

---

### 2. The Data — Detecting a Coordinated Fraud Ring

Individual GPS spoofing is detectable. A coordinated syndicate of 50–500 workers is detectable at the **population level** even if some individual checks pass.

**Signal 1 — Simultaneous Claim Surge:** If the observed claim rate exceeds 2.5× the expected rate within the first 10 minutes of a trigger firing, a Surge Alert is raised. All claims in the surge window are held for enhanced validation — a soft hold, not a rejection.

**Signal 2 — Claim Onset Timing Distribution:** Genuine disruption claims arrive gradually as earnings drift below baseline over 30–60 minutes. Coordinated fraud claims arrive in an unnatural spike within 2–3 minutes of a trigger being publicly visible. We model the expected onset distribution for each trigger type and flag early cohorts.

**Signal 3 — Social Graph Analysis:** Workers who registered within days of each other, share a device fingerprint prefix or referral chain, all activated policies on the same day, and all claim the same event with GPS coordinates within a 50m radius are flagged as a potential ring and escalated to manual review before payouts are released.

**Signal 4 — Cell Tower Cluster Conflict:** If 30 workers claim to be in Zone X but cell tower triangulation shows 20 of them are connected to towers outside that zone, the conflict is a ring-level signal.

**Signal 5 — Cross-Day Earnings Pattern:** Our model computes each worker's claim-day vs non-claim-day earnings ratio. A fraud actor shows normal earnings on most days and artificially depressed earnings specifically on claim days — a statistically detectable pattern over 4–6 weeks.

---

### 3. The UX Balance — Protecting Honest Workers from Unfair Flags

In severe weather, GPS signal genuinely degrades. Network connectivity drops. We must not punish honest workers for the natural technical consequences of the exact conditions we are insuring them against.

#### The Three-Tier Claim Resolution System

**Tier 1 — Auto-Approve (Fraud Score 0–30)**  
All five validation layers pass cleanly. No ring signals detected. Payout processes within 90 seconds. No friction whatsoever.

**Tier 2 — Pay and Flag (Fraud Score 31–65)**  
Signals are ambiguous but not contradictory. Payout is released immediately — the worker is not punished. The claim is marked for post-hoc audit. This is the critical UX decision: **pay first, audit later**. The financial risk of one erroneous payout is far lower than the reputational and human cost of wrongly denying a stranded worker.

**Tier 3 — Hold and Verify (Fraud Score 66–100)**  
Multiple hard conflicts detected. Payout is held. Worker receives a WhatsApp message within 5 minutes:

> *"We've detected an unusual signal in your claim. To process your payout, please confirm your location by sharing a live WhatsApp location pin, or tap here to speak to our support team. We'll resolve this within 2 hours."*

The message is non-accusatory. One WhatsApp location pin resolves the hold immediately. If no response within 2 hours, the claim goes to a human reviewer — not auto-rejected.

#### Protecting Against Network Drop False Flags

We do not require continuous GPS pings. We require GPS confirmation at **trigger onset** (within the first 15 minutes) and at **claim resolution** (end of disruption window). A gap in GPS data during the disruption window is treated as expected behaviour in severe weather, not evidence of absence. Cell tower data serves as the continuity check during GPS outage windows.

#### Summary of the Defense Stack

| Layer | What it catches | What it protects |
|-------|----------------|-----------------|
| GPS trajectory analysis | Instant location jumps, static spoof signals | Genuine movement patterns |
| Platform activity validation | Workers with no app session | Genuinely active workers |
| Device sensor fusion | Stationary accelerometer vs moving GPS | Workers in motion |
| Cell tower cross-check | Location mismatch | Workers in genuine signal drop |
| Earnings gap requirement | Zero-shortfall spoof attempts | Workers with real income loss |
| Claim surge detection | Mass coordinated ring attacks | Isolated genuine claims |
| Claim timing distribution | Unnatural spike patterns | Organic gradual claim onset |
| Social graph analysis | Coordinated registration patterns | Independent worker claims |
| Cross-day earnings pattern | Artificially depressed claim-day earnings | Randomly disrupted workers |
| Three-tier resolution UX | Unfair auto-rejection of honest workers | Fast payout for genuine claims |

---

## 10. Platform Choice: Progressive Web App (PWA)

**Decision: Web (PWA), not native mobile app**

**Rationale:**

- Q-commerce workers use Android devices ranging from low-end (₹6,000) to mid-range. A PWA works across all of them without Play Store installation friction.
- PWA loads via a WhatsApp link — the primary communication channel for this demographic. No app download required.
- Offline capability: the worker can view their policy, coverage status, and payout history without an active internet connection. Only sync requires connectivity.
- Smaller footprint → faster load on 4G / low-signal areas near dark stores.
- Admin / insurer dashboard is a full responsive web app, separate from the worker PWA.

**Vernacular support:** Onboarding and key notifications delivered in Hindi and English in Phase 2, with Tamil and Kannada planned for Phase 3.

**WhatsApp integration (mock):** Workers receive all critical communications via WhatsApp:
- Sunday evening: coverage renewal prompt with personalised premium
- Trigger event: "Dead Zone detected in your zone. Payout processing."
- Payout complete: "₹108 has been credited to your UPI. Stay safe."

---

## 11. Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Worker frontend | React PWA | Offline-capable, WhatsApp-shareable, no Play Store friction |
| Admin dashboard | React + Recharts | Rich analytics and heatmaps for insurer view |
| Backend API | FastAPI (Python) | ML model integration, async trigger processing |
| ML models | Python (XGBoost, scikit-learn, statsmodels) | Industry standard, well-documented |
| Weather API | OpenWeatherMap (free tier) | Pin-code level data, reliable |
| AQI API | OpenAQ (free, open) | Real AQI data for Indian cities |
| Order velocity | Mock REST API (custom built) | Simulates platform order flow per zone |
| Civic alerts | News API + custom NLP | Hartal / curfew detection from headlines |
| Payment (mock) | Razorpay Test Mode | Demonstrates UPI payout flow |
| Database | PostgreSQL | Policy, claims, worker, and earnings records |
| Cache / queue | Redis | Real-time trigger event queue and deduplication |
| Maps / zones | Mapbox (free tier) | Pin-code polygon matching for zone validation |
| Hosting | Vercel (frontend) + Render (backend) | Free tier, sufficient for demo |

---

## 12. Development Plan

### Phase 1 (March 4–20): Ideation & Foundation ✅
- Defined persona, scenarios, and workflow
- Designed weekly premium model and trigger architecture
- Invented Dead Zone detection and Earnings Gap Protection feature
- Outlined ML architecture and fraud detection logic
- Designed adversarial defense and anti-spoofing strategy
- Committed README to GitHub

### Phase 2 (March 21 – April 4): Automation & Protection
- Worker onboarding flow (PWA)
- Policy creation and management UI
- Dynamic premium calculation (XGBoost model, synthetic training data)
- 5 automated trigger integrations (weather, AQI, Dead Zone, heat index, civic)
- Claims management engine with earnings gap check
- Multi-signal fraud validation stack (GPS + cell tower + sensor fusion)
- Mock payout processing via Razorpay test mode

### Phase 3 (April 5–17): Scale & Optimise
- Advanced coordinated ring detection (social graph + claim surge + timing analysis)
- Worker dashboard: earnings protected, active coverage, payout history
- Insurer admin dashboard: loss ratios, risk heatmap, predictive analytics
- Dead Zone simulation button for live demo
- Final pitch deck and 5-minute walkthrough video

---

## Coverage Exclusions (Per Problem Statement)

Zenvest explicitly **does not cover:**
- Health or medical expenses
- Life insurance
- Accident compensation
- Vehicle repair or maintenance

We insure **lost income only**, caused by verified external disruptions beyond the worker's control.

---

## Summary

Zenvest is the only insurance product designed around how Q-commerce delivery workers actually experience income loss — not just weather events, but the invisible demand collapses that occur every day at dark stores across Indian cities. Our Earnings Gap Protection model ensures that every payout is proportional to real, attributable, verified financial harm. Our multi-signal anti-spoofing stack ensures that coordinated fraud rings cannot exploit the platform — structurally, not just reactively. Workers are protected. Insurers are protected. And for the first time, a trigger category that affects millions of gig workers daily is finally insured.

---

*Guidewire DEVTrails 2026 | Phase 1 Submission*
