"""
Zenvest — Trigger Pipeline API
Exposes trigger status, history, and manual fire endpoints
for the main backend (Person 1/2) and admin dashboard (Person 4).

Mount this router in the main FastAPI app:
    from trigger_pipeline.routes import router as trigger_router
    app.include_router(trigger_router, prefix="/triggers", tags=["triggers"])
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
import os

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

router = APIRouter()

DB_PATH = Path(os.getenv("DB_PATH", "zenvest.db"))


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Response models ───────────────────────────────────────────────────────────

class TriggerStatusResponse(BaseModel):
    zone_id: str
    trigger_type: str
    fired: bool
    payout_rate: float
    raw_value: float | None
    threshold: float | None
    timestamp: str
    details: dict


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/status/{zone_id}")
def get_zone_trigger_status(zone_id: str):
    """
    Returns the most recent reading for each trigger type in a zone.
    Used by admin dashboard to show live zone status.
    """
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("""
        SELECT trigger_type, fired, payout_rate, raw_value, threshold, timestamp, details_json
        FROM trigger_events
        WHERE zone_id = ?
        GROUP BY trigger_type
        HAVING MAX(created_at)
        ORDER BY trigger_type
    """, (zone_id,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No trigger data found for zone {zone_id}")

    return {
        "zone_id": zone_id,
        "last_checked": datetime.utcnow().isoformat(),
        "triggers": [
            {
                "trigger_type": r["trigger_type"],
                "fired":        bool(r["fired"]),
                "payout_rate":  r["payout_rate"],
                "raw_value":    r["raw_value"],
                "threshold":    r["threshold"],
                "timestamp":    r["timestamp"],
                "details":      json.loads(r["details_json"] or "{}"),
            }
            for r in rows
        ],
    }


@router.get("/history/{zone_id}")
def get_trigger_history(
    zone_id: str,
    limit: int = Query(default=50, le=200),
    fired_only: bool = Query(default=False),
):
    """Returns recent trigger event history for a zone."""
    conn = get_db()
    cur  = conn.cursor()
    query = """
        SELECT * FROM trigger_events
        WHERE zone_id = ?
        {}
        ORDER BY created_at DESC
        LIMIT ?
    """.format("AND fired = 1" if fired_only else "")
    cur.execute(query, (zone_id, limit))
    rows = cur.fetchall()
    conn.close()

    return {
        "zone_id": zone_id,
        "count":   len(rows),
        "events":  [dict(r) for r in rows],
    }


@router.get("/pending-claims")
def get_pending_claims(zone_id: str = Query(default=None)):
    """
    Returns all pending claims waiting for Person 4's claims engine.
    Optionally filtered by zone.
    """
    conn = get_db()
    cur  = conn.cursor()
    if zone_id:
        cur.execute("SELECT * FROM pending_claims WHERE zone_id = ? AND status = 'pending' ORDER BY created_at DESC", (zone_id,))
    else:
        cur.execute("SELECT * FROM pending_claims WHERE status = 'pending' ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()

    return {
        "pending_count": len(rows),
        "claims": [dict(r) for r in rows],
    }


@router.get("/fired/today")
def get_all_fired_today():
    """Returns all triggers that fired today across all zones — for admin heatmap."""
    conn = get_db()
    cur  = conn.cursor()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    cur.execute("""
        SELECT zone_id, trigger_type, payout_rate, timestamp, details_json
        FROM trigger_events
        WHERE fired = 1 AND DATE(created_at) = ?
        ORDER BY created_at DESC
    """, (today,))
    rows = cur.fetchall()
    conn.close()

    return {
        "date":         today,
        "total_fired":  len(rows),
        "events": [
            {
                "zone_id":      r["zone_id"],
                "trigger_type": r["trigger_type"],
                "payout_rate":  r["payout_rate"],
                "timestamp":    r["timestamp"],
                "details":      json.loads(r["details_json"] or "{}"),
            }
            for r in rows
        ],
    }


@router.get("/summary/all-zones")
def get_all_zones_summary():
    """
    Returns a summary of trigger status across all zones.
    Used by the admin risk heatmap widget.
    """
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("""
        SELECT zone_id,
               COUNT(*) as total_checks,
               SUM(fired) as total_fired,
               MAX(timestamp) as last_check
        FROM trigger_events
        GROUP BY zone_id
        ORDER BY total_fired DESC
    """)
    rows = cur.fetchall()
    conn.close()

    return {
        "zones": [
            {
                "zone_id":      r["zone_id"],
                "total_checks": r["total_checks"],
                "total_fired":  r["total_fired"],
                "last_check":   r["last_check"],
                "risk_level": (
                    "high"   if r["total_fired"] > 5 else
                    "medium" if r["total_fired"] > 2 else
                    "low"
                ),
            }
            for r in rows
        ]
    }
