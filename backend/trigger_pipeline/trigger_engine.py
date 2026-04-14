"""
Zenvest — Trigger Engine
Evaluates all 5 parametric triggers and returns TriggerEvent objects.

Triggers:
  1. Heavy Rain         — OpenWeatherMap
  2. Extreme Heat Index — OpenWeatherMap (feels-like temp + humidity)
  3. Severe AQI         — OpenAQ API
  4. Civic Disruption   — Local disruptions.json (mock)
  5. Dead Zone          — Mock Platform API (order velocity)

All thresholds are zone-specific, not city-wide.
"""

import os
import json
import math
import httpx
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

# ── Config ────────────────────────────────────────────────────────────────────

WEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "YOUR_KEY_HERE")
OPENAQ_BASE     = "https://api.openaq.org/v2"
WEATHER_BASE    = "https://api.openweathermap.org/data/2.5"
PLATFORM_BASE   = os.getenv("PLATFORM_API_URL", "http://localhost:8001")

DISRUPTIONS_FILE = Path(__file__).parent.parent / "mock_platform_api" / "disruptions.json"

# Zone → lat/lon for weather/AQI lookups
ZONE_COORDINATES = {
    "560034": {"lat": 12.9352, "lon": 77.6245, "city": "Bangalore"},
    "560095": {"lat": 12.9719, "lon": 77.6412, "city": "Bangalore"},
    "560068": {"lat": 12.9698, "lon": 77.7500, "city": "Bangalore"},
    "600042": {"lat": 12.9816, "lon": 80.2209, "city": "Chennai"},
    "600004": {"lat": 13.0012, "lon": 80.2565, "city": "Chennai"},
    "400058": {"lat": 19.1136, "lon": 72.8697, "city": "Mumbai"},
    "110075": {"lat": 28.5921, "lon": 77.0460, "city": "Delhi"},
}

# ── Thresholds ────────────────────────────────────────────────────────────────

RAIN_THRESHOLD_MM_PER_HR     = 15.0   # >15mm/hr for 45+ min → 80% payout
HEAT_INDEX_THRESHOLD_C       = 44.0   # feels-like >44°C → 50% payout
AQI_THRESHOLD                = 400    # PM2.5 AQI >400 for 2+ hrs → 60% payout
DEAD_ZONE_VELOCITY_RATIO     = 0.40   # <40% of baseline for 25+ min → Dead Zone
CIVIC_DISRUPTION_PAYOUT_PCT  = 0.75

TRIGGER_PAYOUT_RATES = {
    "heavy_rain":        0.80,
    "extreme_heat":      0.50,
    "severe_aqi":        0.60,
    "civic_disruption":  0.75,
    "dead_zone":         0.70,
    "flash_flood":       1.00,
}

# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class TriggerEvent:
    trigger_type: str
    zone_id: str
    fired: bool
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    payout_rate: float = 0.0
    details: dict = field(default_factory=dict)
    raw_value: Optional[float] = None
    threshold: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "trigger_type":  self.trigger_type,
            "zone_id":       self.zone_id,
            "fired":         self.fired,
            "timestamp":     self.timestamp,
            "payout_rate":   self.payout_rate,
            "details":       self.details,
            "raw_value":     self.raw_value,
            "threshold":     self.threshold,
        }

# ── Heat index formula ────────────────────────────────────────────────────────

def heat_index_celsius(temp_c: float, humidity_pct: float) -> float:
    """Rothfusz regression — returns feels-like temperature in °C."""
    T = temp_c * 9/5 + 32          # convert to °F for formula
    RH = humidity_pct
    HI = (-42.379
          + 2.04901523 * T
          + 10.14333127 * RH
          - 0.22475541 * T * RH
          - 0.00683783 * T**2
          - 0.05481717 * RH**2
          + 0.00122874 * T**2 * RH
          + 0.00085282 * T * RH**2
          - 0.00000199 * T**2 * RH**2)
    return round((HI - 32) * 5/9, 1)   # back to °C

# ── Individual trigger checks ─────────────────────────────────────────────────

async def check_heavy_rain(zone_id: str, client: httpx.AsyncClient) -> TriggerEvent:
    coords = ZONE_COORDINATES.get(zone_id, {})
    if not coords:
        return TriggerEvent("heavy_rain", zone_id, False, details={"error": "unknown zone"})

    try:
        r = await client.get(
            f"{WEATHER_BASE}/weather",
            params={"lat": coords["lat"], "lon": coords["lon"], "appid": WEATHER_API_KEY, "units": "metric"},
            timeout=8.0,
        )
        data = r.json()
        rain_1h = data.get("rain", {}).get("1h", 0.0)
        fired   = rain_1h >= RAIN_THRESHOLD_MM_PER_HR

        return TriggerEvent(
            trigger_type="heavy_rain",
            zone_id=zone_id,
            fired=fired,
            payout_rate=TRIGGER_PAYOUT_RATES["heavy_rain"] if fired else 0.0,
            raw_value=rain_1h,
            threshold=RAIN_THRESHOLD_MM_PER_HR,
            details={
                "rain_mm_per_hr": rain_1h,
                "weather_desc": data.get("weather", [{}])[0].get("description", ""),
                "city": coords["city"],
            },
        )
    except Exception as e:
        return TriggerEvent("heavy_rain", zone_id, False, details={"error": str(e)})


