import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function formatCurrency(val) {
  if (!val && val !== 0) return "—";
  return "$" + Number(val).toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

const CYAN = "#00c2e0";
const GREEN = "#00c264";
const RED = "#e94560";
const ORANGE = "#ff6b00";
const CARD = "#0d1515";
const BORDER = "#1a2f2f";

const CONDITIONS = ["Poor", "Fair", "Good", "Very Good", "Excellent"];
const CONDITION_FACTOR = { Poor: 0.5, Fair: 0.7, Good: 0.85, "Very Good": 0.95, Excellent: 1.0 };

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#0d1515", border: "1px solid #1a2f2f", borderRadius: 8, padding: "10px 14px" }}>
        <p style={{ margin: "0 0 6px", color: "#8fa8a8", fontSize: 12 }}>{label}</p>
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
    <div style={{ background: "#060b0b", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ color: "#8fa8a8", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ color: color || CYAN, fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function Depreciation({ userRole }) {
  const currentYear = new Date().getFullYear();

  const [inputs, setInputs] = useState({
    assetName: "",
    purchaseYear: currentYear - 3,
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

    // 5-year projection
    const projection = [];
    for (let y = 0; y <= 5; y++) {
      const yr = currentYear + y;
      let val = purchase;
      const totalYears = yearsOwned + y;
      if (method === "straight_line") val = Math.max(salvage, purchase - annualDepRate * totalYears);
      else if (method === "declining_balance") val = Math.max(salvage, purchase * Math.pow(1 - annualDepRate, totalYears));
      else { const perUnit = (purchase - salvage) / lifeUsage; val = Math.max(salvage, purchase - perUnit * (currentUsage + annualUsage * y)); }
      val = Math.max(salvage, val * condFactor + val * (1 - condFactor) * 0.5);
      const dep = y === 0 ? 0 : (projection[y - 1]?.bookValue || currentValue) - val;
      projection.push({ year: String(yr), bookValue: Math.round(val), depreciation: Math.round(Math.max(0, dep)), marketValue: Math.round(val * 0.95) });
    }

    // Annual table
    const annualTable = [];
    for (let y = 1; y <= Math.ceil(usefulLife) + yearsOwned; y++) {
      let openVal = purchase;
      let closeVal = purchase;
      if (method === "straight_line") {
        openVal = Math.max(salvage, purchase - annualDepRate * (y - 1));
        closeVal = Math.max(salvage, purchase - annualDepRate * y);
      } else if (method === "declining_balance") {
        openVal = Math.max(salvage, purchase * Math.pow(1 - annualDepRate, y - 1));
        closeVal = Math.max(salvage, purchase * Math.pow(1 - annualDepRate, y));
      } else {
        const pu = (purchase - salvage) / lifeUsage;
        openVal = Math.max(salvage, purchase - pu * annualUsage * (y - 1));
        closeVal = Math.max(salvage, purchase - pu * annualUsage * y);
      }
      const dep = Math.max(0, openVal - closeVal);
      if (dep < 1) break;
      annualTable.push({ year: parseInt(inputs.purchaseYear) + y, opening: Math.round(openVal), depreciation: Math.round(dep), closing: Math.round(closeVal) });
    }


    setResults({ currentValue: Math.round(currentValue), marketValue: Math.round(marketValue), totalDepreciation: Math.round(totalDepreciation), costPerUnit, yearsRemaining, utilizationPct, recommendation, projection, annualTable, usefulLife });
    setCalculated(true);
  };

  const fetchAiPredict = async () => {
    if (!inputs.assetName) { setAiPredictError("Please enter an asset name / model first"); return; }
    setAiPredicting(true);
    setAiPredictError(null);

    const unit = inputs.usageUnit === "kms" ? "kilometres" : "hours";
    const prompt = `You are an expert heavy equipment and vehicle valuation analyst.

For the asset: "${inputs.assetName}"
Purchase Year: ${inputs.purchaseYear}
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
Purchase Price: $${inputs.purchasePrice} (${inputs.purchaseYear})
Current ${inputs.usageUnit === "kms" ? "KMs" : "Hours"}: ${inputs.currentUsage}
Condition: ${inputs.condition}
Current Book Value: ${formatCurrency(results.currentValue)}
Market Value: ${formatCurrency(results.marketValue)}
Cost Per ${unit}: $${results.costPerUnit.toFixed(2)}
Years Remaining: ${results.yearsRemaining.toFixed(1)}
Recommendation: ${results.recommendation.label}

Give 3-4 sentences covering: market trend for this model, key risk factors, and one specific action item. Max 150 words.`;

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

  const inputStyle = { background: "#060b0b", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#e0eaea", fontFamily: "Barlow, sans-serif", fontSize: 14, padding: "9px 13px", width: "100%", outline: "none", boxSizing: "border-box" };
  const labelStyle = { color: "#8fa8a8", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6, display: "block" };
  const cardStyle = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 };
  const unitLabel = inputs.usageUnit === "kms" ? "KMs" : "Hours";

  return (
    <div style={{ fontFamily: "Barlow, sans-serif", color: "#e0eaea", padding: "24px 28px", maxWidth: 1100 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Asset Depreciation Calculator</h1>
        <p style={{ margin: "6px 0 0", color: "#8fa8a8", fontSize: 14 }}>Enter asset details — use AI Predict to auto-fill depreciation data</p>
      </div>

      {/* ASSET DETAILS */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: CYAN, letterSpacing: "0.04em" }}>ASSET DETAILS</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {aiPredictError && <span style={{ color: RED, fontSize: 12 }}>{aiPredictError}</span>}
            <button
              onClick={fetchAiPredict}
              disabled={aiPredicting || !inputs.assetName}
              style={{ padding: "9px 20px", fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", background: aiPredicting || !inputs.assetName ? "#1a2f2f" : `linear-gradient(135deg, ${CYAN}, #0090a8)`, color: aiPredicting || !inputs.assetName ? "#8fa8a8" : "#000", cursor: aiPredicting || !inputs.assetName ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "Barlow, sans-serif" }}
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
                <button key={u} onClick={() => handleChange("usageUnit", u)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${inputs.usageUnit === u ? CYAN : BORDER}`, background: inputs.usageUnit === u ? "#0a2a2a" : "#060b0b", color: inputs.usageUnit === u ? CYAN : "#8fa8a8", fontFamily: "Barlow, sans-serif", fontSize: 13, fontWeight: inputs.usageUnit === u ? 700 : 400, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
                <button key={c} onClick={() => handleChange("condition", c)} style={{ padding: "7px 12px", borderRadius: 6, border: `1px solid ${inputs.condition === c ? CYAN : BORDER}`, background: inputs.condition === c ? "#0a2a2a" : "#060b0b", color: inputs.condition === c ? CYAN : "#8fa8a8", fontFamily: "Barlow, sans-serif", fontSize: 12, fontWeight: inputs.condition === c ? 700 : 400, cursor: "pointer" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* AI-filled fields — shown after predict */}
          <div>
            <label style={labelStyle}>Expected Life {unitLabel} <span style={{ color: CYAN, fontSize: 10 }}>(AI filled)</span></label>
            <input style={inputStyle} type="number" placeholder={inputs.usageUnit === "kms" ? "e.g. 300000" : "e.g. 15000"} value={inputs.expectedLifeUsage} onChange={e => handleChange("expectedLifeUsage", e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Salvage Value ($) <span style={{ color: CYAN, fontSize: 10 }}>(AI filled)</span></label>
            <input style={inputStyle} type="number" placeholder="e.g. 45000" value={inputs.salvageValue} onChange={e => handleChange("salvageValue", e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Depreciation Method <span style={{ color: CYAN, fontSize: 10 }}>(AI filled)</span></label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={inputs.depreciationMethod} onChange={e => handleChange("depreciationMethod", e.target.value)}>
              <option value="straight_line">Straight Line</option>
              <option value="declining_balance">Declining Balance</option>
              <option value="units_of_production">Units of Production</option>
            </select>
          </div>
        </div>

        {/* AI Market Note */}
        {aiInsight && !calculated && (
          <div style={{ marginTop: 16, background: "#060b0b", border: `1px solid ${CYAN}33`, borderRadius: 8, padding: "12px 16px", color: "#c8dada", fontSize: 13 }}>
            {aiInsight}
          </div>
        )}
      </div>

      {/* CALCULATE BUTTON */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={calculate}
          disabled={!inputs.purchasePrice || !inputs.currentUsage || !inputs.expectedLifeUsage}
          style={{ padding: "13px 32px", fontSize: 14, fontWeight: 700, fontFamily: "Barlow, sans-serif", background: !inputs.purchasePrice || !inputs.currentUsage || !inputs.expectedLifeUsage ? "#1a2f2f" : `linear-gradient(135deg, ${CYAN}, #0090a8)`, color: !inputs.purchasePrice || !inputs.currentUsage || !inputs.expectedLifeUsage ? "#8fa8a8" : "#000", border: "none", borderRadius: 8, cursor: !inputs.purchasePrice || !inputs.currentUsage || !inputs.expectedLifeUsage ? "not-allowed" : "pointer", letterSpacing: "0.05em", textTransform: "uppercase" }}
        >
          Calculate Depreciation
        </button>
        {(!inputs.expectedLifeUsage) && <span style={{ marginLeft: 12, color: "#8fa8a8", fontSize: 12 }}>Use AI Predict to fill Expected Life {unitLabel} first</span>}
      </div>

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
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: CYAN }}>5-YEAR VALUE PROJECTION</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={results.projection}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="year" stroke="#8fa8a8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#8fa8a8" tick={{ fontSize: 11 }} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="bookValue" name="Book Value" stroke={CYAN} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="marketValue" name="Market Value" stroke={GREEN} strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: CYAN }}>ANNUAL DEPRECIATION</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={results.projection.slice(1)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="year" stroke="#8fa8a8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#8fa8a8" tick={{ fontSize: 11 }} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="depreciation" name="Depreciation" fill={RED} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Annual table */}
          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: CYAN }}>ANNUAL DEPRECIATION SCHEDULE</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>{["Year", "Opening Value", "Depreciation", "Closing Value"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#8fa8a8", fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {results.annualTable.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#060b0b" : "transparent" }}>
                      <td style={{ padding: "8px 12px", color: "#e0eaea" }}>{row.year}</td>
                      <td style={{ padding: "8px 12px", color: GREEN }}>{formatCurrency(row.opening)}</td>
                      <td style={{ padding: "8px 12px", color: RED }}>{formatCurrency(row.depreciation)}</td>
                      <td style={{ padding: "8px 12px", color: CYAN }}>{formatCurrency(row.closing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Market Insight */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: CYAN }}>AI MARKET INSIGHT</h3>
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
              <div style={{ color: "#c8dada", fontSize: 13, lineHeight: 1.7, background: "#060b0b", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 16px" }}>
                {aiInsight}
              </div>
            )}
            {!aiInsight && !aiLoading && (
              <p style={{ color: "#8fa8a8", fontSize: 13, margin: 0 }}>
                Click "Get AI Insight" for market commentary on {inputs.assetName || "this asset"}.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
