// MechIQ — Oil Sample Email Ingestion Worker
// Receives emails sent to oilsamples+{companyId8chars}@mechiq.com.au
// Parses the report with Claude AI and writes to Supabase oil_samples table
//
// Deploy:
//   wrangler deploy oil-email-ingest.js --name mechiq-oil-email --compatibility-date 2026-04-11
//
// Required env vars (Cloudflare dashboard → Worker → Settings → Variables):
//   SUPABASE_URL         = https://mrnrnlhdjdanchzwafwl.supabase.co
//   SUPABASE_SERVICE_KEY = <service role key>
//   ANTHROPIC_API_KEY    = <your Anthropic API key>
//
// Cloudflare Email Routing setup:
//   Dashboard → mechiq.com.au → Email → Email Routing → Routing Rules
//   Add rule: oilsamples+* → Send to Worker → mechiq-oil-email

export default {
  async email(message, env) {
    try {
      // ── 1. Extract company ID from the +tag ──────────────────────────────
      const to = message.to || '';
      // e.g. oilsamples+ed9265d1@mechiq.com.au  →  ed9265d1
      const tagMatch = to.match(/oilsamples\+([a-f0-9\-]{8,36})@/i);
      if (!tagMatch) {
        console.error('No company tag found in:', to);
        return;
      }
      const companyTag = tagMatch[1]; // first 8 chars of UUID

      // ── 2. Look up full company ID ───────────────────────────────────────
      const SUPABASE_URL = env.SUPABASE_URL;
      const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY;
      const sbHeaders = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      };

      const companyRes = await fetch(
        `${SUPABASE_URL}/rest/v1/companies?id=like.${companyTag}%&select=id,name`,
        { headers: sbHeaders }
      );
      const companies = await companyRes.json();
      if (!companies?.length) {
        console.error('Company not found for tag:', companyTag);
        return;
      }
      const company = companies[0];

      // ── 3. Read email body + attachments ─────────────────────────────────
      // Read raw email as text (Cloudflare Email Workers provide a ReadableStream)
      const rawEmail = await new Response(message.raw).text();

      // Extract text parts and any PDF attachments (base64)
      const emailText = extractEmailText(rawEmail);
      const pdfAttachments = extractPDFAttachments(rawEmail);

      // ── 4. Send to Claude for parsing ─────────────────────────────────────
      const parsed = await parseWithClaude(
        emailText,
        pdfAttachments,
        env.ANTHROPIC_API_KEY,
        company.name
      );

      if (!parsed || !parsed.samples?.length) {
        console.log('No samples extracted from email for company:', company.name);
        return;
      }

      // ── 5. Write samples to Supabase ──────────────────────────────────────
      const rows = parsed.samples.map(s => ({
        company_id:       company.id,
        asset_name:       s.asset_name || null,
        asset_number:     s.asset_number || null,
        component:        s.component || 'Engine',
        sample_date:      s.sample_date || new Date().toISOString().split('T')[0],
        oil_hours:        s.oil_hours ? parseFloat(s.oil_hours) : null,
        unit_hours:       s.unit_hours ? parseFloat(s.unit_hours) : null,
        viscosity_40:     s.viscosity_40 ? parseFloat(s.viscosity_40) : null,
        viscosity_100:    s.viscosity_100 ? parseFloat(s.viscosity_100) : null,
        water_ppm:        s.water_ppm ? parseFloat(s.water_ppm) : null,
        soot_percent:     s.soot_percent ? parseFloat(s.soot_percent) : null,
        tbn:              s.tbn ? parseFloat(s.tbn) : null,
        tan:              s.tan ? parseFloat(s.tan) : null,
        wear_metals:      s.wear_metals || null,
        ai_condition:     s.ai_condition || 'Normal',
        ai_analysis:      s.ai_analysis || null,
        ai_recommendations: s.ai_recommendations || null,
        lab_name:         parsed.lab_name || null,
        source:           'email',
      }));

      const insertRes = await fetch(
        `${SUPABASE_URL}/rest/v1/oil_samples`,
        {
          method: 'POST',
          headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
          body: JSON.stringify(rows),
        }
      );

      if (!insertRes.ok) {
        const err = await insertRes.text();
        console.error('Supabase insert failed:', err);
      } else {
        console.log(`✅ Inserted ${rows.length} oil sample(s) for ${company.name}`);
      }

    } catch (err) {
      console.error('Oil email ingest error:', err);
    }
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractEmailText(rawEmail) {
  // Strip MIME headers, get readable text parts
  // Remove quoted-printable encoding
  let text = rawEmail
    .replace(/=\r\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Extract plain text parts between Content-Type boundaries
  const textParts = [];
  const lines = text.split('\n');
  let inTextPart = false;
  let inHtmlPart = false;
  let partLines = [];

  for (const line of lines) {
    if (line.toLowerCase().includes('content-type: text/plain')) {
      inTextPart = true; inHtmlPart = false; partLines = [];
    } else if (line.toLowerCase().includes('content-type: text/html')) {
      if (inTextPart && partLines.length) textParts.push(partLines.join('\n'));
      inTextPart = false; inHtmlPart = true; partLines = [];
    } else if (line.startsWith('--') && line.length > 3) {
      if (inTextPart && partLines.length) textParts.push(partLines.join('\n'));
      inTextPart = false; inHtmlPart = false;
    } else if (inTextPart) {
      partLines.push(line);
    }
  }
  if (inTextPart && partLines.length) textParts.push(partLines.join('\n'));

  return textParts.join('\n\n') || text.slice(0, 8000);
}

function extractPDFAttachments(rawEmail) {
  // Extract base64-encoded PDF attachments
  const attachments = [];
  const pdfRegex = /Content-Type:\s*application\/pdf[^]*?Content-Transfer-Encoding:\s*base64\s*\r?\n\r?\n([A-Za-z0-9+/=\s]+)/gi;
  let match;
  while ((match = pdfRegex.exec(rawEmail)) !== null) {
    const b64 = match[1].replace(/\s/g, '');
    if (b64.length > 100) attachments.push(b64);
    if (attachments.length >= 3) break; // max 3 PDFs
  }
  return attachments;
}

async function parseWithClaude(emailText, pdfAttachments, apiKey, companyName) {
  const systemPrompt = `You are an oil analysis expert. Extract oil sample data from lab reports.
Return ONLY valid JSON with this exact structure:
{
  "lab_name": "string or null",
  "samples": [
    {
      "asset_name": "string or null",
      "asset_number": "string or null",
      "component": "Engine|Hydraulic|Transmission|Differential|Coolant|Gearbox|Other",
      "sample_date": "YYYY-MM-DD or null",
      "oil_hours": number or null,
      "unit_hours": number or null,
      "viscosity_40": number or null,
      "viscosity_100": number or null,
      "water_ppm": number or null,
      "soot_percent": number or null,
      "tbn": number or null,
      "tan": number or null,
      "wear_metals": {
        "fe": number, "cu": number, "al": number, "si": number,
        "cr": number, "ni": number, "pb": number, "sn": number,
        "mo": number, "na": number, "k": number, "b": number
      },
      "ai_condition": "Normal|Monitor|Critical",
      "ai_analysis": "2-3 sentence summary of findings",
      "ai_recommendations": "Specific action recommendations"
    }
  ]
}
Only include metals that are present in the report. Return null for unknown values. No markdown.`;

  const userContent = [];

  // Add PDF attachments if present
  for (const pdf of pdfAttachments.slice(0, 2)) {
    userContent.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdf }
    });
  }

  userContent.push({
    type: 'text',
    text: `Company: ${companyName}\n\nEmail content:\n${emailText.slice(0, 6000)}\n\nExtract all oil samples from this lab report.`
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    console.error('Claude API error:', await res.text());
    return null;
  }

  const data = await res.json();
  const text = data.content?.map(c => c.text || '').join('') || '';

  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    console.error('Failed to parse Claude response:', text.slice(0, 500));
    return null;
  }
}
