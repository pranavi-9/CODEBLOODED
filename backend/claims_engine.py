"""Zenvest — Claims Engine Phase 3 (with advanced fraud detection)"""
import json, os, random, sqlite3, uuid
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

router   = APIRouter()
DB_PATH  = Path(os.getenv("DB_PATH", "zenvest.db"))
WORKERS_DB = "workers.json"
TIER_MAX = {"basic": 400, "standard": 800, "pro": 1500}
ZONE_EARNINGS = {
    "560034":900,"560004":780,"560095":850,"560068":750,
    "600042":880,"600091":800,"600040":760,"400053":950,
    "400050":900,"400069":820,"110075":800,"110001":700,"500032":750,
}
try:
    from fraud_detection import compute_advanced_fraud_score
    ADVANCED = True; print("✓ Advanced fraud detection loaded")
except:
    ADVANCED = False; print("⚠ Using basic fraud scoring")

def get_db():
    if not DB_PATH.exists(): return None
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row; return conn

def init_tables():
    conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS pending_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT, trigger_event_id INTEGER,
        zone_id TEXT NOT NULL, trigger_type TEXT NOT NULL, payout_rate REAL NOT NULL,
        details_json TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')))""")
    cur.execute("""CREATE TABLE IF NOT EXISTS processed_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT, pending_claim_id INTEGER NOT NULL,
        worker_id TEXT NOT NULL, zone_id TEXT NOT NULL, trigger_type TEXT NOT NULL,
        expected_earnings REAL, actual_earnings REAL, shortfall REAL,
        attribution_pct REAL, attributable_loss REAL, coverage_rate REAL DEFAULT 0.8,
        payout_amount REAL, fraud_score INTEGER, fraud_flags TEXT,
        decision TEXT, razorpay_ref TEXT, processed_at TEXT DEFAULT (datetime('now')))""")
    conn.commit(); conn.close()

def get_pending_claims():
    conn = get_db()
    if not conn: return []
    cur = conn.cursor(); cur.execute("SELECT * FROM pending_claims WHERE status='pending' ORDER BY created_at ASC")
    rows = [dict(r) for r in cur.fetchall()]; conn.close(); return rows

def mark_done(claim_id): 
    conn = sqlite3.connect(DB_PATH); conn.execute("UPDATE pending_claims SET status='processed' WHERE id=?", (claim_id,)); conn.commit(); conn.close()

def write_claim(d):
    conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
    cur.execute("""INSERT INTO processed_claims
        (pending_claim_id,worker_id,zone_id,trigger_type,expected_earnings,actual_earnings,
         shortfall,attribution_pct,attributable_loss,coverage_rate,payout_amount,
         fraud_score,fraud_flags,decision,razorpay_ref)
        VALUES (:pending_claim_id,:worker_id,:zone_id,:trigger_type,:expected_earnings,
         :actual_earnings,:shortfall,:attribution_pct,:attributable_loss,:coverage_rate,
         :payout_amount,:fraud_score,:fraud_flags,:decision,:razorpay_ref)""", d)
    conn.commit(); conn.close()

def load_workers():
    if not os.path.exists(WORKERS_DB): return []
    with open(WORKERS_DB) as f: return json.load(f)

def save_workers(w):
    with open(WORKERS_DB, "w") as f: json.dump(w, f, indent=2)

def get_zone_workers(zone_id):
    return [w for w in load_workers() if w.get("pin_code")==zone_id and w.get("status")=="active"]

def update_worker(worker_id, amount, entry):
    workers = load_workers()
    for w in workers:
        if w["worker_id"]==worker_id:
            w["total_claimed"] = round(w.get("total_claimed",0)+amount, 2)
            w["claim_count"]   = w.get("claim_count",0)+1
            w.setdefault("payout_history",[]).insert(0, entry)
    save_workers(workers)

def mock_razorpay(worker, amount):
    ref = f"ZNVST-{uuid.uuid4().hex[:10].upper()}"
    return {"success":True,"reference_id":ref,"amount_inr":round(amount,2),
            "upi_handle":f"{worker.get('phone','9999999999')}@upi",
            "status":"processed","processed_at":datetime.utcnow().isoformat()}

ATTRIBUTION = {"heavy_rain":0.375,"extreme_heat":0.25,"severe_aqi":0.30,
               "civic_disruption":0.625,"dead_zone":0.25,"flash_flood":0.75}

