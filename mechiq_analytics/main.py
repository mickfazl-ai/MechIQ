"""
MechIQ Analytics API — Python FastAPI microservice
Deploy to Railway: railway up
Or Render: connect GitHub repo, set start command to: uvicorn main:app --host 0.0.0.0 --port $PORT
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import httpx
import json
from datetime import datetime, timedelta

app = FastAPI(title="MechIQ Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.mechiq.com.au", "https://mechiq.com.au", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = "https://mrnrnlhdjdanchzwafwl.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")  # set in Railway/Render env vars
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ── Supabase helper ────────────────────────────────────────────────────────────
async def sb(path: str, params: dict = None):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/{path}",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
            params=params,
            timeout=10,
        )
        r.raise_for_status()
        return r.json()

# ── Models ────────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    company_id: str
    asset_id: Optional[int] = None

class AIAnalysisRequest(BaseModel):
    company_id: str
    analysis_type: str  # 'service_prediction' | 'fault_pattern' | 'oil_analysis' | 'fleet_health'

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "MechIQ Analytics"}


@app.post("/predict/service")
async def predict_service(req: PredictRequest):
    """
    Predict next service dates for all assets in a company based on
    current hours, daily usage rate (from prestart history) and service intervals.
    """
    # Fetch assets + schedules + prestarts
    assets = await sb("assets", {"company_id": f"eq.{req.company_id}", "select": "id,name,asset_number,hours,status"})
    schedules = await sb("service_schedules", {"company_id": f"eq.{req.company_id}", "select": "*"})
    prestarts = await sb("form_submissions", {
        "company_id": f"eq.{req.company_id}",
        "select": "asset,date,hrs_start",
        "order": "date.desc",
        "limit": "500"
    })

    results = []
    for asset in assets:
        # Calculate average daily hours from last 30 prestart readings
        asset_ps = [p for p in prestarts if p.get("asset") == asset["name"] and p.get("hrs_start")]
        daily_rate = calculate_daily_rate(asset_ps)

        # Find this asset's service schedules
        asset_schedules = [s for s in schedules if s.get("asset_name") == asset["name"]]

        predictions = []
        for sched in asset_schedules:
            if sched.get("interval_type") != "hours":
                continue
            interval = float(sched.get("interval_value", 0))
            last_svc = float(sched.get("last_service_value", 0) or 0)
            current_hrs = float(asset.get("hours", 0) or 0)
            hours_remaining = (last_svc + interval) - current_hrs

            days_until = round(hours_remaining / daily_rate) if daily_rate > 0 else None
            due_date = (datetime.now() + timedelta(days=days_until)).strftime("%Y-%m-%d") if days_until else None

            predictions.append({
                "service_name": sched.get("service_name"),
                "interval_hrs": interval,
                "current_hrs": current_hrs,
                "hours_remaining": round(hours_remaining, 1),
                "days_until_due": days_until,
                "predicted_due_date": due_date,
                "daily_usage_rate": round(daily_rate, 2),
                "status": "overdue" if hours_remaining < 0 else "due_soon" if hours_remaining < interval * 0.1 else "upcoming",
            })

        results.append({
            "asset_id": asset["id"],
            "asset_name": asset["name"],
            "asset_number": asset.get("asset_number"),
            "current_hours": asset.get("hours"),
            "daily_usage_rate": round(daily_rate, 2),
            "predictions": predictions,
        })

    return {"company_id": req.company_id, "generated_at": datetime.now().isoformat(), "assets": results}


@app.post("/analyse/fleet")
async def analyse_fleet(req: AIAnalysisRequest):
    """
    Run AI analysis on fleet data and return insights + recommendations.
    """
    if not ANTHROPIC_KEY:
        raise HTTPException(status_code=503, detail="AI not configured")

    # Fetch data
    assets    = await sb("assets",    {"company_id": f"eq.{req.company_id}", "select": "*"})
    wos       = await sb("work_orders", {"company_id": f"eq.{req.company_id}", "status": "neq.Complete", "select": "id,title,asset_name,priority,created_at"})
    schedules = await sb("service_schedules", {"company_id": f"eq.{req.company_id}", "select": "*"})
    prestarts = await sb("form_submissions", {
        "company_id": f"eq.{req.company_id}",
        "select": "asset,date,hrs_start,defects_found,notes",
        "order": "date.desc", "limit": "100"
    })

    # Build summary for AI
    down_assets  = [a for a in assets if "down" in (a.get("status","") or "").lower()]
    overdue_svcs = [s for s in schedules if "overdue" in (s.get("status","") or "").lower()]
    defect_ps    = [p for p in prestarts if p.get("defects_found")]
    critical_wos = [w for w in wos if (w.get("priority","") or "").lower() in ["critical","high"]]

    prompt = f"""You are a senior fleet maintenance engineer analysing data from MechIQ, a CMMS for Australian heavy industry.

