"""
Zenvest — Trigger Polling Service
Runs every 5 minutes. For each zone:
  1. Evaluates all 5 triggers via trigger_engine.py
  2. Tracks consecutive Dead Zone readings (needs 25+ min = 5 polls to fire)
  3. Writes confirmed TriggerEvents to the database
  4. Hands off to the claims engine (Person 4) via DB row

Run with: python -m trigger_pipeline.poller
Or via APScheduler: it self-schedules every 5 minutes.
"""

import asyncio
import json
import logging
import os
import sqlite3
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from trigger_pipeline.trigger_engine import (
    ZONE_COORDINATES,
    evaluate_all_triggers,
    TriggerEvent,
)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("zenvest.poller")

# ── Database setup ────────────────────────────────────────────────────────────
DB_PATH = Path(os.getenv("DB_PATH", "zenvest.db"))

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS trigger_events (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            trigger_type    TEXT NOT NULL,
            zone_id         TEXT NOT NULL,
            fired           INTEGER NOT NULL,
            payout_rate     REAL,
            raw_value       REAL,
            threshold       REAL,
            details_json    TEXT,
            timestamp       TEXT NOT NULL,
            processed       INTEGER DEFAULT 0,
            created_at      TEXT DEFAULT (datetime('now'))
        )
    """)
    # Table for claims engine (Person 4) to pick up
    cur.execute("""
        CREATE TABLE IF NOT EXISTS pending_claims (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            trigger_event_id INTEGER NOT NULL,
            zone_id         TEXT NOT NULL,
            trigger_type    TEXT NOT NULL,
            payout_rate     REAL NOT NULL,
            details_json    TEXT,
            status          TEXT DEFAULT 'pending',
            created_at      TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (trigger_event_id) REFERENCES trigger_events(id)
        )
    """)
    conn.commit()
    conn.close()
    log.info(f"Database initialised at {DB_PATH}")


def write_trigger_event(event: TriggerEvent) -> int:
    """Persists a TriggerEvent and returns its row ID."""
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()
    cur.execute("""
        INSERT INTO trigger_events
            (trigger_type, zone_id, fired, payout_rate, raw_value, threshold, details_json, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event.trigger_type,
        event.zone_id,
        int(event.fired),
        event.payout_rate,
        event.raw_value,
        event.threshold,
        json.dumps(event.details),
        event.timestamp,
    ))
    row_id = cur.lastrowid
    conn.commit()
    conn.close()
    return row_id


def create_pending_claim(trigger_event_id: int, event: TriggerEvent):
    """
    Writes a pending claim row for Person 4's claims engine to pick up.
    Only called when a trigger actually fires.
    """
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()
    cur.execute("""
        INSERT INTO pending_claims
            (trigger_event_id, zone_id, trigger_type, payout_rate, details_json)
        VALUES (?, ?, ?, ?, ?)
    """, (
        trigger_event_id,
        event.zone_id,
        event.trigger_type,
        event.payout_rate,
        json.dumps(event.details),
    ))
    conn.commit()
    conn.close()
    log.info(f"  → Pending claim created for zone {event.zone_id} | {event.trigger_type} | rate={event.payout_rate}")


# ── Dead Zone consecutive tracking ────────────────────────────────────────────
# Dead Zone needs 25+ minutes of velocity_ratio < 0.40.
# At 5-min poll intervals, that means 5 consecutive below-threshold readings.
# We track this per zone in memory (resets on restart — acceptable for demo).

DEAD_ZONE_REQUIRED_POLLS = 5   # 5 × 5min = 25 minutes
_dead_zone_streak: dict[str, int] = defaultdict(int)   # zone_id → consecutive low readings
_dead_zone_active:  dict[str, bool] = defaultdict(bool) # zone_id → trigger already fired


def update_dead_zone_streak(zone_id: str, ratio: float) -> bool:
    """
    Returns True if this poll should fire the Dead Zone trigger
    (i.e. streak just hit the threshold for the first time).
    """
    global _dead_zone_streak, _dead_zone_active

    if ratio < 0.40:
        _dead_zone_streak[zone_id] += 1
        log.debug(f"  Dead Zone streak for {zone_id}: {_dead_zone_streak[zone_id]}/{DEAD_ZONE_REQUIRED_POLLS}")

        if _dead_zone_streak[zone_id] >= DEAD_ZONE_REQUIRED_POLLS and not _dead_zone_active[zone_id]:
            _dead_zone_active[zone_id] = True
            return True   # fire trigger
    else:
        if _dead_zone_streak[zone_id] > 0:
            log.info(f"  Dead Zone streak RESET for {zone_id} (velocity recovered, ratio={ratio:.2f})")
        _dead_zone_streak[zone_id] = 0
        _dead_zone_active[zone_id] = False

    return False


# ── Core poll function ────────────────────────────────────────────────────────

async def poll_all_zones():
    """
    Main polling function — evaluates all triggers for every zone.
    Called every 5 minutes by the scheduler.
    """
    zones = list(ZONE_COORDINATES.keys())
    log.info(f"═══ Poll cycle started — {len(zones)} zones — {datetime.utcnow().isoformat()} ═══")

    fired_count = 0

    for zone_id in zones:
        log.info(f"  Checking zone {zone_id}...")
        events = await evaluate_all_triggers(zone_id)

        for event in events:
            # Special handling for Dead Zone — needs streak tracking
            if event.trigger_type == "dead_zone":
                ratio     = event.raw_value or 1.0
                should_fire = update_dead_zone_streak(zone_id, ratio)
                if should_fire:
                    event.fired = True
                    log.warning(f"  🔴 DEAD ZONE CONFIRMED: {zone_id} — 25+ min below threshold")
                elif event.fired and not _dead_zone_active[zone_id]:
                    # Ratio is low but streak not reached yet — don't fire yet
                    event.fired = False

            # Write every event to DB (fired or not — for audit trail)
            row_id = write_trigger_event(event)

            # If fired, create a pending claim for Person 4
            if event.fired:
                fired_count += 1
                log.warning(f"  🚨 TRIGGER FIRED: {event.trigger_type} | zone={zone_id} | rate={event.payout_rate}")
                create_pending_claim(row_id, event)

    log.info(f"═══ Poll cycle complete — {fired_count} triggers fired ═══\n")


# ── Scheduler entry point ─────────────────────────────────────────────────────

async def main():
    init_db()
    log.info("Zenvest Trigger Polling Service starting...")
    log.info(f"Poll interval: every 5 minutes")
    log.info(f"Zones monitored: {list(ZONE_COORDINATES.keys())}")

    # Run once immediately on startup
    await poll_all_zones()

    # Then schedule every 5 minutes
    scheduler = AsyncIOScheduler()
    scheduler.add_job(poll_all_zones, "interval", minutes=5, id="trigger_poll")
    scheduler.start()
    log.info("Scheduler running. Press Ctrl+C to stop.")

    try:
        while True:
            await asyncio.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        log.info("Polling service stopped.")
        scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