def process_claim(claim):
    zone_id, trigger_type = claim["zone_id"], claim["trigger_type"]
    workers = get_zone_workers(zone_id)
    if not workers: return {"claim_id":claim["id"],"status":"no_workers","results":[]}
    results = []
    for w in workers:
        wid      = w["worker_id"]
        pin      = w.get("pin_code", zone_id)
        expected = ZONE_EARNINGS.get(pin, 800)
        actual   = round(expected * random.uniform(0.30, 0.75), 2)
        shortfall= max(0, expected - actual)
        if shortfall <= 0:
            results.append({"worker_id":wid,"decision":"no_shortfall","payout":0})
            write_claim({"pending_claim_id":claim["id"],"worker_id":wid,"zone_id":zone_id,
                "trigger_type":trigger_type,"expected_earnings":expected,"actual_earnings":actual,
                "shortfall":0,"attribution_pct":0,"attributable_loss":0,"coverage_rate":0.8,
                "payout_amount":0,"fraud_score":0,"fraud_flags":"[]","decision":"no_shortfall","razorpay_ref":None})
            continue
        attr     = ATTRIBUTION.get(trigger_type, 0.30)
        att_loss = round(shortfall * attr, 2)
        payout   = round(att_loss * 0.8, 2)
        tier_key = w.get("tier","standard").lower()
        payout   = min(payout, max(0, TIER_MAX.get(tier_key,800) - w.get("total_claimed",0)))
        if payout <= 0:
            results.append({"worker_id":wid,"decision":"limit_reached","payout":0}); continue
        if ADVANCED:
            fr = compute_advanced_fraud_score(w, zone_id, trigger_type, actual, datetime.utcnow().isoformat())
            score, decision, flags_json = fr["fraud_score"], fr["decision"], json.dumps(fr["flags_fired"])
        else:
            score = 20 if w.get("claim_count",0)>4 else 0
            decision = "hold_and_verify" if score>=66 else "pay_and_flag" if score>=31 else "auto_approve"
            flags_json = "[]"
        ref = None
        if decision in ("auto_approve","pay_and_flag"):
            rp  = mock_razorpay(w, payout); ref = rp["reference_id"]
            update_worker(wid, payout, {
                "date":datetime.utcnow().strftime("%Y-%m-%d"),
                "amount":round(payout),
                "trigger":trigger_type.replace("_"," ").title()+f" — Zone {zone_id}",
                "status":"paid","ref":ref})
        write_claim({"pending_claim_id":claim["id"],"worker_id":wid,"zone_id":zone_id,
            "trigger_type":trigger_type,"expected_earnings":expected,"actual_earnings":actual,
            "shortfall":shortfall,"attribution_pct":attr,"attributable_loss":att_loss,
            "coverage_rate":0.8,"payout_amount":payout,"fraud_score":score,
            "fraud_flags":flags_json,"decision":decision,"razorpay_ref":ref})
        results.append({"worker_id":wid,"decision":decision,"payout":round(payout),
            "fraud_score":score,"expected_earnings":expected,"actual_earnings":round(actual),
            "shortfall":round(shortfall),"attribution_pct":f"{round(attr*100)}%","razorpay_ref":ref})
    mark_done(claim["id"])
    return {"claim_id":claim["id"],"zone_id":zone_id,"trigger_type":trigger_type,
            "workers_affected":len(workers),"results":results,"processed_at":datetime.utcnow().isoformat()}

@router.post("/process-all")
def process_all():
    init_tables(); claims = get_pending_claims()
    if not claims: return {"message":"No pending claims","processed":0}
    results = [process_claim(c) for c in claims]
    total   = sum(r["payout"] for res in results for r in res.get("results",[]) if r.get("decision") in ("auto_approve","pay_and_flag"))
    return {"message":f"Processed {len(results)} claim(s)","processed":len(results),"total_payout":round(total,2),"results":results}

@router.post("/process-demo")
def process_demo():
    init_tables()
    conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
    cur.execute("INSERT INTO pending_claims (trigger_event_id,zone_id,trigger_type,payout_rate,details_json) VALUES (?,?,?,?,?)",
        (0,"560034","dead_zone",0.70,json.dumps({"orders_last_30min":3,"expected_baseline":18,"velocity_ratio":0.17,"is_simulated":True,"zone_name":"Koramangala, Bengaluru"})))
    claim_id = cur.lastrowid; conn.commit(); conn.close()
    result = process_claim({"id":claim_id,"zone_id":"560034","trigger_type":"dead_zone","payout_rate":0.70})
    return {"message":"Demo claim processed — check worker dashboard for payout","demo_claim":result}

@router.get("/history")
def history(limit:int=20):
    conn = get_db()
    if not conn: return {"claims":[]}
    try:
        cur = conn.cursor(); cur.execute("SELECT * FROM processed_claims ORDER BY processed_at DESC LIMIT ?",(limit,))
        rows = [dict(r) for r in cur.fetchall()]
    except: rows = []
    conn.close(); return {"count":len(rows),"claims":rows}

@router.get("/stats")
def stats():
    conn = get_db()
    if not conn: return {}
    try:
        cur = conn.cursor()
        cur.execute("""SELECT COUNT(*) as total,
            SUM(CASE WHEN decision='auto_approve' THEN 1 ELSE 0 END) as auto_approved,
            SUM(CASE WHEN decision='pay_and_flag' THEN 1 ELSE 0 END) as flagged,
            SUM(CASE WHEN decision='hold_and_verify' THEN 1 ELSE 0 END) as held,
            SUM(CASE WHEN decision='no_shortfall' THEN 1 ELSE 0 END) as no_shortfall,
            ROUND(SUM(payout_amount),2) as total_paid,
            ROUND(AVG(fraud_score),1) as avg_fraud_score FROM processed_claims""")
        row = dict(cur.fetchone())
    except Exception as e: row = {"error":str(e)}
    conn.close(); return row

@router.get("/fraud-analysis/{worker_id}")
def fraud_analysis(worker_id:str):
    conn = get_db()
    if not conn: return {"message":"DB not initialised"}
    try:
        cur = conn.cursor()
        cur.execute("SELECT fraud_score,fraud_flags,decision,processed_at FROM processed_claims WHERE worker_id=? ORDER BY processed_at DESC LIMIT 1",(worker_id,))
        row = cur.fetchone()
        if not row: return {"message":f"No claims for {worker_id}"}
        result = dict(row); result["fraud_flags"] = json.loads(result.get("fraud_flags") or "[]")
    except Exception as e: result = {"error":str(e)}
    conn.close(); return result