async def check_extreme_heat(zone_id: str, client: httpx.AsyncClient) -> TriggerEvent:
    coords = ZONE_COORDINATES.get(zone_id, {})
    if not coords:
        return TriggerEvent("extreme_heat", zone_id, False, details={"error": "unknown zone"})

    try:
        r = await client.get(
            f"{WEATHER_BASE}/weather",
            params={"lat": coords["lat"], "lon": coords["lon"], "appid": WEATHER_API_KEY, "units": "metric"},
            timeout=8.0,
        )
        data    = r.json()
        temp_c  = data["main"]["temp"]
        humid   = data["main"]["humidity"]
        hi      = heat_index_celsius(temp_c, humid)
        fired   = hi >= HEAT_INDEX_THRESHOLD_C

        return TriggerEvent(
            trigger_type="extreme_heat",
            zone_id=zone_id,
            fired=fired,
            payout_rate=TRIGGER_PAYOUT_RATES["extreme_heat"] if fired else 0.0,
            raw_value=hi,
            threshold=HEAT_INDEX_THRESHOLD_C,
            details={
                "temp_c":       temp_c,
                "humidity_pct": humid,
                "heat_index_c": hi,
                "city":         coords["city"],
            },
        )
    except Exception as e:
        return TriggerEvent("extreme_heat", zone_id, False, details={"error": str(e)})


async def check_severe_aqi(zone_id: str, client: httpx.AsyncClient) -> TriggerEvent:
    coords = ZONE_COORDINATES.get(zone_id, {})
    if not coords:
        return TriggerEvent("severe_aqi", zone_id, False, details={"error": "unknown zone"})

    try:
        r = await client.get(
            f"{OPENAQ_BASE}/latest",
            params={"coordinates": f"{coords['lat']},{coords['lon']}", "radius": 15000, "parameter": "pm25", "limit": 1},
            timeout=8.0,
        )
        data       = r.json()
        results    = data.get("results", [])
        pm25_value = None

        if results:
            for meas in results[0].get("measurements", []):
                if meas.get("parameter") == "pm25":
                    pm25_value = meas.get("value", 0)
                    break

        # Convert PM2.5 µg/m³ to AQI (simplified EPA formula for high range)
        aqi = round(pm25_value * 4.0) if pm25_value is not None else None
        fired = aqi is not None and aqi >= AQI_THRESHOLD

        return TriggerEvent(
            trigger_type="severe_aqi",
            zone_id=zone_id,
            fired=fired,
            payout_rate=TRIGGER_PAYOUT_RATES["severe_aqi"] if fired else 0.0,
            raw_value=aqi,
            threshold=AQI_THRESHOLD,
            details={
                "pm25_ug_m3": pm25_value,
                "aqi_approx": aqi,
                "city": coords["city"],
                "data_available": pm25_value is not None,
            },
        )
    except Exception as e:
        return TriggerEvent("severe_aqi", zone_id, False, details={"error": str(e)})


def check_civic_disruption(zone_id: str) -> TriggerEvent:
    """Reads local disruptions.json — no HTTP call needed."""
    try:
        with open(DISRUPTIONS_FILE) as f:
            data = json.load(f)

        now = datetime.utcnow()
        for d in data.get("disruptions", []):
            if not d.get("active", False):
                continue
            if zone_id not in d.get("affected_zones", []):
                continue
            # Check time window
            start = datetime.fromisoformat(d["start_time"].replace("Z", "+00:00")).replace(tzinfo=None)
            end   = datetime.fromisoformat(d["end_time"].replace("Z", "+00:00")).replace(tzinfo=None)
            if start <= now <= end:
                return TriggerEvent(
                    trigger_type="civic_disruption",
                    zone_id=zone_id,
                    fired=True,
                    payout_rate=TRIGGER_PAYOUT_RATES["civic_disruption"],
                    details={
                        "disruption_id":   d["id"],
                        "disruption_type": d["type"],
                        "severity":        d["severity"],
                        "description":     d["description"],
                    },
                )

        return TriggerEvent("civic_disruption", zone_id, False,
                            details={"message": "No active civic disruption in this zone"})
    except Exception as e:
        return TriggerEvent("civic_disruption", zone_id, False, details={"error": str(e)})


async def check_dead_zone(zone_id: str, client: httpx.AsyncClient) -> TriggerEvent:
    """
    Polls mock platform API. Fires if velocity_ratio < 0.40.
    The polling service tracks consecutive readings — this function
    checks the CURRENT reading; the poller accumulates duration.
    """
    try:
        r = await client.get(f"{PLATFORM_BASE}/velocity/{zone_id}", timeout=5.0)
        data  = r.json()
        ratio = data.get("velocity_ratio", 1.0)
        fired = ratio < DEAD_ZONE_VELOCITY_RATIO

        return TriggerEvent(
            trigger_type="dead_zone",
            zone_id=zone_id,
            fired=fired,
            payout_rate=TRIGGER_PAYOUT_RATES["dead_zone"] if fired else 0.0,
            raw_value=ratio,
            threshold=DEAD_ZONE_VELOCITY_RATIO,
            details={
                "orders_last_30min":     data.get("orders_last_30min"),
                "expected_baseline":     data.get("expected_baseline_30min"),
                "velocity_ratio":        ratio,
                "is_simulated":          data.get("is_dead_zone_simulated", False),
                "zone_name":             data.get("zone_name"),
            },
        )
    except Exception as e:
        return TriggerEvent("dead_zone", zone_id, False, details={"error": str(e)})


# ── Run all triggers for a zone ───────────────────────────────────────────────

async def evaluate_all_triggers(zone_id: str) -> list[TriggerEvent]:
    """
    Evaluates all 5 triggers for a given zone.
    Returns a list of TriggerEvent objects (fired or not).
    """
    async with httpx.AsyncClient() as client:
        results = [
            await check_heavy_rain(zone_id, client),
            await check_extreme_heat(zone_id, client),
            await check_severe_aqi(zone_id, client),
            check_civic_disruption(zone_id),          # sync — no HTTP
            await check_dead_zone(zone_id, client),
        ]
    return results
