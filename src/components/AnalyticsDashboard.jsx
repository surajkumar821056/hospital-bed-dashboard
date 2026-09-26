import React, { useState } from "react";
import { TrendingUp, Activity, Users, ShieldAlert, BarChart3, Clock, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { getAggregateStats } from "../utils/mockData";
import { getOccupancyForecast } from "../utils/demandPredictor";

export default function AnalyticsDashboard({ hospitals, lang }) {
  const [selectedBedType, setSelectedBedType] = useState("all");
  const [reportCompiling, setReportCompiling] = useState(false);

  const trans = {
    en: {
      title: "City-Wide Capacity & Demand Analytics",
      sub: "Historical tracking and predictive modeling for municipal hospital resources.",
      trendHeading: "7-Day Bed Occupancy Forecast & Spike Risk",
      statsHeader: "Aggregate Bed Occupancy Summary",
      bedTypeSel: "Filter Forecast by Bed Type",
      day: "Day",
      occupancy: "Projected Occupancy",
      spikeRisk: "Spike Risk",
      status: "Status",
      predictedRate: "Occupancy Rate",
      activeAdmissions: "Active Admissions",
      totalBeds: "Total City Capacity",
      utilizationRate: "Avg Utilization",
      demandIndex: "Demand Index"
    },
    hi: {
      title: "शहर-व्यापी क्षमता और मांग विश्लेषण",
      sub: "नगरपालिका अस्पताल संसाधनों के लिए ऐतिहासिक ट्रैकिंग और भविष्य कहनेवाला मॉडलिंग।",
      trendHeading: "7-दिवसीय बेड अधिभोग पूर्वानुमान और स्पाइक जोखिम",
      statsHeader: "कुल बेड अधिभोग सारांश",
      bedTypeSel: "बेड प्रकार द्वारा पूर्वानुमान फ़िल्टर करें",
      day: "दिन",
      occupancy: "अनुमानित अधिभोग",
      spikeRisk: "स्पाइक जोखिम",
      status: "स्थिति",
      predictedRate: "अधिभोग दर",
      activeAdmissions: "सक्रिय प्रवेश",
      totalBeds: "कुल शहर क्षमता",
      utilizationRate: "औसत उपयोग",
      demandIndex: "मांग सूचकांक"
    }
  };

  const t = trans[lang] || trans.en;

  const forecasts = getOccupancyForecast(hospitals, selectedBedType);
  const aggregateStats = getAggregateStats(hospitals);

  // Capacity stats
  let totalBedsCount = 0;
  let totalAvailableCount = 0;
  Object.values(aggregateStats).forEach(b => {
    totalBedsCount += b.total;
    totalAvailableCount += b.available;
  });

  const totalOccupied = totalBedsCount - totalAvailableCount;
  const avgUtilization = totalBedsCount > 0 ? Math.round((totalOccupied / totalBedsCount) * 100) : 0;

  // Saturation index calculation
  const icuStats = aggregateStats.icu;
  const icuUtilization = icuStats.total > 0 ? ((icuStats.total - icuStats.available) / icuStats.total) * 100 : 0;
  const demandIndex = Math.min(100, Math.round(icuUtilization * 0.7 + avgUtilization * 0.3));

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Critical":
        return { backgroundColor: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border)" };
      case "Warning":
        return { backgroundColor: "var(--warning-bg)", color: "var(--warning)", border: "1px solid var(--warning-border)" };
      default:
        return { backgroundColor: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success-border)" };
    }
  };

  const handleCompileReport = () => {
    setReportCompiling(true);
    setTimeout(() => {
      setReportCompiling(false);
      alert("Municipal Emergency Healthcare Daily Report compiled successfully! Download queued.");
    }, 1500);
  };



  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* KPI Cards Strip */}
      <div className="card-grid">
        <div className="kpi-card info">
          <span className="kpi-title">{t.activeAdmissions}</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{totalOccupied}</span>
            <Users size={20} className="text-secondary" />
          </div>
        </div>

        <div className="kpi-card info">
          <span className="kpi-title">{t.totalBeds}</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{totalBedsCount}</span>
            <Activity size={20} className="text-secondary" />
          </div>
        </div>

        <div className="kpi-card warning">
          <span className="kpi-title">{t.utilizationRate}</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{avgUtilization}%</span>
            <TrendingUp size={20} className="text-secondary" />
          </div>
        </div>

        <div className="kpi-card danger">
          <span className="kpi-title">{t.demandIndex}</span>
          <div className="kpi-value-row">
            <span className="kpi-value">{demandIndex} / 100</span>
            <ShieldAlert size={20} className="text-secondary" />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
        
        {/* SVG Occupancy Forecast Line Chart */}
        <div className="chart-container glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "1rem" }}>
            <h4 style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <BarChart3 size={18} className="text-primary" />
              <span>{t.trendHeading}</span>
            </h4>

            {/* Bed Type Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                {t.bedTypeSel}:
              </span>
              <select 
                className="select-filter" 
                style={{ minWidth: "100px", padding: "0.25rem", fontSize: "0.75rem" }}
                value={selectedBedType}
                onChange={(e) => setSelectedBedType(e.target.value)}
              >
                <option value="all">All Beds</option>
                <option value="general">General</option>
                <option value="icu">ICU</option>
                <option value="ventilator">Ventilators</option>
                <option value="isolation">Isolation</option>
              </select>
            </div>
          </div>

          <div style={{ position: "relative", width: "100%", height: "220px" }}>
            <svg viewBox="0 0 500 220" style={{ width: "100%", height: "100%" }}>
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="40" y1="65" x2="480" y2="65" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="40" y1="110" x2="480" y2="110" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="40" y1="155" x2="480" y2="155" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="40" y1="190" x2="480" y2="190" stroke="var(--border)" strokeWidth="2" />
              
              {/* Y Labels */}
              <text x="30" y="24" textAnchor="end" fontSize="9" fill="var(--text-secondary)" fontFamily="var(--font-mono)">100%</text>
              <text x="30" y="69" textAnchor="end" fontSize="9" fill="var(--text-secondary)" fontFamily="var(--font-mono)">75%</text>
              <text x="30" y="114" textAnchor="end" fontSize="9" fill="var(--text-secondary)" fontFamily="var(--font-mono)">50%</text>
              <text x="30" y="159" textAnchor="end" fontSize="9" fill="var(--text-secondary)" fontFamily="var(--font-mono)">25%</text>

              {/* Occupancy Rate bars */}
              {forecasts.map((f, idx) => {
                const x = 55 + idx * 60;
                const height = (f.occupancyRate / 100) * 170;
                const y = 190 - height;
                const color = f.status === "Critical" ? "var(--danger)" : f.status === "Warning" ? "var(--warning)" : "var(--primary)";

                return (
                  <g key={idx}>
                    <rect x={x} y={y} width="22" height={height} fill={color} rx="3" style={{ opacity: 0.8 }} />
                    <circle cx={x + 11} cy={190 - (f.spikeProbability / 100) * 170} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                    <text x={x + 11} y="206" textAnchor="middle" fontSize="9" fill="var(--text-secondary)">{f.day}</text>
                  </g>
                );
              })}

              {/* Spike probability path */}
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                points={forecasts.map((f, idx) => `${55 + idx * 60 + 11},${190 - (f.spikeProbability / 100) * 170}`).join(" ")}
              />
            </svg>
          </div>
        </div>



      </div>

      {/* Digital Data Log Table */}
      <div className="glass" style={{
        padding: "1.5rem",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        backgroundColor: "var(--surface)"
      }}>
        <h4 style={{ fontWeight: 700, margin: 0 }}>Demand Prediction Data Log (Linear Regression Model)</h4>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <th style={{ padding: "8px" }}>{t.day}</th>
                <th style={{ padding: "8px" }}>{t.occupancy}</th>
                <th style={{ padding: "8px" }}>{t.predictedRate}</th>
                <th style={{ padding: "8px" }}>{t.spikeRisk}</th>
                <th style={{ padding: "8px" }}>{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((f, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  <td style={{ padding: "10px 8px", fontWeight: 600 }}>{f.day}</td>
                  <td style={{ padding: "10px 8px", fontFamily: "var(--font-mono)" }}>
                    {f.occupied} / {f.capacity}
                  </td>
                  <td style={{ padding: "10px 8px", fontFamily: "var(--font-mono)" }}>{f.occupancyRate}%</td>
                  <td style={{ padding: "10px 8px", fontFamily: "var(--font-mono)", color: f.spikeProbability > 60 ? "var(--danger)" : "inherit" }}>
                    {f.spikeProbability}%
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <span 
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        ...getStatusBadgeStyle(f.status)
                      }}
                    >
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Municipal Breakdown & Compiler Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
        
        {/* Cases Today Breakdown Grid */}
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h4 style={{ fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} className="text-primary" />
            <span>Emergency Referral Cases Today</span>
          </h4>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "var(--surface-hover)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Cardiac Arrest</span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--danger)", marginTop: "2px" }}>8 Cases</div>
            </div>
            <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "var(--surface-hover)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Respiratory Trauma</span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--warning)", marginTop: "2px" }}>12 Cases</div>
            </div>
            <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "var(--surface-hover)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Road Accidents</span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)", marginTop: "2px" }}>15 Cases</div>
            </div>
            <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "var(--surface-hover)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Neonatal / Pediatric</span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--success)", marginTop: "2px" }}>4 Cases</div>
            </div>
          </div>
        </div>

        {/* Municipal Reports Compiler Action Card */}
        <div className="glass" style={{
          padding: "1.5rem",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "1rem"
        }}>
          <div>
            <h4 style={{ fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <FileSpreadsheet size={18} className="text-primary" />
              <span>Municipal Report Compiler</span>
            </h4>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4, marginTop: "8px" }}>
              Aggregate all current hospital bed logs, simulated ambulance routes, and active SOS triage indices into an exportable Excel spreadsheet for government evaluation.
            </p>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: "100%", padding: "10px" }}
            onClick={handleCompileReport}
            disabled={reportCompiling}
          >
            <span>{reportCompiling ? "Compiling Logs..." : "Compile Daily Health Report"}</span>
          </button>
        </div>

      </div>

    </div>
  );
}
