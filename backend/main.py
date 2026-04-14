from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json, os, uuid
from datetime import datetime
import pickle, numpy as np

app = FastAPI(title="Zenvest API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from trigger_pipeline.routes import router as trigger_router
    app.include_router(trigger_router, prefix="/triggers", tags=["triggers"])
    print("✓ Trigger pipeline router loaded")
except Exception as e:
    print(f"⚠ Trigger router not loaded: {e}")

try:
    from claims_engine import router as claims_router
    app.include_router(claims_router, prefix="/claims", tags=["claims"])
    print("✓ Claims engine router loaded")
except Exception as e:
    print(f"⚠ Claims router not loaded: {e}")

ZONE_RISK = {
    "560034":{"name":"Koramangala, Bengaluru","risk_score":8,"disruption_freq":"3–4×/month"},
    "560004":{"name":"Bengaluru Central","risk_score":5,"disruption_freq":"1–2×/month"},
    "400053":{"name":"Andheri West, Mumbai","risk_score":9,"disruption_freq":"4–5×/month"},
    "600042":{"name":"Velachery, Chennai","risk_score":8,"disruption_freq":"3–4×/month"},
    "400050":{"name":"Bandra, Mumbai","risk_score":7,"disruption_freq":"3×/month"},
    "560068":{"name":"JP Nagar, Bengaluru","risk_score":5,"disruption_freq":"1–2×/month"},
    "600091":{"name":"Adyar, Chennai","risk_score":5,"disruption_freq":"1–2×/month"},
    "400069":{"name":"Powai, Mumbai","risk_score":5,"disruption_freq":"1–2×/month"},
    "110075":{"name":"Dwarka, Delhi","risk_score":6,"disruption_freq":"2–3×/month"},
    "500032":{"name":"Kondapur, Hyderabad","risk_score":4,"disruption_freq":"1×/month"},
    "560095":{"name":"Indiranagar, Bengaluru","risk_score":3,"disruption_freq":"0–1×/month"},
    "600040":{"name":"T. Nagar, Chennai","risk_score":4,"disruption_freq":"1×/month"},
    "110001":{"name":"Connaught Place, Delhi","risk_score":2,"disruption_freq":"0–1×/month"},
    "560102":{"name":"Bengaluru South","risk_score":5,"disruption_freq":"1–2×/month"},
    "560001":{"name":"Bengaluru City","risk_score":5,"disruption_freq":"1–2×/month"},
    "560029":{"name":"Rajajinagar, Bengaluru","risk_score":4,"disruption_freq":"1×/month"},
    "560038":{"name":"Whitefield, Bengaluru","risk_score":4,"disruption_freq":"1×/month"},
    "560076":{"name":"Electronic City, Bengaluru","risk_score":3,"disruption_freq":"0–1×/month"},
    "560043":{"name":"Marathahalli, Bengaluru","risk_score":5,"disruption_freq":"1–2×/month"},
    "560037":{"name":"HSR Layout, Bengaluru","risk_score":6,"disruption_freq":"2–3×/month"},
    "560047":{"name":"Jayanagar, Bengaluru","risk_score":4,"disruption_freq":"1×/month"},
    "560011":{"name":"Malleswaram, Bengaluru","risk_score":4,"disruption_freq":"1×/month"},
}
ZONE_PROFILES = {
    "koramangala":{"flood_risk":0.8,"rain_freq":0.7},"indiranagar":{"flood_risk":0.3,"rain_freq":0.5},
    "whitefield":{"flood_risk":0.2,"rain_freq":0.4},"velachery":{"flood_risk":0.7,"rain_freq":0.8},
    "hsr_layout":{"flood_risk":0.4,"rain_freq":0.5},"jp_nagar":{"flood_risk":0.5,"rain_freq":0.5},
    "bandra":{"flood_risk":0.6,"rain_freq":0.6},"andheri":{"flood_risk":0.5,"rain_freq":0.55},
    "dwarka":{"flood_risk":0.3,"rain_freq":0.3},"kondapur":{"flood_risk":0.3,"rain_freq":0.35},
    "t_nagar":{"flood_risk":0.4,"rain_freq":0.6},"adyar":{"flood_risk":0.5,"rain_freq":0.55},
    "bengaluru_central":{"flood_risk":0.5,"rain_freq":0.5},
}
BASE_TIERS=[
    {"name":"Basic","base_premium":29,"max_payout":400,"events":2},
    {"name":"Standard","base_premium":49,"max_payout":800,"events":4},
    {"name":"Pro","base_premium":79,"max_payout":1500,"events":-1},
]
TIER_MAP={"basic":29,"standard":49,"pro":79}

MODEL_PATH = os.path.join(os.path.dirname(__file__), "ml", "model.pkl")
try:
    with open(MODEL_PATH,"rb") as f: premium_model=pickle.load(f)
    print("✓ XGBoost model loaded")
except: premium_model=None; print("⚠ model.pkl not found")

class RiskProfileRequest(BaseModel):
    name:str; phone:str; platform:str; pin_code:str; work_start:str; work_end:str

class ActivatePolicyRequest(BaseModel):
    phone:str; name:str="Delivery Partner"; tier:str; weekly_premium:int; pin_code:str

class PremiumRequest(BaseModel):
    worker_id:str; zone:str; tier:str; month:int; past_claims:int
    fraud_flag:int; hours_per_day:float; sensitivity_index:float

def get_risk_tier(s): return "high" if s>=7 else "medium" if s>=4 else "low"
def compute_hours(ws,we):
    try:
        sh,sm=map(int,ws.split(":")); eh,em=map(int,we.split(":"))
        return max(1,(eh*60+em-sh*60-sm)//60)
    except: return 8
def rec_tier(t): return {"high":"Pro","medium":"Standard","low":"Basic"}[t]
def risk_reasons(zd,month,pc):
    r=[]
    if zd["flood_risk"]>0.6: r.append("high flood risk zone")
    if zd["rain_freq"]>0.6: r.append("high rainfall frequency")
    if month in [6,7,8,9]: r.append("monsoon season — elevated risk")
    if pc==0: r.append("no past claims — loyalty discount applied")
    if pc>3: r.append("elevated claim history")
    return r or ["standard risk profile"]

@app.get("/")
def root(): return {"status":"Zenvest API running","version":"2.0.0"}

@app.post("/api/risk-profile")
def risk_profile(req:RiskProfileRequest):
    zone=ZONE_RISK.get(req.pin_code,{"name":f"Zone {req.pin_code}","risk_score":5,"disruption_freq":"1–2×/month"})
    rs=zone["risk_score"]; rt=get_risk_tier(rs); ah=compute_hours(req.work_start,req.work_end)
    m=1.0
    if rs>=7: m=1.20
    elif rs<=3: m=0.85
    try:
        if int(req.work_start.split(":")[0])>=18 or int(req.work_end.split(":")[0])>=22: m=round(m*1.05,2)
    except: pass
    tiers=[{"name":t["name"],"weekly_premium":round(t["base_premium"]*m),"max_payout":t["max_payout"],"events":t["events"]} for t in BASE_TIERS]
    return {"risk_tier":rt,"risk_score":rs,"zone_name":zone["name"],"active_hours":ah,
            "disruption_frequency":zone["disruption_freq"],"premium_multiplier":m,"tiers":tiers,"recommended_tier":rec_tier(rt)}

@app.post("/api/activate-policy")
def activate_policy(req:ActivatePolicyRequest):
    wid=str(uuid.uuid4())[:8].upper()
    record={"worker_id":wid,"phone":req.phone,"name":req.name,"tier":req.tier,"weekly_premium":req.weekly_premium,
            "pin_code":req.pin_code,"status":"active","activated_at":datetime.utcnow().isoformat(),
            "total_claimed":0,"claim_count":0,"payout_history":[]}
    db="workers.json"
    workers=json.load(open(db)) if os.path.exists(db) else []
    workers.append(record)
    with open(db,"w") as f: json.dump(workers,f,indent=2)
    return {"success":True,"worker_id":wid,"message":f"Policy activated. Welcome to Zenvest! Your {req.tier} plan is now live.","renews_on":"Next Monday"}

@app.get("/api/workers")
def list_workers():
    db="workers.json"
    if not os.path.exists(db): return []
    return json.load(open(db))

@app.post("/calculate-premium")
def calculate_premium(req:PremiumRequest):
    zd=ZONE_PROFILES.get(req.zone.lower().replace(" ","_"),{"flood_risk":0.5,"rain_freq":0.5})
    bp=TIER_MAP.get(req.tier.lower(),49)
    if premium_model:
        features=np.array([[zd["flood_risk"],zd["rain_freq"],1 if req.month in [6,7,8,9] else 0,
                             req.month,req.past_claims,req.fraud_flag,req.hours_per_day,req.sensitivity_index]])
        mult=float(premium_model.predict(features)[0])
    else:
        mult=1.0
        if zd["flood_risk"]>0.6: mult+=0.20
        if req.month in [6,7,8,9]: mult+=0.15
        if req.past_claims==0: mult-=0.10
        if req.fraud_flag==1: mult+=0.25
    mult=round(min(max(mult,0.7),1.5),2)
    return {"worker_id":req.worker_id,"zone":req.zone,"tier":req.tier,"base_price":bp,
            "multiplier":mult,"final_premium":round(bp*mult),
            "risk_reasons":risk_reasons(zd,req.month,req.past_claims),
            "model_used":"xgboost" if premium_model else "rule_based_fallback"}

@app.get("/policy/{worker_id}")
def get_policy(worker_id:str):
    db="workers.json"
    if os.path.exists(db):
        workers=json.load(open(db))
        m=next((w for w in workers if w["worker_id"]==worker_id),None)
        if m:
            zi=ZONE_RISK.get(m.get("pin_code",""),{}); tk=m["tier"].lower()
            return {"worker_id":m["worker_id"],"name":m.get("name","Delivery Partner"),
                    "zone":zi.get("name",f"Zone {m.get('pin_code','')}"),
                    "tier":m["tier"],"status":m["status"],"weekly_premium":m["weekly_premium"],
                    "max_payout":{"basic":400,"standard":800,"pro":1500}.get(tk,800),
                    "days_remaining":4,"coverage_used":round(m.get("total_claimed",0),2),
                    "policy_start":m["activated_at"][:10],"policy_end":"2026-04-17",
                    "payout_history":m.get("payout_history",[])}
    return {"worker_id":worker_id,"name":"Ravi Kumar","zone":"Koramangala, Bengaluru",
            "tier":"standard","status":"active","weekly_premium":54,"max_payout":800,
            "days_remaining":4,"coverage_used":252,"policy_start":"2026-04-04","policy_end":"2026-04-17",
            "payout_history":[
                {"date":"2026-04-10","amount":108,"trigger":"Dead Zone — Koramangala","status":"paid","ref":"ZNVST-DEMO001"},
                {"date":"2026-04-05","amount":72,"trigger":"Heavy Rain — Koramangala","status":"paid","ref":"ZNVST-DEMO002"},
                {"date":"2026-03-29","amount":0,"trigger":"Heat Index — Whitefield","status":"no_shortfall"},
            ]}

@app.get("/policy-summary")
def policy_summary():
    db="workers.json"
    if not os.path.exists(db): return {"total_workers":0,"total_premium_collected":0,"total_claimed":0,"loss_ratio":0}
    workers=json.load(open(db)); active=[w for w in workers if w.get("status")=="active"]
    premiums=sum(w.get("weekly_premium",0) for w in active)
    claimed=sum(w.get("total_claimed",0) for w in active)
    return {"total_workers":len(active),"total_premium_collected":premiums,
            "total_claimed":round(claimed,2),"loss_ratio":round((claimed/premiums*100),1) if premiums>0 else 0,
            "tier_breakdown":{"basic":len([w for w in active if w.get("tier","").lower()=="basic"]),
                              "standard":len([w for w in active if w.get("tier","").lower()=="standard"]),
                              "pro":len([w for w in active if w.get("tier","").lower()=="pro"])}}