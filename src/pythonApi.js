// ─── MechIQ Python Analytics Service ─────────────────────────────────────────
// Central routing for all AI calls → Railway Python service.
//
// Migration from /api/ai-insight:
//   BEFORE: fetch('/api/ai-insight', { method, headers, body })
//   AFTER:  pythonAIFetch({ method, headers, body })  ← same options object
//
// pythonAIFetch accepts the same options shape as the old fetch calls so
// callers only change the function name — no other structural changes needed.
//
// ⚠️  CONFIRM endpoint paths with your Railway FastAPI routes:
//   General AI  →  PYTHON_BASE + /ai/chat
//   Predict     →  PYTHON_BASE + /predict/service
// ─────────────────────────────────────────────────────────────────────────────

const PYTHON_BASE =
  process.env.REACT_APP_PYTHON_API ||
  'https://mechiq-production-615b.up.railway.app';

// ---------------------------------------------------------------------------
// pythonAIFetch — drop-in for fetch('/api/ai-insight', options)
//
// Accepts the same options object { method, headers, body } so existing
// callers only change the function name. Parses the token from
// headers.Authorization and forwards it to the Railway service.
// ---------------------------------------------------------------------------
export function pythonAIFetch(options = {}) {
  const payload =
    typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
  const authHeader =
    options.headers?.Authorization || options.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader || null;

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(`${PYTHON_BASE}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// predictService — usage-rate predictor via /predict/service (Task 1)
//
// How it works:
//   Takes the asset's hours history (readings over days/weeks), calculates
//   the daily/weekly usage rate, then predicts the date each service
//   interval will be reached based on current usage pace.
//
// Request payload:
// {
//   asset_id:      string,
//   asset_name:    string,
//   current_hours: number,
//   hours_history: [{ hours: number, recorded_at: string }],  // from asset_hours_log
//   schedules: [{
//     id:                 string,
//     service_name:       string,
//     interval_value:     number,
//     interval_type:      "hours" | "km",
//     last_service_value: number | null,
//     next_due_value:     number | null,
//   }]
// }
//
// Response (array, one entry per schedule):
// [{
//   schedule_id:    string,    // matches schedule.id
//   predicted_date: string,    // ISO date e.g. "2026-08-14"
//   days_remaining: number,    // days from today
//   daily_rate:     number,    // hours/day based on recent history
//   weekly_rate:    number,    // hours/week
// }]
// Also supports { predictions: [...] } wrapper.
//
// ⚠️  Adjust field names below if your Railway endpoint uses different keys.
// ---------------------------------------------------------------------------
export async function predictService(payload, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${PYTHON_BASE}/predict/service`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || err.detail || `Prediction failed (${resp.status})`);
  }

  const data = await resp.json();
  // Normalise: support raw array or { predictions: [...] } wrapper
  return Array.isArray(data) ? data : (data.predictions || data.results || []);
}
