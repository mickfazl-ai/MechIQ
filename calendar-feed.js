// MechIQ — Live Calendar Feed Worker
// Deploy: wrangler deploy calendar-feed.js --name mechiq-calendar-feed
// Route:  mechiq.com.au/api/calendar/*
//
// Env vars needed in Cloudflare dashboard:
//   SUPABASE_URL        = https://mrnrnlhdjdanchzwafwl.supabase.co
//   SUPABASE_SERVICE_KEY = <service role key>

const pad    = (n) => String(n).padStart(2, '0');
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── iCal helpers ──────────────────────────────────────────────────────────────
const clean = (s) => (s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');

const buildVEvent = ({ uid, dtstart, dtend, summary, description, categories }) => [
  'BEGIN:VEVENT',
  `UID:${uid}`,
  `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,
  `DTSTART;VALUE=DATE:${dtstart}`,
  `DTEND;VALUE=DATE:${dtend}`,
  `SUMMARY:${clean(summary)}`,
  `DESCRIPTION:${clean(description)}`,
  `CATEGORIES:${categories}`,
  'STATUS:CONFIRMED',
  'END:VEVENT',
].join('\r\n');

const nextDay = (dateStr) => {
  const d = new Date(dateStr); d.setDate(d.getDate()+1);
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
};

const estimateDate = (s, assetMap) => {
  if (s.next_due_date) return s.next_due_date;
  if ((s.interval_type === 'hours' || s.interval_type === 'km') && s.next_due_value) {
    const asset = assetMap[s.asset_name];
    const currentVal = asset?.hours || s.last_service_value || 0;
    const remaining = s.next_due_value - currentVal;
    if (remaining <= 0) return new Date().toISOString().split('T')[0];
    const dailyRate = s.interval_type === 'km' ? 50 : 10;
    const d = new Date();
    d.setDate(d.getDate() + Math.round(remaining / dailyRate));
    return d.toISOString().split('T')[0];
  }
  return null;
};

const buildCalendar = (companyName, schedules, maintenance, workOrders, assetMap) => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MechIQ//Maintenance Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:MechIQ — ${companyName}`,
    'X-WR-CALDESC:MechIQ Maintenance Schedule — auto-updated',
    'X-WR-TIMEZONE:Australia/Sydney',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  // Service schedules (all upcoming — full year and beyond)
  schedules.forEach(s => {
    const dateStr = estimateDate(s, assetMap);
    if (!dateStr) return;
    const dtstart = dateStr.replace(/-/g,'');
    const type    = s.interval_type === 'hours' || s.interval_type === 'km' ? 'Hours/KM Service' : 'Date-Based Service';
    lines.push(buildVEvent({
      uid:         `mechiq-schedule-${s.id}@mechiq.com.au`,
      dtstart,
      dtend:       nextDay(dateStr),
      summary:     `[Service] ${s.asset_name} — ${s.service_name}`,
      description: `Type: ${type}\nInterval: Every ${s.interval_value} ${s.interval_type}\nNext due: ${s.next_due_value ? s.next_due_value + ' ' + s.interval_type : s.next_due_date}`,
      categories:  'MECHIQ,SERVICE-SCHEDULE',
    }));
  });

  // Planned maintenance tasks
  maintenance.forEach(t => {
    if (!t.next_due) return;
    const dtstart = t.next_due.replace(/-/g,'');
    const isOverdue = t.status === 'Overdue';
    lines.push(buildVEvent({
      uid:         `mechiq-maintenance-${t.id}@mechiq.com.au`,
      dtstart,
      dtend:       nextDay(t.next_due),
      summary:     `[${isOverdue ? 'OVERDUE' : 'Maintenance'}] ${t.asset} — ${t.task}`,
      description: `Status: ${t.status}\nFrequency: ${t.frequency||'—'}\nAssigned: ${t.assigned_to||'Unassigned'}`,
      categories:  `MECHIQ,MAINTENANCE${isOverdue ? ',OVERDUE' : ''}`,
    }));
  });

  // Open work orders with due dates
  workOrders.forEach(w => {
    if (!w.due_date) return;
    const dtstart = w.due_date.replace(/-/g,'');
    lines.push(buildVEvent({
      uid:         `mechiq-wo-${w.id}@mechiq.com.au`,
      dtstart,
      dtend:       nextDay(w.due_date),
      summary:     `[Work Order] ${w.asset||'Fleet'} — ${(w.defect_description||'').slice(0,60)}`,
      description: `Priority: ${w.priority||'—'}\nStatus: ${w.status}\nAssigned: ${w.assigned_to||'Unassigned'}\n${w.defect_description||''}`,
      categories:  `MECHIQ,WORK-ORDER,${(w.priority||'').toUpperCase().replace(/ /g,'-')}`,
    }));
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

// ── Main handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': '*' }
      });
    }

    const url   = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // Expect: /api/calendar/[companyId]/[token]
    if (parts[0] !== 'api' || parts[1] !== 'calendar' || parts.length < 4) {
      return new Response('Not found', { status: 404 });
    }

    const companyId = parts[2];
    const token     = parts[3];

    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY;
    const headers      = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

    // Verify company + token
    const companyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/companies?id=eq.${companyId}&calendar_token=eq.${token}&select=id,name`,
      { headers }
    );
    const companies = await companyRes.json();
    if (!companies || companies.length === 0) {
      return new Response('Unauthorized — invalid or missing calendar token', { status: 401 });
    }
    const company = companies[0];

    // Fetch all data in parallel
    const [schedRes, maintRes, woRes, assetRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/service_schedules?company_id=eq.${companyId}&select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/maintenance?company_id=eq.${companyId}&select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/work_orders?company_id=eq.${companyId}&status=neq.Complete&select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/assets?company_id=eq.${companyId}&select=id,name,hours`, { headers }),
    ]);

    const [schedules, maintenance, workOrders, assets] = await Promise.all([
      schedRes.json(), maintRes.json(), woRes.json(), assetRes.json()
    ]);

    // Build asset lookup map
    const assetMap = {};
    (assets||[]).forEach(a => { assetMap[a.name] = a; });

    const icsContent = buildCalendar(
      company.name,
      schedules||[], maintenance||[], workOrders||[], assetMap
    );

    return new Response(icsContent, {
      headers: {
        'Content-Type':                'text/calendar;charset=utf-8',
        'Content-Disposition':         `attachment; filename="mechiq-${companyId}.ics"`,
        'Cache-Control':               'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};
