# MechIQ Analytics Microservice

Python FastAPI service providing predictive analytics and AI insights for MechIQ.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /predict/service | Predict next service dates per asset |
| POST | /analyse/fleet | AI fleet health analysis via Claude |
| GET | /missing-prestarts/{company_id} | Detect missing prestarts by hours |

## Deploy to Railway (free tier)

1. Create account at railway.app
2. New Project → Deploy from GitHub repo
3. Set environment variables:
   - `SUPABASE_KEY` = your Supabase service role key
   - `ANTHROPIC_API_KEY` = your Anthropic API key
4. Railway auto-detects Python and deploys

## Deploy to Render (free tier)

1. Create account at render.com
2. New Web Service → connect GitHub
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Set environment variables same as above

## Local development

```bash
cd mechiq_analytics
pip install -r requirements.txt
SUPABASE_KEY=xxx ANTHROPIC_API_KEY=xxx uvicorn main:app --reload
```

API docs at: http://localhost:8000/docs

## Calling from MechIQ React app

```javascript
const ANALYTICS_URL = 'https://your-service.railway.app';

// Get missing prestarts
const res = await fetch(`${ANALYTICS_URL}/missing-prestarts/${companyId}`);
const data = await res.json();

// Get AI fleet analysis
const res = await fetch(`${ANALYTICS_URL}/analyse/fleet`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ company_id: companyId, analysis_type: 'fleet_health' })
});
```
