import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function formatCurrency(val) {
  if (!val && val !== 0) return "—";
  return "$" + Number(val).toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

const CYAN = "#00ABE4";
const GREEN = "#166534";
const RED = "#dc2626";
const ORANGE = "#e67700";
const CARD = "#ffffff";
const BORDER = "#d6e6f2";

const CONDITIONS = ["Poor", "Fair", "Good", "Very Good", "Excellent"];
const CONDITION_FACTOR = { Poor: 0.5, Fair: 0.7, Good: 0.85, "Very Good": 0.95, Excellent: 1.0 };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#0d1515", border: "1px solid #1a2f2f", borderRadius: 8, padding: "10px 14px" }}>
        <p style={{ margin: "0 0 6px", color: "#3d5166", fontSize: 12 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ margin: "2px 0", color: p.color, fontSize: 12 }}>
            {p.name}: {p.name.toLowerCase().includes("value") || p.name.toLowerCase().includes("dep") ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function statCard(label, value, color) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #d6e6f2", borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ color: "#7a92a8", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ color: color || CYAN, fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function Depreciation({ userRole }) {
  const currentYear = new Date().getFullYear();

  const [inputs, setInputs] = useState({
    assetName: "",
    purchaseYear: currentYear - 3,
    yearPurchased: currentYear - 3,
    assetConditionType: "used",
    purchasePrice: "",
    currentUsage: "",
    annualUsage: "",
    usageUnit: "hrs",
    condition: "Good",
    salvageValue: "",
    expectedLifeUsage: "",
    depreciationMethod: "declining_balance",
  });

  const [results, setResults] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiPredicting, setAiPredicting] = useState(false);
  const [aiPredictError, setAiPredictError] = useState(null);
  const [calculated, setCalculated] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('depreciationHistory') || '[]'); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);

  const handleChange = (field, value) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    setCalculated(false);
  };




  const calculate = () => {
    const purchase = parseFloat(inputs.purchasePrice) || 0;
    const salvage = parseFloat(inputs.salvageValue) || purchase * 0.1;
    const currentUsage = parseFloat(inputs.currentUsage) || 0;
    const annualUsage = parseFloat(inputs.annualUsage) || 1000;
    const lifeUsage = parseFloat(inputs.expectedLifeUsage) || 15000;
    const condFactor = CONDITION_FACTOR[inputs.condition] || 0.85;
    const yearsOwned = currentYear - parseInt(inputs.purchaseYear);
    const method = inputs.depreciationMethod;

    let currentValue = purchase;
    let annualDepRate = 0;

    const usefulLife = lifeUsage / annualUsage;

    if (method === "straight_line") {
      annualDepRate = (purchase - salvage) / usefulLife;
      currentValue = Math.max(salvage, purchase - annualDepRate * yearsOwned);
    } else if (method === "declining_balance") {
      annualDepRate = 2 / usefulLife;
      currentValue = Math.max(salvage, purchase * Math.pow(1 - annualDepRate, yearsOwned));
    } else {
      const perUnitDep = (purchase - salvage) / lifeUsage;
      currentValue = Math.max(salvage, purchase - perUnitDep * currentUsage);
    }

    currentValue = currentValue * condFactor + currentValue * (1 - condFactor) * 0.5;
    currentValue = Math.max(salvage, currentValue);

    const totalDepreciation = purchase - currentValue;
    const costPerUnit = currentUsage > 0 ? totalDepreciation / currentUsage : 0;
    const marketValue = currentValue * (0.9 + condFactor * 0.2);
    const usageRemaining = Math.max(0, lifeUsage - currentUsage);
    const yearsRemaining = annualUsage > 0 ? usageRemaining / annualUsage : 0;
    const utilizationPct = (currentUsage / lifeUsage) * 100;

    let recommendation = { label: "Keep", color: GREEN };
    if (utilizationPct >= 80 || costPerUnit > (purchase / lifeUsage) * 2) recommendation = { label: "Replace", color: RED };
    else if (utilizationPct >= 60) recommendation = { label: "Monitor", color: ORANGE };

    // Work out actual usage per year:
    // Past years: spread currentUsage evenly across years owned
    // Future years: use predicted annualUsage
    const yearPurchased = parseInt(inputs.yearPurchased) || parseInt(inputs.purchaseYear);
    const yearsOwnedActual = Math.max(1, currentYear - yearPurchased);
    const avgHistoricUsage = currentUsage / yearsOwnedActual; // actual avg per year from purchase to now
    const perUnitDep = (purchase - salvage) / lifeUsage;

    // Build full annual table from year purchased through end of life
    const annualTable = [];
    const totalLifeYears = Math.ceil(lifeUsage / annualUsage) + yearsOwnedActual + 2;

    for (let y = 0; y < totalLifeYears; y++) {
      const calYear = yearPurchased + y;
      const isPast = calYear <= currentYear;
      const usageThisYear = isPast ? avgHistoricUsage : annualUsage;
      const cumulativeUsageStart = usageThisYear * y;
      const cumulativeUsageEnd = usageThisYear * (y + 1);

      let openVal, closeVal;
      if (method === "straight_line") {
        const depPerYear = (purchase - salvage) / usefulLife;
        openVal = Math.max(salvage, purchase - depPerYear * y);
        closeVal = Math.max(salvage, purchase - depPerYear * (y + 1));
      } else if (method === "declining_balance") {
        openVal = Math.max(salvage, purchase * Math.pow(1 - annualDepRate, y));
        closeVal = Math.max(salvage, purchase * Math.pow(1 - annualDepRate, y + 1));
      } else {
        // units of production — use actual cumulative usage
        openVal = Math.max(salvage, purchase - perUnitDep * Math.min(cumulativeUsageStart, lifeUsage));
        closeVal = Math.max(salvage, purchase - perUnitDep * Math.min(cumulativeUsageEnd, lifeUsage));
      }

      const dep = Math.max(0, openVal - closeVal);
      if (dep < 0.5 && y > 0) break;

      annualTable.push({
        year: calYear,
        opening: Math.round(openVal),
        depreciation: Math.round(dep),
        closing: Math.round(closeVal),
        usageThisYear: Math.round(usageThisYear),
        cumulativeUsage: Math.round(cumulativeUsageEnd),
        isPast,
      });
    }

    // 5-year projection from now
    const projection = [];
    for (let y = 0; y <= 5; y++) {
      const yr = currentYear + y;
      const totalYearsFromPurchase = (yr - yearPurchased);
      const futureUsage = currentUsage + annualUsage * y;
      let val = purchase;
      if (method === "straight_line") val = Math.max(salvage, purchase - (purchase - salvage) / usefulLife * totalYearsFromPurchase);
      else if (method === "declining_balance") val = Math.max(salvage, purchase * Math.pow(1 - annualDepRate, totalYearsFromPurchase));
      else val = Math.max(salvage, purchase - perUnitDep * Math.min(futureUsage, lifeUsage));
      val = Math.max(salvage, val * condFactor + val * (1 - condFactor) * 0.5);
      const dep = y === 0 ? 0 : (projection[y - 1]?.bookValue || currentValue) - val;
      projection.push({ year: String(yr), bookValue: Math.round(val), depreciation: Math.round(Math.max(0, dep)), marketValue: Math.round(val * 0.95) });
    }


    const newResults = { currentValue: Math.round(currentValue), marketValue: Math.round(marketValue), totalDepreciation: Math.round(totalDepreciation), costPerUnit, yearsRemaining, utilizationPct, recommendation, projection, annualTable, usefulLife };
    setResults(newResults);
    setCalculated(true);
    // Save to history
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString('en-AU'),
      assetName: inputs.assetName,
      purchaseYear: inputs.purchaseYear,
      yearPurchased: inputs.yearPurchased,
      assetConditionType: inputs.assetConditionType,
      purchasePrice: inputs.purchasePrice,
      currentUsage: inputs.currentUsage,
      annualUsage: inputs.annualUsage,
      usageUnit: inputs.usageUnit,
      condition: inputs.condition,
      salvageValue: inputs.salvageValue,
      expectedLifeUsage: inputs.expectedLifeUsage,
      depreciationMethod: inputs.depreciationMethod,
      results: newResults,
    };
    setHistory(prev => {
      const updated = [entry, ...prev].slice(0, 20);
      try { localStorage.setItem('depreciationHistory', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const fetchAiPredict = async () => {
    if (!inputs.assetName) { setAiPredictError("Please enter an asset name / model first"); return; }
    setAiPredicting(true);
    setAiPredictError(null);

    const unit = inputs.usageUnit === "kms" ? "kilometres" : "hours";
    const prompt = `You are an expert heavy equipment and vehicle valuation analyst.

For the asset: "${inputs.assetName}"
Year of Manufacture: ${inputs.purchaseYear}
Year Purchased: ${inputs.yearPurchased}
Asset Condition: ${inputs.assetConditionType === "new" ? "Purchased new" : "Purchased used"}
Purchase Price: ${inputs.purchasePrice ? "$" + inputs.purchasePrice : "unknown"}
Current ${unit}: ${inputs.currentUsage || "unknown"}
Annual ${unit}: ${inputs.annualUsage || "unknown"}
Condition: ${inputs.condition}
Usage unit: ${inputs.usageUnit}

Respond ONLY with a valid JSON object, no markdown, no explanation, no preamble:
{
  "expectedLifeUsage": <number - total life in ${unit}>,
  "salvageValue": <number - estimated salvage value AUD>,
  "recommendedMethod": <"straight_line" or "declining_balance" or "units_of_production">,
  "salePrices": [
    {"year": <number>, "price": <number>, "description": "<context>"}
  ],
  "marketNote": "<1 sentence market summary>"
}`;

    try {
      const { data: { session } } = await (await import("./supabase")).supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch("/api/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      let text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      // Strip any markdown fences
      text = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      // Extract JSON object
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      const parsed = JSON.parse(jsonMatch[0]);

      setInputs(prev => ({
        ...prev,
        expectedLifeUsage: parsed.expectedLifeUsage ? String(parsed.expectedLifeUsage) : prev.expectedLifeUsage,
        salvageValue: parsed.salvageValue ? String(parsed.salvageValue) : prev.salvageValue,
        depreciationMethod: parsed.recommendedMethod || prev.depreciationMethod,

      }));
      if (parsed.marketNote) setAiInsight("📊 " + parsed.marketNote);
    } catch (err) {
      setAiPredictError("AI prediction failed: " + err.message);
    } finally {
      setAiPredicting(false);
    }
  };

  const fetchAiInsight = async () => {
    if (!results) return;
    setAiLoading(true);
    setAiError(null);
    setAiInsight(null);
    const unit = inputs.usageUnit === "kms" ? "KM" : "Hour";
    const prompt = `You are an expert heavy equipment valuation analyst. Provide a concise market insight for fleet managers.

Asset: ${inputs.assetName}
Purchase Price: $${inputs.purchasePrice} | Year of Manufacture: ${inputs.purchaseYear} | Year Purchased: ${inputs.yearPurchased} | ${inputs.assetConditionType === "new" ? "Purchased New" : "Purchased Used"}
Current ${inputs.usageUnit === "kms" ? "KMs" : "Hours"}: ${inputs.currentUsage}
Condition: ${inputs.condition}
Current Book Value: ${formatCurrency(results.currentValue)}
Market Value: ${formatCurrency(results.marketValue)}
Cost Per ${unit}: $${results.costPerUnit.toFixed(2)}
Years Remaining: ${results.yearsRemaining.toFixed(1)}
Recommendation: ${results.recommendation.label}

Provide 4-5 sentences covering:
1. Whether the historic vs predicted usage rate is concerning or reasonable for this asset type
2. Current depreciation trajectory and book vs market value gap
3. Key risk factors at this usage level and age
4. One specific action item for the fleet manager
Max 180 words.`;

    try {
      const { data: { session } } = await (await import("./supabase")).supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch("/api/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 500, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await response.json();
      const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
      setAiInsight(text);
    } catch (err) {
      setAiError("Unable to load AI insight. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const deleteHistoryEntry = (id) => {
    setHistory(prev => {
      const updated = prev.filter(e => e.id !== id);
      try { localStorage.setItem('depreciationHistory', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const loadFromHistory = (entry) => {
    setInputs({
      assetName: entry.assetName,
      purchaseYear: entry.purchaseYear,
      yearPurchased: entry.yearPurchased || entry.purchaseYear,
      assetConditionType: entry.assetConditionType || 'used',
      purchasePrice: entry.purchasePrice,
      currentUsage: entry.currentUsage,
      annualUsage: entry.annualUsage,
      usageUnit: entry.usageUnit,
      condition: entry.condition,
      salvageValue: entry.salvageValue,
      expectedLifeUsage: entry.expectedLifeUsage,
      depreciationMethod: entry.depreciationMethod,
    });
    setResults(entry.results);
    setCalculated(true);
    setShowHistory(false);
  };

  const exportPDF = (entry) => {
    const e = entry || { assetName: inputs.assetName, purchaseYear: inputs.purchaseYear, yearPurchased: inputs.yearPurchased, assetConditionType: inputs.assetConditionType, purchasePrice: inputs.purchasePrice, currentUsage: inputs.currentUsage, annualUsage: inputs.annualUsage, usageUnit: inputs.usageUnit, condition: inputs.condition, depreciationMethod: inputs.depreciationMethod, results: results, date: new Date().toLocaleString('en-AU') };
    if (!e.results) return;
    const r = e.results;
    const unit = e.usageUnit === 'kms' ? 'KMs' : 'Hours';
    const fmt = v => '$' + Number(v).toLocaleString('en-AU', { maximumFractionDigits: 0 });

    const rows = r.annualTable.map(row =>
      `<tr><td>${row.year}</td><td>${fmt(row.opening)}</td><td style="color:#e94560">${fmt(row.depreciation)}</td><td>${fmt(row.closing)}</td></tr>`
    ).join('');

    const projRows = r.projection.map(row =>
      `<tr><td>${row.year}</td><td>${fmt(row.bookValue)}</td><td>${fmt(row.marketValue)}</td><td style="color:#e94560">${fmt(row.depreciation || 0)}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Depreciation Report — ${e.assetName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: #fff; color: #1a1a1a; padding: 32px; font-size: 13px; }
  .header { border-bottom: 3px solid #00c2e0; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 28px; font-weight: 900; letter-spacing: 2px; }
  .brand span { color: #00c2e0; }
  .header-right { text-align: right; color: #666; font-size: 11px; }
  h2 { font-size: 18px; color: #00c2e0; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
  h3 { font-size: 13px; color: #444; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px 16px; }
  .stat-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .stat-value { font-size: 18px; font-weight: 700; color: #1a1a1a; }
  .stat-value.cyan { color: #00c2e0; }
  .stat-value.green { color: #00c264; }
  .stat-value.red { color: #e94560; }
  .stat-value.orange { color: #ff6b00; }
  .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 20px; }
  .info-row { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
  .info-label { color: #888; font-size: 11px; width: 160px; flex-shrink: 0; }
  .info-value { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  th { background: #0d1515; color: #00c2e0; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  tr:nth-child(even) td { background: #fafafa; }
  .rec { display: inline-block; padding: 4px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; }
  .rec.Keep { background: #e6f9ef; color: #00c264; }
  .rec.Monitor { background: #fff3e0; color: #ff6b00; }
  .rec.Replace { background: #fdecea; color: #e94560; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">MECH<span>IQ</span></div>
    <div class="header-right">
      <div>Asset Depreciation Report</div>
      <div>Generated: ${e.date}</div>
      <div>© ${new Date().getFullYear()} Coastline Mechanical</div>
    </div>
  </div>

  <h2>${e.assetName || 'Asset'} — Depreciation Report</h2>

  <h3>Asset Details</h3>
  <div class="info-grid">
    <div class="info-row"><span class="info-label">Make & Model</span><span class="info-value">${e.assetName}</span></div>
    <div class="info-row"><span class="info-label">Year of Manufacture</span><span class="info-value">${e.purchaseYear}</span></div>
    <div class="info-row"><span class="info-label">Year Purchased</span><span class="info-value">${e.yearPurchased || e.purchaseYear}</span></div>
    <div class="info-row"><span class="info-label">Condition Type</span><span class="info-value">${e.assetConditionType === 'new' ? 'Purchased New' : 'Purchased Used'}</span></div>
    <div class="info-row"><span class="info-label">Purchase Price</span><span class="info-value">${fmt(e.purchasePrice)}</span></div>
    <div class="info-row"><span class="info-label">Current ${unit}</span><span class="info-value">${Number(e.currentUsage).toLocaleString()} ${unit}</span></div>
    <div class="info-row"><span class="info-label">Annual ${unit}</span><span class="info-value">${Number(e.annualUsage).toLocaleString()} ${unit}</span></div>
    <div class="info-row"><span class="info-label">Condition Rating</span><span class="info-value">${e.condition}</span></div>
    <div class="info-row"><span class="info-label">Depreciation Method</span><span class="info-value">${e.depreciationMethod?.replace(/_/g, ' ').replace(/\w/g, l => l.toUpperCase())}</span></div>
    <div class="info-row"><span class="info-label">Recommendation</span><span class="info-value"><span class="rec ${r.recommendation.label}">${r.recommendation.label}</span></span></div>
  </div>

  <h3>Summary</h3>
  <div class="stats">
    <div class="stat"><div class="stat-label">Current Book Value</div><div class="stat-value cyan">${fmt(r.currentValue)}</div></div>
    <div class="stat"><div class="stat-label">Market Value</div><div class="stat-value green">${fmt(r.marketValue)}</div></div>
    <div class="stat"><div class="stat-label">Total Depreciation</div><div class="stat-value red">${fmt(r.totalDepreciation)}</div></div>
    <div class="stat"><div class="stat-label">Cost / ${unit === 'KMs' ? 'KM' : 'Hour'}</div><div class="stat-value orange">$${r.costPerUnit.toFixed(2)}</div></div>
    <div class="stat"><div class="stat-label">${unit} Remaining</div><div class="stat-value">${Math.round(Math.max(0, parseFloat(e.expectedLifeUsage || 0) - parseFloat(e.currentUsage || 0))).toLocaleString()}</div></div>
    <div class="stat"><div class="stat-label">Years Remaining</div><div class="stat-value">${r.yearsRemaining.toFixed(1)} yrs</div></div>
  </div>

  <h3>Annual Depreciation Schedule</h3>
  <table>
    <thead><tr><th>Year</th><th>Opening Value</th><th>Depreciation</th><th>Closing Value</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <h3>5-Year Projection</h3>
  <table>
    <thead><tr><th>Year</th><th>Book Value</th><th>Market Value</th><th>Annual Depreciation</th></tr></thead>
    <tbody>${projRows}</tbody>
  </table>

  <div class="footer">Generated by Mech IQ — mechiq.com.au — Coastline Mechanical — This report is an estimate only and should not be used as formal financial advice.</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const inputStyle = { background: "#f8fafc", border: "1px solid #d6e6f2", borderRadius: 8, color: "#e0eaea", fontFamily: "Barlow, sans-serif", fontSize: 14, padding: "9px 13px", width: "100%", outline: "none", boxSizing: "border-box" };
  const labelStyle = { color: "#3d5166", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6, display: "block" };
  const cardStyle = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 };
  const unitLabel = inputs.usageUnit === "kms" ? "KMs" : "Hours";

  return (
    <div style={{ fontFamily: "Barlow, sans-serif", color: "#1a2b3c", padding: "24px 28px", maxWidth: 1100 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a2b3c" }}>Asset Depreciation Calculator</h1>
        <p style={{ margin: "6px 0 0", color: "#8fa8a8", fontSize: 14 }}>Enter asset details — use AI Predict to auto-fill depreciation data</p>
      </div>

      {/* ASSET DETAILS */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#00ABE4", letterSpacing: "0.04em" }}>ASSET DETAILS</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {aiPredictError && <span style={{ color: "#dc2626", fontSize: 12 }}>{aiPredictError}</span>}
            <button
              onClick={fetchAiPredict}
              disabled={aiPredicting || !inputs.assetName}
              style={{ padding: "9px 20px", fontSize: 13, fontWeight: 700, borderRadius: 8, border: aiPredicting || !inputs.assetName ? "1px solid #d6e6f2" : "1px solid #00ABE4", background: aiPredicting || !inputs.assetName ? "#f8fafc" : "#ffffff", color: aiPredicting || !inputs.assetName ? "#b0c4d4" : "#00ABE4", cursor: aiPredicting || !inputs.assetName ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "Barlow, sans-serif", transition: "all 0.15s" }}
              onMouseEnter={e => { if (!aiPredicting && inputs.assetName) { e.currentTarget.style.background = "#00ABE4"; e.currentTarget.style.color = "#ffffff"; }}}
              onMouseLeave={e => { if (!aiPredicting && inputs.assetName) { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.color = "#00ABE4"; }}}
            >
              {aiPredicting
                ? <><span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #4a6a6a", borderTopColor: CYAN, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Predicting...</>
                : "✦ AI Predict"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {/* Asset Name */}
          <div>
            <label style={labelStyle}>Make & Model</label>
            <input style={inputStyle} placeholder="e.g. Komatsu PC450-8" value={inputs.assetName} onChange={e => handleChange("assetName", e.target.value)} />
          </div>

          {/* Purchase Year */}
          <div>
            <label style={labelStyle}>Year of Manufacture</label>
            <input style={inputStyle} type="number" placeholder="e.g. 2022" value={inputs.purchaseYear} onChange={e => handleChange("purchaseYear", e.target.value)} />
          </div>

          {/* Year Purchased */}
          <div>
            <label style={labelStyle}>Year Purchased</label>
            <input style={inputStyle} type="number" placeholder="e.g. 2023" value={inputs.yearPurchased} onChange={e => handleChange("yearPurchased", e.target.value)} />
          </div>

          {/* New or Used */}
          <div>
            <label style={labelStyle}>New or Used</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["new", "used"].map(t => (
                <button key={t} onClick={() => handleChange("assetConditionType", t)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${inputs.assetConditionType === t ? CYAN : BORDER}`, background: inputs.assetConditionType === t ? "#e6f4ff" : "#f8fafc", color: inputs.assetConditionType === t ? "#0077cc" : "#7a92a8", border: `1px solid ${inputs.assetConditionType === t ? "#00ABE4" : "#d6e6f2"}`, fontFamily: "Barlow, sans-serif", fontSize: 13, fontWeight: inputs.assetConditionType === t ? 700 : 400, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Purchase Price */}
          <div>
            <label style={labelStyle}>Purchase Price ($)</label>
            <input style={inputStyle} type="number" placeholder="e.g. 450000" value={inputs.purchasePrice} onChange={e => handleChange("purchasePrice", e.target.value)} />
          </div>

          {/* Usage Unit Toggle */}
          <div>
            <label style={labelStyle}>Usage Unit</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["hrs", "kms"].map(u => (
                <button key={u} onClick={() => handleChange("usageUnit", u)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${inputs.usageUnit === u ? CYAN : BORDER}`, background: inputs.usageUnit === u ? "#e6f4ff" : "#f8fafc", color: inputs.usageUnit === u ? "#0077cc" : "#7a92a8", border: `1px solid ${inputs.usageUnit === u ? "#00ABE4" : "#d6e6f2"}`, fontFamily: "Barlow, sans-serif", fontSize: 13, fontWeight: inputs.usageUnit === u ? 700 : 400, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Current Usage */}
          <div>
            <label style={labelStyle}>Current {unitLabel}</label>
            <input style={inputStyle} type="number" placeholder={inputs.usageUnit === "kms" ? "e.g. 85000" : "e.g. 6500"} value={inputs.currentUsage} onChange={e => handleChange("currentUsage", e.target.value)} />
          </div>

          {/* Annual Usage */}
          <div>
            <label style={labelStyle}>Predicted Annual {unitLabel}</label>
            <input style={inputStyle} type="number" placeholder={inputs.usageUnit === "kms" ? "e.g. 20000" : "e.g. 1800"} value={inputs.annualUsage} onChange={e => handleChange("annualUsage", e.target.value)} />
          </div>

          {/* Condition */}
          <div>
            <label style={labelStyle}>Condition</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CONDITIONS.map(c => (
                <button key={c} onClick={() => handleChange("condition", c)} style={{ padding: "7px 12px", borderRadius: 6, border: `1px solid ${inputs.condition === c ? CYAN : BORDER}`, background: inputs.condition === c ? "#e6f4ff" : "#f8fafc", color: inputs.condition === c ? "#0077cc" : "#7a92a8", border: `1px solid ${inputs.condition === c ? "#00ABE4" : "#d6e6f2"}`, fontFamily: "Barlow, sans-serif", fontSize: 12, fontWeight: inputs.condition === c ? 700 : 400, cursor: "pointer" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* AI-filled fields — shown after predict */}
          <div>
            <label style={labelStyle}>Expected Life {unitLabel} <span style={{ color: "#0077cc", fontSize: 10 }}>(AI filled)</span></label>
            <input style={inputStyle} type="number" placeholder={inputs.usageUnit === "kms" ? "e.g. 300000" : "e.g. 15000"} value={inputs.expectedLifeUsage} onChange={e => handleChange("expectedLifeUsage", e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Salvage Value ($) <span style={{ color: "#0077cc", fontSize: 10 }}>(AI filled)</span></label>
            <input style={inputStyle} type="number" placeholder="e.g. 45000" value={inputs.salvageValue} onChange={e => handleChange("salvageValue", e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Depreciation Method <span style={{ color: "#0077cc", fontSize: 10 }}>(AI filled)</span></label>
            <select style={{ ...inputStyle, cursor: "pointer", background: "#ffffff" }} value={inputs.depreciationMethod} onChange={e => handleChange("depreciationMethod", e.target.value)}>
              <option value="straight_line">Straight Line</option>
              <option value="declining_balance">Declining Balance</option>
              <option value="units_of_production">Units of Production</option>
            </select>
          </div>
        </div>

        {/* AI Market Note */}
        {aiInsight && !calculated && (
          <div style={{ marginTop: 16, background: "#f0f7ff", border: "1px solid #bde0f7", borderRadius: 8, padding: "12px 16px", color: "#1a2b3c", fontSize: 13 }}>
            {aiInsight}
          </div>
        )}
      </div>

      {/* HISTORY + CALCULATE */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={calculate}
          disabled={!inputs.purchasePrice || !inputs.currentUsage || !inputs.expectedLifeUsage}
          style={{ padding: "13px 32px", fontSize: 14, fontWeight: 700, fontFamily: "Barlow, sans-serif", background: !inputs.purchasePrice || !inputs.currentUsage || !inputs.expectedLifeUsage ? "#f8fafc" : "#ffffff", color: !inputs.purchasePrice || !inputs.currentUsage || !inputs.expectedLifeUsage ? "#b0c4d4" : "#00ABE4", border: !inputs.purchasePrice || !inputs.currentUsage || !inputs.expectedLifeUsage ? "1px solid #d6e6f2" : "1px solid #00ABE4", borderRadius: 8, cursor: !inputs.purchasePrice || !inputs.currentUsage || !inputs.expectedLifeUsage ? "not-allowed" : "pointer", letterSpacing: "0.05em", textTransform: "uppercase", transition: "all 0.15s" }}
          onMouseEnter={e => { if (inputs.purchasePrice && inputs.currentUsage && inputs.expectedLifeUsage) { e.currentTarget.style.background = "#00ABE4"; e.currentTarget.style.color = "#ffffff"; }}}
          onMouseLeave={e => { if (inputs.purchasePrice && inputs.currentUsage && inputs.expectedLifeUsage) { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.color = "#00ABE4"; }}}
        >
          Calculate Depreciation
        </button>
        {(!inputs.expectedLifeUsage) && <span style={{ color: "#3d5166", fontSize: 12 }}>Use AI Predict to fill Expected Life {unitLabel} first</span>}
        <button
          onClick={() => setShowHistory(h => !h)}
          style={{ padding: "13px 20px", fontSize: 13, fontWeight: 700, fontFamily: "Barlow, sans-serif", background: "transparent", color: history.length > 0 ? CYAN : "#4a6a6a", border: `1px solid ${history.length > 0 ? CYAN : BORDER}`, borderRadius: 8, cursor: "pointer", letterSpacing: "0.05em" }}
        >
          {showHistory ? "Hide History" : `📋 History (${history.length})`}
        </button>
        {calculated && results && (
          <button
            onClick={() => exportPDF(null)}
            style={{ padding: "13px 20px", fontSize: 13, fontWeight: 700, fontFamily: "Barlow, sans-serif", background: "transparent", color: GREEN, border: `1px solid ${GREEN}`, borderRadius: 8, cursor: "pointer", letterSpacing: "0.05em" }}
          >
            ⬇ Export PDF
          </button>
        )}
      </div>

      {/* HISTORY PANEL */}
      {showHistory && (
        <div style={{ background: "#ffffff", border: "1px solid #d6e6f2", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#1a2b3c", letterSpacing: "0.04em" }}>CALCULATION HISTORY</h3>
          {history.length === 0 ? (
            <p style={{ color: "#7a92a8", fontSize: 13 }}>No calculations saved yet. Run a calculation to save it here.</p>
          ) : (
            <div>
              {history.map(entry => (
                <div key={entry.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #e8f0f7" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#1a2b3c", fontSize: 14, fontWeight: 600 }}>{entry.assetName}</div>
                    <div style={{ color: "#8fa8a8", fontSize: 12, marginTop: 3 }}>
                      {entry.purchaseYear} · {entry.condition} · {Number(entry.currentUsage).toLocaleString()} {entry.usageUnit} · Book Value: <span style={{ color: "#0077cc" }}>${Number(entry.results?.currentValue).toLocaleString()}</span> · <span style={{ color: entry.results?.recommendation?.color }}>{entry.results?.recommendation?.label}</span>
                    </div>
                    <div style={{ color: "#7a92a8", fontSize: 11, marginTop: 2 }}>{entry.date}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
                    <button onClick={() => loadFromHistory(entry)} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, background: "#e6f4ff", border: "1px solid #00ABE4", color: CYAN, borderRadius: 6, cursor: "pointer", fontFamily: "Barlow, sans-serif" }}>Load</button>
                    <button onClick={() => exportPDF(entry)} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, background: "#f0faf5", border: "1px solid #16a34a", color: GREEN, borderRadius: 6, cursor: "pointer", fontFamily: "Barlow, sans-serif" }}>PDF</button>
                    <button onClick={() => deleteHistoryEntry(entry.id)} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, background: "#fff1f1", border: "1px solid #fca5a5", color: RED, borderRadius: 6, cursor: "pointer", fontFamily: "Barlow, sans-serif" }}>✕</button>
                  </div>
                </div>
              ))}
              <button onClick={() => { setHistory([]); try { localStorage.removeItem('depreciationHistory'); } catch {} }} style={{ marginTop: 12, padding: "7px 16px", fontSize: 11, fontWeight: 700, background: "transparent", border: `1px solid ${RED}44`, color: RED, borderRadius: 6, cursor: "pointer", fontFamily: "Barlow, sans-serif" }}>Clear All History</button>
            </div>
          )}
        </div>
      )}

      {/* RESULTS */}
      {results && calculated && (
        <>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
            {statCard("Book Value", formatCurrency(results.currentValue), CYAN)}
            {statCard("Market Value", formatCurrency(results.marketValue), GREEN)}
            {statCard("Total Depreciation", formatCurrency(results.totalDepreciation), RED)}
            {statCard(`Cost / ${inputs.usageUnit === "kms" ? "KM" : "Hour"}`, `$${results.costPerUnit.toFixed(2)}`, ORANGE)}
            {statCard(`${unitLabel} Remaining`, Math.round(Math.max(0, parseFloat(inputs.expectedLifeUsage) - parseFloat(inputs.currentUsage))).toLocaleString(), "#8fa8a8")}
            {statCard("Recommendation", results.recommendation.label, results.recommendation.color)}
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#1a2b3c" }}>5-YEAR VALUE PROJECTION</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={results.projection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f7" />
                  <XAxis dataKey="year" stroke="#7a92a8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#7a92a8" tick={{ fontSize: 11 }} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="bookValue" name="Book Value" stroke={CYAN} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="marketValue" name="Market Value" stroke={GREEN} strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#1a2b3c" }}>ANNUAL DEPRECIATION</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={results.projection.slice(1)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8f0f7" />
                  <XAxis dataKey="year" stroke="#7a92a8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#7a92a8" tick={{ fontSize: 11 }} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="depreciation" name="Depreciation" fill={RED} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Annual table */}
          <div style={{ background: "#ffffff", border: "1px solid #d6e6f2", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a2b3c" }}>ANNUAL DEPRECIATION SCHEDULE</h3>
              <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#8fa8a8" }}>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#f0f7ff", border: "1px solid #00ABE4", borderRadius: 2, marginRight: 5 }} />Historical (actual avg)</span>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#f8fafc", border: "1px solid #d6e6f2", borderRadius: 2, marginRight: 5 }} />Projected</span>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>{["Year", `${unitLabel}/yr`, `Cumulative ${unitLabel}`, "Opening Value", "Depreciation", "Closing Value"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#3d5166", fontSize: 10, fontWeight: 700, borderBottom: "2px solid #d6e6f2", whiteSpace: "nowrap", background: "#E9F1FA", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {results.annualTable.map((row, i) => (
                    <tr key={i} style={{ background: row.isPast ? "#f0f7ff" : (i % 2 === 0 ? "#ffffff" : "#f8fafc"), borderLeft: row.year === new Date().getFullYear() ? `3px solid #00ABE4` : "3px solid transparent" }}>
                      <td style={{ padding: "7px 12px", color: "#1a2b3c", fontWeight: row.year === new Date().getFullYear() ? 700 : 400 }}>
                        {row.year}{row.year === new Date().getFullYear() ? <span style={{ color: CYAN, fontSize: 9, marginLeft: 4 }}>NOW</span> : ""}
                      </td>
                      <td style={{ padding: "7px 12px", color: "#3d5166" }}>{row.usageThisYear?.toLocaleString()}</td>
                      <td style={{ padding: "7px 12px", color: "#3d5166" }}>{row.cumulativeUsage?.toLocaleString()}</td>
                      <td style={{ padding: "7px 12px", color: "#166534", fontWeight: 500 }}>{formatCurrency(row.opening)}</td>
                      <td style={{ padding: "7px 12px", color: "#dc2626", fontWeight: 500 }}>{formatCurrency(row.depreciation)}</td>
                      <td style={{ padding: "7px 12px", color: "#0077cc", fontWeight: 600 }}>{formatCurrency(row.closing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: "#7a92a8", fontSize: 11, marginTop: 10 }}>
              Historical years use actual average usage ({Math.round(parseFloat(inputs.currentUsage || 0) / Math.max(1, new Date().getFullYear() - (parseInt(inputs.yearPurchased) || new Date().getFullYear()))).toLocaleString()} {unitLabel}/yr). Future years use predicted annual {unitLabel}.
            </p>
          </div>

          {/* AI Market Insight */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a2b3c" }}>AI MARKET INSIGHT</h3>
              <button
                onClick={fetchAiInsight}
                disabled={aiLoading}
                style={{ padding: "8px 18px", fontSize: 12, fontWeight: 700, borderRadius: 6, border: "none", background: aiLoading ? "#1a2f2f" : `linear-gradient(135deg, ${CYAN}, #0090a8)`, color: aiLoading ? "#8fa8a8" : "#000", cursor: aiLoading ? "not-allowed" : "pointer", fontFamily: "Barlow, sans-serif" }}
              >
                {aiLoading ? "Analysing..." : aiInsight ? "Refresh" : "Get AI Insight"}
              </button>
            </div>
            {aiError && <div style={{ color: RED, fontSize: 13 }}>{aiError}</div>}
            {aiInsight && !aiLoading && (
              <div style={{ color: "#1a2b3c", fontSize: 13, lineHeight: 1.7, background: "#f8fafc", border: "1px solid #d6e6f2", borderRadius: 8, padding: "12px 16px" }}>
                {aiInsight}
              </div>
            )}
            {!aiInsight && !aiLoading && (
              <p style={{ color: "#7a92a8", fontSize: 13, margin: 0 }}>
                Click "Get AI Insight" for market commentary on {inputs.assetName || "this asset"}.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
