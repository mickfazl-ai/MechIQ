/**
 * MechIQ Daily Report Worker
 * Cloudflare Worker with cron trigger — sends fleet health email daily
 * 
 * Secrets to set in Cloudflare dashboard:
 *   SUPABASE_URL      = https://mrnrnlhdjdanchzwafwl.supabase.co
 *   SUPABASE_KEY      = <your supabase service role key>
 *   RESEND_API_KEY    = <your resend.com API key>
 *   RESEND_FROM       = reports@mechiq.com.au  (or any verified Resend sender)
 */

// ─── CRON trigger — runs daily (configured in wrangler.toml) ─────────────────
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runReports(env));
  },

  // Manual trigger for testing: POST /test with { company_id, emails }
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
    }

    const { company_id, emails } = await request.json().catch(() => ({}));
    if (!company_id) {
      return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers: corsHeaders });
    }

    try {
      await sendReportForCompany(env, company_id, emails);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }
};

// ─── Run reports for all enabled companies ────────────────────────────────────
async function runReports(env) {
  const configs = await sbFetch(env, '/rest/v1/daily_report_config?enabled=eq.true&select=*');
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5); // e.g. "07:00"

  for (const cfg of configs) {
    // Only send if current UTC time matches configured send_time (within 30 min window)
    if (cfg.send_time && !timesMatch(cfg.send_time, hhmm)) continue;
    try {
      await sendReportForCompany(env, cfg.company_id, cfg.emails, cfg);
    } catch(e) {
      console.error('Report failed for', cfg.company_id, e.message);
    }
  }
}

// ─── Build and send report for one company ────────────────────────────────────
async function sendReportForCompany(env, companyId, emails, cfg = {}) {
  if (!emails?.length) return;

  // Fetch all data in parallel
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const [assets, workOrders, schedules, company, recentErrors] = await Promise.all([
    sbFetch(env, `/rest/v1/assets?company_id=eq.${companyId}&select=id,name,asset_number,type,status,hours,location&order=name.asc`),
    sbFetch(env, `/rest/v1/work_orders?company_id=eq.${companyId}&status=eq.open&select=id,title,asset_name,priority,created_at&order=created_at.desc`),
    sbFetch(env, `/rest/v1/service_schedules?company_id=eq.${companyId}&select=id,asset_name,service_name,interval_type,interval_value,next_due_value,status&order=next_due_value.asc`),
    sbFetch(env, `/rest/v1/companies?id=eq.${companyId}&select=*`).then(d => d[0] || {}),
    sbFetch(env, `/rest/v1/error_logs?occurred_at=gte.${yesterday}&order=occurred_at.desc&limit=20`).catch(() => []),
  ]);

  const date = new Date().toLocaleDateString('en-AU', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const html = buildEmail({ assets, workOrders, schedules, company, date, cfg, recentErrors });
  const companyName = company.company_name || company.name || 'Your Fleet';

  // Send via Resend
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    env.RESEND_FROM || 'MechIQ Reports <reports@mechiq.com.au>',
      to:      emails,
      subject: `MechIQ Fleet Report — ${companyName} · ${new Date().toLocaleDateString('en-AU')}`,
      html,
    }),
  });
  if (!emailRes.ok) {
    const errText = await emailRes.text();
    throw new Error(`Resend failed: ${emailRes.status} ${errText}`);
  }
}