Fleet summary:
- Total assets: {len(assets)}
- Down/offline: {len(down_assets)} ({', '.join(a['name'] for a in down_assets[:5])})
- Overdue services: {len(overdue_svcs)} ({', '.join(s.get('asset_name','') for s in overdue_svcs[:5])})
- Open work orders: {len(wos)} ({len(critical_wos)} critical/high)
- Prestarts with defects (last 100): {len(defect_ps)}

Defect notes from recent prestarts:
{chr(10).join([f"- {p['asset']} ({p['date']}): {p.get('notes','')}" for p in defect_ps[:10] if p.get('notes')])}

Critical work orders:
{chr(10).join([f"- {w['asset_name']}: {w['title']}" for w in critical_wos[:10]])}

Provide a concise fleet health analysis with:
1. CRITICAL ITEMS (immediate action required)
2. KEY RISKS (next 7 days)
3. RECOMMENDATIONS (3-5 specific actions)
4. HEALTH SCORE (0-100 with brief reasoning)

Be specific, practical and brief. Format as JSON with keys: critical_items, key_risks, recommendations, health_score, health_reasoning."""

    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": "claude-sonnet-4-20250514", "max_tokens": 1500, "messages": [{"role": "user", "content": prompt}]},
            timeout=30,
        )
        r.raise_for_status()
        text = r.json()["content"][0]["text"]

    try:
        # Strip markdown if present
        clean = text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        analysis = json.loads(clean)
    except:
        analysis = {"raw": text}

    return {
        "company_id": req.company_id,
        "analysis_type": req.analysis_type,
        "generated_at": datetime.now().isoformat(),
        "data_summary": {
            "total_assets": len(assets),
            "down_assets": len(down_assets),
            "overdue_services": len(overdue_svcs),
            "open_wos": len(wos),
            "defect_prestarts": len(defect_ps),
        },
        "analysis": analysis,
    }


@app.get("/missing-prestarts/{company_id}")
async def missing_prestarts(company_id: str, threshold_hrs: float = 6.0):
    """
    Detect assets that worked today but have no prestart submitted.
    Uses: assets with hours diff > threshold since last prestart.
    """
    today = datetime.now().strftime("%Y-%m-%d")

    assets   = await sb("assets", {"company_id": f"eq.{company_id}", "select": "id,name,asset_number,hours,status"})
    ps_today = await sb("form_submissions", {"company_id": f"eq.{company_id}", "date": f"eq.{today}", "select": "asset,hrs_start"})
    ps_all   = await sb("form_submissions", {"company_id": f"eq.{company_id}", "select": "asset,date,hrs_start", "order": "date.desc", "limit": "500"})

    assets_with_prestart_today = {p["asset"] for p in ps_today}

    missing = []
    for asset in assets:
        if asset["name"] in assets_with_prestart_today:
            continue
        # Find last prestart
        last_ps = next((p for p in ps_all if p["asset"] == asset["name"] and p.get("hrs_start")), None)
        last_hrs = float(last_ps["hrs_start"]) if last_ps else 0
        current_hrs = float(asset.get("hours", 0) or 0)
        hrs_diff = current_hrs - last_hrs

        if hrs_diff >= threshold_hrs:
            missing.append({
                "asset_id":     asset["id"],
                "asset_name":   asset["name"],
                "asset_number": asset.get("asset_number"),
                "current_hours": current_hrs,
                "last_prestart_hours": last_hrs,
                "hours_worked_since_prestart": round(hrs_diff, 1),
                "last_prestart_date": last_ps["date"] if last_ps else None,
                "risk_level": "critical" if hrs_diff >= 16 else "high" if hrs_diff >= 8 else "medium",
            })

    missing.sort(key=lambda x: x["hours_worked_since_prestart"], reverse=True)

    return {
        "company_id": company_id,
        "date": today,
        "threshold_hrs": threshold_hrs,
        "total_assets": len(assets),
        "prestarts_today": len(assets_with_prestart_today),
        "missing_count": len(missing),
        "missing_assets": missing,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────
def calculate_daily_rate(prestarts: list) -> float:
    """Calculate average daily operating hours from prestart readings."""
    if len(prestarts) < 2:
        return 8.0  # assume 8hr default

    # Sort by date descending, take last 30
    sorted_ps = sorted(
        [p for p in prestarts if p.get("hrs_start") and p.get("date")],
        key=lambda p: p["date"],
        reverse=True
    )[:30]

    if len(sorted_ps) < 2:
        return 8.0

    # Calculate daily rate from oldest to newest reading
    try:
        oldest = sorted_ps[-1]
        newest = sorted_ps[0]
        days = (datetime.strptime(newest["date"], "%Y-%m-%d") -
                datetime.strptime(oldest["date"], "%Y-%m-%d")).days
        if days <= 0:
            return 8.0
        hrs_delta = float(newest["hrs_start"]) - float(oldest["hrs_start"])
        return max(0.1, hrs_delta / days)
    except:
        return 8.0


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
