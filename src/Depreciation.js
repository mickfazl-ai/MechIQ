import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CONDITION_RATINGS = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Good" },
  { value: 4, label: "Very Good" },
  { value: 5, label: "Excellent" },
];

const DEPRECIATION_METHODS = [
  { value: "straight_line", label: "Straight Line" },
  { value: "declining_balance", label: "Declining Balance" },
  { value: "units_of_production", label: "Units of Production" },
];

function formatCurrency(val) {
  if (!val && val !== 0) return "—";
  return "$" + Number(val).toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

function formatPercent(val) {
  return val.toFixed(1) + "%";
}

const CYAN = "#00c2e0";
const GREEN = "#00c264";
const RED = "#e94560";
const ORANGE = "#ff6b00";
const YELLOW = "#ffc800";
const BG = "#0a0f0f";
const CARD = "#0d1515";
const BORDER = "#1a2f2f";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#0d1515",
          border: "1px solid #1a2f2f",
          padding: "10px 16px",
          borderRadius: 8,
          fontFamily: "Barlow, sans-serif",
          fontSize: 13,
        }}
      >
        <p style={{ color: "#8fa8a8", marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, margin: "2px 0" }}>
            {p.name}: {p.name.toLowerCase().includes("hour") ? p.value.toFixed(2) : formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Depreciation() {
  const [inputs, setInputs] = useState({
    assetName: "",
    purchasePrice: "",
    purchaseYear: new Date().getFullYear() - 3,
    currentHours: "",
    expectedAnnualHours: "",
    salvageValue: "",
    conditionRating: 3,
    depreciationMethod: "declining_balance",
    expectedLifeHours: 15000,
    salePrices: [{ year: "", price: "" }],
  });

  const [results, setResults] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [calculated, setCalculated] = useState(false);

  const handleChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setCalculated(false);
  };

  const handleSalePriceChange = (index, field, value) => {
    const updated = [...inputs.salePrices];
    updated[index][field] = value;
    setInputs((prev) => ({ ...prev, salePrices: updated }));
  };

  const addSalePrice = () => {
    setInputs((prev) => ({
      ...prev,
      salePrices: [...prev.salePrices, { year: "", price: "" }],
    }));
  };

  const removeSalePrice = (index) => {
    setInputs((prev) => ({
      ...prev,
      salePrices: prev.salePrices.filter((_, i) => i !== index),
    }));
  };

  const calculate = () => {
    const purchase = parseFloat(inputs.purchasePrice) || 0;
    const salvage = parseFloat(inputs.salvageValue) || 0;
    const currentHours = parseFloat(inputs.currentHours) || 0;
    const annualHours = parseFloat(inputs.expectedAnnualHours) || 1000;
    const lifeHours = parseFloat(inputs.expectedLifeHours) || 15000;
    const conditionFactor = inputs.conditionRating / 5;
    const yearsOwned = new Date().getFullYear() - parseInt(inputs.purchaseYear);
    const yearsRemaining = Math.max(
      0,
      ((lifeHours - currentHours) / annualHours)
    );

    // Depreciation rate based on method
    let annualDepRate;
    if (inputs.depreciationMethod === "straight_line") {
      const usefulLife = lifeHours / annualHours;
      annualDepRate = (purchase - salvage) / usefulLife / purchase;
    } else if (inputs.depreciationMethod === "declining_balance") {
      annualDepRate = 0.25; // 25% DB common for plant & equipment
    } else {
      // units of production
      annualDepRate = annualHours / lifeHours;
    }

    // Current book value
    let currentValue;
    if (inputs.depreciationMethod === "straight_line") {
      const annualDep = (purchase - salvage) / (lifeHours / annualHours);
      currentValue = Math.max(salvage, purchase - annualDep * yearsOwned);
    } else if (inputs.depreciationMethod === "declining_balance") {
      currentValue = Math.max(salvage, purchase * Math.pow(1 - annualDepRate, yearsOwned));
    } else {
      const perHourDep = (purchase - salvage) / lifeHours;
      currentValue = Math.max(salvage, purchase - perHourDep * currentHours);
    }

    // Condition adjustment
    const conditionAdjustment = (conditionFactor - 0.6) * 0.3; // ±15% from condition
    const marketValue = Math.max(salvage, currentValue * (1 + conditionAdjustment));

    // Cost per hour
    const totalDepreciation = purchase - currentValue;
    const costPerHour = currentHours > 0 ? totalDepreciation / currentHours : 0;

    // 5-year projection
    const projectionData = [];
    let projValue = currentValue;
    const currentYear = new Date().getFullYear();
    for (let i = 0; i <= 5; i++) {
      let dep;
      if (inputs.depreciationMethod === "straight_line") {
        const annualDep = (purchase - salvage) / (lifeHours / annualHours);
        dep = annualDep;
      } else if (inputs.depreciationMethod === "declining_balance") {
        dep = projValue * annualDepRate;
      } else {
        const perHourDep = (purchase - salvage) / lifeHours;
        dep = perHourDep * annualHours;
      }

      projectionData.push({
        year: (currentYear + i).toString(),
        bookValue: Math.max(salvage, projValue),
        marketValue: Math.max(salvage, projValue * (1 + conditionAdjustment)),
        annualDep: i === 0 ? 0 : dep,
      });

      projValue = Math.max(salvage, projValue - dep);
    }

    // Annual depreciation table
    const annualTable = projectionData.slice(1).map((row, i) => ({
      year: row.year,
      openingValue: projectionData[i].bookValue,
      depreciation: row.annualDep,
      closingValue: row.bookValue,
      cumulative: purchase - row.bookValue,
    }));

    // Break-even / replacement recommendation
    const utilizationPct = (currentHours / lifeHours) * 100;
    let recommendation;
    if (utilizationPct >= 85 || yearsRemaining < 1) {
      recommendation = { type: "replace", label: "Replace Now", color: RED };
    } else if (utilizationPct >= 65 || costPerHour > (purchase / lifeHours) * 1.5) {
      recommendation = { type: "monitor", label: "Monitor Closely", color: ORANGE };
    } else {
      recommendation = { type: "keep", label: "Keep Operating", color: GREEN };
    }

    // Compare to actual sale prices
    const saleComparisons = inputs.salePrices
      .filter((s) => s.year && s.price)
      .map((s) => {
        const saleYear = parseInt(s.year);
        const salePrice = parseFloat(s.price);
        const yearsAtSale = saleYear - parseInt(inputs.purchaseYear);
        let bookAtSale;
        if (inputs.depreciationMethod === "straight_line") {
          const annualDep = (purchase - salvage) / (lifeHours / annualHours);
          bookAtSale = Math.max(salvage, purchase - annualDep * yearsAtSale);
        } else if (inputs.depreciationMethod === "declining_balance") {
          bookAtSale = Math.max(salvage, purchase * Math.pow(1 - annualDepRate, yearsAtSale));
        } else {
          const perHourDep = (purchase - salvage) / lifeHours;
          bookAtSale = Math.max(salvage, purchase - perHourDep * (yearsAtSale * annualHours));
        }
        return {
          year: saleYear,
          salePrice,
          bookValue: bookAtSale,
          variance: salePrice - bookAtSale,
          variancePct: ((salePrice - bookAtSale) / bookAtSale) * 100,
        };
      });

    setResults({
      currentValue,
      marketValue,
      costPerHour,
      yearsRemaining,
      utilizationPct,
      projectionData,
      annualTable,
      recommendation,
      saleComparisons,
      totalDepreciation,
      depreciatedPct: ((purchase - currentValue) / purchase) * 100,
    });
    setCalculated(true);
  };

  const fetchAiInsight = async () => {
    if (!results) return;
    setAiLoading(true);
    setAiError(null);
    setAiInsight(null);

    const prompt = `You are an expert heavy equipment valuation analyst. Given the following asset data, provide a concise market insight and depreciation commentary.

Asset: ${inputs.assetName || "Heavy Equipment"}
Purchase Price: $${inputs.purchasePrice}
Purchase Year: ${inputs.purchaseYear}
Current Hours: ${inputs.currentHours}
Condition: ${CONDITION_RATINGS.find((c) => c.value === inputs.conditionRating)?.label}
Depreciation Method: ${inputs.depreciationMethod}
Estimated Current Book Value: ${formatCurrency(results.currentValue)}
Estimated Market Value: ${formatCurrency(results.marketValue)}
Cost Per Hour: $${results.costPerHour.toFixed(2)}
Years Remaining Useful Life: ${results.yearsRemaining.toFixed(1)}
Recommendation: ${results.recommendation.label}

Provide:
1. A brief market commentary (2-3 sentences) on typical depreciation for this type of asset
2. Key risk factors affecting value
3. Replacement timing recommendation based on the data
4. One specific action item for the owner

Keep response concise and professional, focused on practical advice for a fleet manager. Max 200 words.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      const text = data.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      setAiInsight(text);
    } catch (err) {
      setAiError("Unable to load AI insight. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const inputStyle = {
    background: "#060b0b",
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    color: "#e0eaea",
    fontFamily: "Barlow, sans-serif",
    fontSize: 14,
    padding: "9px 13px",
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    color: "#8fa8a8",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: 6,
    display: "block",
  };

  const cardStyle = {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 20,
  };

  const statCard = (label, value, color, sub) => (
    <div
      style={{
        background: "#060b0b",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "16px 20px",
        flex: 1,
        minWidth: 160,
      }}
    >
      <div style={{ color: "#8fa8a8", fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ color: color || CYAN, fontSize: 22, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: "#8fa8a8", fontSize: 12, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ fontFamily: "Barlow, sans-serif", color: "#e0eaea", padding: "24px 28px", maxWidth: 1100 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Asset Depreciation Calculator</h1>
        <p style={{ margin: "6px 0 0", color: "#8fa8a8", fontSize: 14 }}>
          Estimate current value, depreciation schedule, and replacement timing
        </p>
      </div>

      {/* Input Section */}
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: CYAN, letterSpacing: "0.04em" }}>
          ASSET DETAILS
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          <div>
            <label style={labelStyle}>Asset Name / Model</label>
            <input
              style={inputStyle}
              placeholder="e.g. Komatsu PC450-8"
              value={inputs.assetName}
              onChange={(e) => handleChange("assetName", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Purchase Price ($)</label>
            <input
              style={inputStyle}
              type="number"
              placeholder="e.g. 450000"
              value={inputs.purchasePrice}
              onChange={(e) => handleChange("purchasePrice", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Purchase Year</label>
            <input
              style={inputStyle}
              type="number"
              placeholder="e.g. 2019"
              value={inputs.purchaseYear}
              onChange={(e) => handleChange("purchaseYear", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Current Hours</label>
            <input
              style={inputStyle}
              type="number"
              placeholder="e.g. 6500"
              value={inputs.currentHours}
              onChange={(e) => handleChange("currentHours", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Expected Annual Hours</label>
            <input
              style={inputStyle}
              type="number"
              placeholder="e.g. 1800"
              value={inputs.expectedAnnualHours}
              onChange={(e) => handleChange("expectedAnnualHours", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Expected Life Hours</label>
            <input
              style={inputStyle}
              type="number"
              placeholder="e.g. 15000"
              value={inputs.expectedLifeHours}
              onChange={(e) => handleChange("expectedLifeHours", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Salvage Value ($)</label>
            <input
              style={inputStyle}
              type="number"
              placeholder="e.g. 30000"
              value={inputs.salvageValue}
              onChange={(e) => handleChange("salvageValue", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Condition Rating</label>
            <select
              style={inputStyle}
              value={inputs.conditionRating}
              onChange={(e) => handleChange("conditionRating", parseInt(e.target.value))}
            >
              {CONDITION_RATINGS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Depreciation Method</label>
            <select
              style={inputStyle}
              value={inputs.depreciationMethod}
              onChange={(e) => handleChange("depreciationMethod", e.target.value)}
            >
              {DEPRECIATION_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Previous Sale Prices */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: CYAN, letterSpacing: "0.04em" }}>
            PREVIOUS SALE PRICES <span style={{ color: "#8fa8a8", fontWeight: 400, fontSize: 12 }}>(Optional — same model)</span>
          </h3>
          <button
            className="btn-primary"
            style={{ padding: "6px 14px", fontSize: 12 }}
            onClick={addSalePrice}
          >
            + Add
          </button>
        </div>
        {inputs.salePrices.map((sale, idx) => (
          <div key={idx} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Sale Year</label>
              <input
                style={inputStyle}
                type="number"
                placeholder="e.g. 2021"
                value={sale.year}
                onChange={(e) => handleSalePriceChange(idx, "year", e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Sale Price ($)</label>
              <input
                style={inputStyle}
                type="number"
                placeholder="e.g. 280000"
                value={sale.price}
                onChange={(e) => handleSalePriceChange(idx, "price", e.target.value)}
              />
            </div>
            {inputs.salePrices.length > 1 && (
              <button
                className="btn-delete"
                style={{ marginTop: 18, padding: "8px 12px", fontSize: 12 }}
                onClick={() => removeSalePrice(idx)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Calculate Button */}
      <div style={{ marginBottom: 28 }}>
        <button
          className="btn-primary"
          style={{ padding: "12px 32px", fontSize: 15, fontWeight: 700 }}
          onClick={calculate}
          disabled={!inputs.purchasePrice || !inputs.currentHours}
        >
          Calculate Depreciation
        </button>
      </div>

      {/* Results */}
      {calculated && results && (
        <>
          {/* Stat Cards */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
            {statCard("Book Value", formatCurrency(results.currentValue), CYAN)}
            {statCard("Market Est.", formatCurrency(results.marketValue), YELLOW)}
            {statCard("Cost / Hour", `$${results.costPerHour.toFixed(2)}`, ORANGE)}
            {statCard(
              "Life Used",
              formatPercent(results.utilizationPct),
              results.utilizationPct >= 85 ? RED : results.utilizationPct >= 65 ? ORANGE : GREEN
            )}
            {statCard("Years Remaining", results.yearsRemaining.toFixed(1) + " yrs", GREEN)}
            <div
              style={{
                background: "#060b0b",
                border: `1px solid ${results.recommendation.color}44`,
                borderRadius: 10,
                padding: "16px 20px",
                flex: 1,
                minWidth: 160,
              }}
            >
              <div style={{ color: "#8fa8a8", fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>Recommendation</div>
              <div
                style={{
                  display: "inline-block",
                  background: results.recommendation.color + "22",
                  color: results.recommendation.color,
                  border: `1px solid ${results.recommendation.color}55`,
                  borderRadius: 20,
                  padding: "5px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {results.recommendation.label}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* 5-Year Value Projection */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#8fa8a8", letterSpacing: "0.05em" }}>
                5-YEAR VALUE PROJECTION
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={results.projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="year" stroke="#8fa8a8" tick={{ fontSize: 12, fontFamily: "Barlow" }} />
                  <YAxis stroke="#8fa8a8" tick={{ fontSize: 11, fontFamily: "Barlow" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Barlow" }} />
                  <Line type="monotone" dataKey="bookValue" stroke={CYAN} strokeWidth={2} dot={{ fill: CYAN, r: 4 }} name="Book Value" />
                  <Line type="monotone" dataKey="marketValue" stroke={YELLOW} strokeWidth={2} strokeDasharray="5 5" dot={{ fill: YELLOW, r: 4 }} name="Market Est." />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Annual Depreciation Bar */}
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#8fa8a8", letterSpacing: "0.05em" }}>
                ANNUAL DEPRECIATION
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={results.annualTable}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="year" stroke="#8fa8a8" tick={{ fontSize: 12, fontFamily: "Barlow" }} />
                  <YAxis stroke="#8fa8a8" tick={{ fontSize: 11, fontFamily: "Barlow" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="depreciation" fill={ORANGE} name="Annual Dep." radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Depreciation Table */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#8fa8a8", letterSpacing: "0.05em" }}>
              ANNUAL DEPRECIATION SCHEDULE
            </h3>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Year", "Opening Value", "Depreciation", "Closing Value", "Cumulative Dep."].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#8fa8a8", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.annualTable.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "10px 14px", color: CYAN, fontWeight: 600 }}>{row.year}</td>
                    <td style={{ padding: "10px 14px" }}>{formatCurrency(row.openingValue)}</td>
                    <td style={{ padding: "10px 14px", color: ORANGE }}>{formatCurrency(row.depreciation)}</td>
                    <td style={{ padding: "10px 14px" }}>{formatCurrency(row.closingValue)}</td>
                    <td style={{ padding: "10px 14px", color: RED }}>{formatCurrency(row.cumulative)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sale Price Comparison */}
          {results.saleComparisons.length > 0 && (
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#8fa8a8", letterSpacing: "0.05em" }}>
                ACTUAL SALE PRICE COMPARISON
              </h3>
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Sale Year", "Sale Price", "Book Value at Sale", "Variance", "Variance %"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#8fa8a8", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.saleComparisons.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "10px 14px", color: CYAN, fontWeight: 600 }}>{row.year}</td>
                      <td style={{ padding: "10px 14px", color: YELLOW }}>{formatCurrency(row.salePrice)}</td>
                      <td style={{ padding: "10px 14px" }}>{formatCurrency(row.bookValue)}</td>
                      <td style={{ padding: "10px 14px", color: row.variance >= 0 ? GREEN : RED }}>
                        {row.variance >= 0 ? "+" : ""}{formatCurrency(row.variance)}
                      </td>
                      <td style={{ padding: "10px 14px", color: row.variancePct >= 0 ? GREEN : RED }}>
                        {row.variancePct >= 0 ? "+" : ""}{formatPercent(row.variancePct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* AI Insight */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#8fa8a8", letterSpacing: "0.05em" }}>
                AI MARKET INSIGHT
              </h3>
              <button
                className="btn-primary"
                style={{ padding: "7px 18px", fontSize: 12 }}
                onClick={fetchAiInsight}
                disabled={aiLoading}
              >
                {aiLoading ? "Analysing..." : aiInsight ? "Refresh Analysis" : "Get AI Insight"}
              </button>
            </div>
            {aiLoading && (
              <div style={{ color: "#8fa8a8", fontSize: 13, padding: "12px 0" }}>
                <span style={{ color: CYAN }}>●</span> Analysing market data for {inputs.assetName || "this asset"}...
              </div>
            )}
            {aiError && <div style={{ color: RED, fontSize: 13 }}>{aiError}</div>}
            {aiInsight && !aiLoading && (
              <div
                style={{
                  background: "#060b0b",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "16px 18px",
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "#c8dada",
                  whiteSpace: "pre-wrap",
                }}
              >
                {aiInsight}
              </div>
            )}
            {!aiInsight && !aiLoading && (
              <div style={{ color: "#8fa8a8", fontSize: 13 }}>
                Click "Get AI Insight" to receive market commentary and recommendations for {inputs.assetName || "this asset"}.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