// ─── Build HTML email ─────────────────────────────────────────────────────────
function buildEmail({ assets, workOrders, schedules, company, date, cfg, recentErrors = [] }) {
  const inc = (k) => cfg[k] !== false; // default true if not set

  // Status counts
  const statusCounts = assets.reduce((acc, a) => {
    const s = (a.status || 'Unknown').toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const downAssets = assets.filter(a => /down|offline|breakdown/i.test(a.status || ''));
  const activeAssets = assets.filter(a => /active|running|ok/i.test(a.status || ''));

  // Upcoming services (next 14 days by hours prediction)
  const upcoming = schedules
    .filter(s => s.status !== 'overdue' && s.next_due_value)
    .slice(0, 15);
  const overdue = schedules.filter(s => s.status === 'overdue');

  const criticalWOs = workOrders.filter(w => /critical|high/i.test(w.priority || ''));
  const normalWOs   = workOrders.filter(w => !/critical|high/i.test(w.priority || ''));

  const statusBadge = (s) => {
    const map = { active:'#22c55e', running:'#22c55e', down:'#ef4444', maintenance:'#f59e0b', standby:'#6366f1', offline:'#ef4444' };
    const col = map[(s||'').toLowerCase()] || '#94a3b8';
    return `<span style="background:${col}18;color:${col};border:1px solid ${col}33;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">${s||'Unknown'}</span>`;
  };
  const prioBadge = (p) => {
    const map = { critical:'#ef4444', high:'#f59e0b', medium:'#3b82f6', low:'#22c55e' };
    const col = map[(p||'medium').toLowerCase()] || '#3b82f6';
    return `<span style="background:${col}18;color:${col};border:1px solid ${col}33;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">${p||'Medium'}</span>`;
  };

  const section = (icon, title, content) => `
    <div style="margin-bottom:28px;">
      <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">
        ${icon} ${title}
      </div>
      ${content}
    </div>`;

  const tableStart = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead><tr style="background:#f8fafc;">`;
  const th = (t) => `<th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">${t}</th>`;
  const td = (t, extra='') => `<td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;${extra}">${t||'—'}</td>`;
  const tableEnd = `</table>`;

  let body = '';

  // ── Fleet Health ──
  if (inc('include_health')) {
    const statsHtml = `
      <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
        <div style="flex:1;min-width:100px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#16a34a;">${activeAssets.length}</div>
          <div style="font-size:11px;color:#166534;font-weight:600;">Active</div>
        </div>
        <div style="flex:1;min-width:100px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#dc2626;">${downAssets.length}</div>
          <div style="font-size:11px;color:#991b1b;font-weight:600;">Down</div>
        </div>
        <div style="flex:1;min-width:100px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#d97706;">${overdue.length}</div>
          <div style="font-size:11px;color:#92400e;font-weight:600;">Services Overdue</div>
        </div>
        <div style="flex:1;min-width:100px;background:#fef3f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#ef4444;">${criticalWOs.length}</div>
          <div style="font-size:11px;color:#b91c1c;font-weight:600;">Critical WOs</div>
        </div>
      </div>
      ${assets.length > 0 ? `
      ${tableStart}${th('Asset')}${th('Status')}${th('Hours')}${th('Location')}</tr></thead><tbody>
      ${assets.map(a => `<tr>${td(`<strong>${a.name||''}</strong>${a.asset_number?` <span style="color:#94a3b8;font-size:11px;">${a.asset_number}</span>`:''}`)}${td(statusBadge(a.status))}${td(a.hours ? a.hours.toLocaleString() + ' hrs' : '—')}${td(a.location||'—')}</tr>`).join('')}
      </tbody>${tableEnd}` : '<p style="color:#94a3b8;font-size:13px;">No assets registered.</p>'}`;
    body += section('📊', `Fleet Health — ${assets.length} Assets`, statsHtml);
  }

  // ── Upcoming Services ──
  if (inc('include_services') && (upcoming.length > 0 || overdue.length > 0)) {
    let svcHtml = '';
    if (overdue.length > 0) {
      svcHtml += `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#991b1b;font-weight:600;">
        ⚠️ ${overdue.length} service${overdue.length!==1?'s':''} OVERDUE — immediate attention required
      </div>
      ${tableStart}${th('Asset')}${th('Service')}${th('Overdue by')}</tr></thead><tbody>
      ${overdue.slice(0,10).map(s => `<tr style="background:#fef2f2;">${td(`<strong>${s.asset_name||''}</strong>`)}${td(s.service_name||'')}${td('Overdue','color:#dc2626;font-weight:700;')}</tr>`).join('')}
      </tbody>${tableEnd}`;
    }
    if (upcoming.length > 0) {
      svcHtml += `<div style="margin-top:${overdue.length?'16px':'0'}">
      ${tableStart}${th('Asset')}${th('Service')}${th('Due at')}${th('Interval')}</tr></thead><tbody>
      ${upcoming.map(s => `<tr>${td(`<strong>${s.asset_name||''}</strong>`)}${td(s.service_name||'')}${td(s.next_due_value ? s.next_due_value.toLocaleString() + ' ' + (s.interval_type||'hrs') : '—')}${td(s.interval_value ? 'Every ' + s.interval_value + ' ' + (s.interval_type||'hrs') : '—')}</tr>`).join('')}
      </tbody>${tableEnd}</div>`;
    }
    body += section('🔧', 'Service Schedule', svcHtml);
  }

  // ── Open Work Orders ──
  if (inc('include_workorders') && workOrders.length > 0) {
    const woHtml = `
      ${criticalWOs.length > 0 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#991b1b;font-weight:600;">🚨 ${criticalWOs.length} Critical/High priority work order${criticalWOs.length!==1?'s':''} require urgent attention</div>` : ''}
      ${tableStart}${th('Title')}${th('Asset')}${th('Priority')}${th('Raised')}</tr></thead><tbody>
      ${workOrders.slice(0,20).map(w => `<tr>${td(`<strong>${w.title||''}</strong>`)}${td(w.asset_name||'—')}${td(prioBadge(w.priority))}${td(w.created_at ? new Date(w.created_at).toLocaleDateString('en-AU') : '—')}</tr>`).join('')}
      ${workOrders.length > 20 ? `<tr><td colspan="4" style="padding:8px 12px;color:#94a3b8;font-size:12px;text-align:center;">...and ${workOrders.length-20} more work orders</td></tr>` : ''}
      </tbody>${tableEnd}`;
    body += section('⚠️', `Open Work Orders (${workOrders.length})`, woHtml);
  } else if (inc('include_workorders')) {
    body += section('✅', 'Work Orders', '<p style="color:#22c55e;font-size:13px;font-weight:600;">No open work orders — fleet is clear.</p>');
  }

  // ── Downtime ──
  if (inc('include_downtime') && downAssets.length > 0) {
    const dtHtml = `${tableStart}${th('Asset')}${th('Type')}${th('Hours')}</tr></thead><tbody>
      ${downAssets.map(a => `<tr style="background:#fef2f2;">${td(`<strong>${a.name||''}</strong>`)}${td(a.type||'—')}${td(a.hours ? a.hours.toLocaleString() + ' hrs' : '—')}</tr>`).join('')}
      </tbody>${tableEnd}`;
    body += section('🔴', `Downtime — ${downAssets.length} Asset${downAssets.length!==1?'s':''} Down`, dtHtml);
  }

  // ── Error digest ──
  if (recentErrors.length > 0) {
    const errByType = recentErrors.reduce((a, e) => {
      try { const t = JSON.parse(e.context||'{}').type||'unknown'; a[t]=(a[t]||0)+1; } catch(x) {}
      return a;
    }, {});
    const topErrors = recentErrors.slice(0, 5);
    const errHtml = `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#991b1b;font-weight:600;">
        ⚠️ ${recentErrors.length} error${recentErrors.length!==1?'s':''} detected in the last 24 hours
      </div>
      ${tableStart}${th('Error')}${th('Type')}${th('Time')}${th('AI Fix?')}</tr></thead><tbody>
      ${topErrors.map(e => {
        let errType = 'unknown';
        try { errType = JSON.parse(e.context||'{}').type||'unknown'; } catch(x) {}
        return `<tr><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;max-width:280px;overflow:hidden;text-overflow:ellipsis;">${(e.message||'').slice(0,80)}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;">${errType}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:11px;color:#64748b;">${new Date(e.occurred_at).toLocaleTimeString('en-AU')}</td><td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;">${e.ai_analysis ? '✅ Yes' : '<a href="https://www.mechiq.com.au" style="color:#7c3aed;font-size:11px;">Analyse →</a>'}</td></tr>`;
      }).join('')}
      ${recentErrors.length > 5 ? `<tr><td colspan="4" style="padding:8px 12px;color:#94a3b8;font-size:12px;text-align:center;">...and ${recentErrors.length-5} more — view all in Admin → Error Log</td></tr>` : ''}
      </tbody>${tableEnd}`;
    body += section('🔍', `App Errors (${recentErrors.length} in last 24hrs)`, errHtml);
  }

  return \`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:680px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:#0f172a;padding:24px 28px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:20px;font-weight:900;letter-spacing:4px;color:#fff;">MECH<span style="color:#1e88e5;">IQ</span></div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;margin-top:3px;">Daily Fleet Report</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:13px;color:rgba(255,255,255,0.7);">${company.company_name||company.name||'Fleet'}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.35);">${date}</div>
      </div>
    </div>
    <!-- Body -->
    <div style="padding:28px;">
      ${body}
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <span>Powered by <strong style="color:#1e293b;">MechIQ</strong> — mechiq.com.au</span>
      <a href="https://www.mechiq.com.au" style="color:#1e88e5;text-decoration:none;font-weight:600;">Open Dashboard →</a>
    </div>
  </div>
</body></html>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mrnrnlhdjdanchzwafwl.supabase.co';

async function sbFetch(env, path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: { 'apikey': env.SUPABASE_KEY, 'Authorization': `Bearer ${env.SUPABASE_KEY}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`${SUPABASE_URL}${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

function timesMatch(target, current) {
  // Match within 30 min window
  const [th, tm] = target.split(':').map(Number);
  const [ch, cm] = current.split(':').map(Number);
  const tMins = th * 60 + tm;
  const cMins = ch * 60 + cm;
  return Math.abs(tMins - cMins) <= 30;
}
