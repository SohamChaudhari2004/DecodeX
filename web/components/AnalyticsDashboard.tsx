"use client";

import { useEffect, useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ComposedChart, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, ScatterChart, Scatter, ZAxis } from 'recharts';

type TabId = 'overview' | 'growth' | 'seasonality' | 'imbalance' | 'congestion' | 'forecast' | 'stage3';

const TABS: { id: TabId; label: string; accent: string }[] = [
  { id: 'stage3', label: 'F. STAGE 3', accent: '#ec4899' },
  { id: 'overview', label: 'OVERVIEW', accent: '#e2cca8' },
  { id: 'growth', label: 'A. GROWTH', accent: '#10b981' },
  { id: 'seasonality', label: 'B. SEASONALITY', accent: '#f59e0b' },
  { id: 'imbalance', label: 'C. IMBALANCE', accent: '#38bdf8' },
  { id: 'congestion', label: 'D. CONGESTION', accent: '#ef4444' },
  { id: 'forecast', label: 'E. FORECAST', accent: '#a855f7' },
];

function KPICard({ label, value, sub, color = '#e2cca8', borderColor }: { label: string; value: string; sub?: string; color?: string; borderColor?: string }) {
  return (
    <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-5 rounded-xl relative overflow-hidden group hover:border-white/20 transition-all">
      <div className={`absolute top-0 left-0 w-1 h-full opacity-60`} style={{ backgroundColor: borderColor || color }} />
      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">{label}</div>
      <div className="text-2xl font-light mb-1" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-white/50">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, subtitle, color }: { title: string; subtitle: string; color: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
        <h3 className="text-lg font-light uppercase tracking-widest" style={{ color }}>{title}</h3>
      </div>
      <p className="text-white/40 text-xs leading-relaxed max-w-3xl">{subtitle}</p>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [deep, setDeep] = useState<any>(null);
  const [stage3, setStage3] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    Promise.all([
      fetch('/data/system_diagnostics.json').then(r => r.json()),
      fetch('/data/dashboard_stats.json').then(r => r.json()),
      fetch('/data/deep_analytics.json').then(r => r.json()),
      fetch('/data/stage3_metrics.json').then(r => r.json()),
    ]).then(([d, s, da, st3]) => {
      setDiagnostics(d);
      setStats(s);
      setDeep(da);
      setStage3(st3);
    }).catch(e => console.error("Error loading data:", e));
  }, []);

  if (!diagnostics || !stats || !deep || !stage3) {
    return (
      <div className="w-full flex justify-center items-center p-24 text-white/50 font-mono tracking-widest text-sm">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#e2cca8] animate-pulse" />
          [ COMPUTING SYSTEM DIAGNOSTICS... ]
        </div>
      </div>
    );
  }

  const currentTab = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 text-slate-50 font-sans relative z-20 pb-32">
      {/* HEADER */}
      <div className="mb-8 text-center pt-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#e2cca8] mb-3">Stage 1 – Baseline Network Diagnostics & Growth-Aware Forecasting</div>
        <h2 className="text-2xl md:text-3xl font-light tracking-widest uppercase mb-3 text-white">Dubai Mobility Shift</h2>
        <p className="max-w-3xl mx-auto text-white/40 text-xs leading-relaxed">
          Analytical framework derived from the RTA Board Mandate. Covering all 5 deliverables: Growth Decomposition, Seasonal Insight, Structural Imbalance, Congestion Elasticity, and Baseline Forecast with Allocation Strategy.
        </p>
      </div>

      {/* TAB BAR */}
      <div className="flex justify-center mb-10 overflow-x-auto">
        <div className="bg-[#0f131c]/80 backdrop-blur-md rounded-lg p-1 flex border border-white/5 gap-1 flex-nowrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 md:px-5 py-2 text-[10px] font-bold tracking-widest uppercase transition-all whitespace-nowrap rounded-md ${
                activeTab === tab.id
                  ? 'text-white shadow-lg'
                  : 'text-white/40 hover:text-white/70'
              }`}
              style={activeTab === tab.id ? { backgroundColor: `${tab.accent}30`, boxShadow: `0 0 15px ${tab.accent}40`, color: tab.accent } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="min-h-[60vh]">
        {activeTab === 'stage3' && <Stage3Tab stage3={stage3} />}
        {activeTab === 'overview' && <OverviewTab stats={stats} diagnostics={diagnostics} deep={deep} />}
        {activeTab === 'growth' && <GrowthTab deep={deep} />}
        {activeTab === 'seasonality' && <SeasonalityTab deep={deep} diagnostics={diagnostics} />}
        {activeTab === 'imbalance' && <ImbalanceTab deep={deep} diagnostics={diagnostics} />}
        {activeTab === 'congestion' && <CongestionTab deep={deep} diagnostics={diagnostics} />}
        {activeTab === 'forecast' && <ForecastTab deep={deep} stats={stats} />}
      </div>
    </div>
  );
}

/* ==================== STAGE 3 TAB ==================== */
function Stage3Tab({ stage3 }: { stage3: any }) {
  if (!stage3.audit) return <div className="p-10 text-center text-white/50 animate-pulse">Processing detailed audit data...</div>;

  return (
    <div>
      <SectionHeader
        title="F. Stage 3 Accountability & Stabilization"
        subtitle="Evaluating structural judgments across stages. Out-Of-Time (Q4 2025) data reflects a fundamentally stabilized network requiring an updated 2026 strategy."
        color="#ec4899"
      />
      
      {/* Top Level Metrics */}
      <h4 className="text-[10px] font-bold text-[#ec4899] uppercase tracking-widest mb-4">1. Forecast Performance Audit</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard label="Baseline → Q3 MAPE" value={`${stage3.metrics.mape_stage1_vs_q3}%`} sub="Stage 1 Forecast Error vs Q3 Actuals" color="#ef4444" borderColor="#ef4444" />
        <KPICard label="Recalibrated → Q4 MAPE" value={`${stage3.metrics.mape_stage2_vs_q4}%`} sub="Stage 2 Forecast Error vs Out-of-Time Q4" color="#10b981" borderColor="#10b981" />
        <KPICard label="Accuracy Improvement" value={`${stage3.metrics.improvement} pp`} sub="Model correction magnitude after break" color="#38bdf8" borderColor="#38bdf8" />
      </div>

      {/* Route Type Audit */}
      <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl mb-8">
        <h4 className="text-[10px] font-bold text-[#ec4899] uppercase tracking-widest mb-4">Route-Type Aggregated Error & Directional Bias (Q4 Out-Of-Time)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-widest border-b border-white/10">
                <th className="text-left pb-3">Route Type</th>
                <th className="text-center pb-3">MAPE Error</th>
                <th className="text-center pb-3">Dir. Bias (%)</th>
                <th className="text-left pb-3 pl-3">Reaction Diagnosis</th>
              </tr>
            </thead>
            <tbody>
              {stage3.audit.route_type_performance.map((r: any, i: number) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 text-white/80 font-bold capitalize">{r.type}</td>
                  <td className="py-3 text-center font-mono text-white/90">{r.mape}%</td>
                  <td className="py-3 text-center font-mono">
                    <span style={{ color: r.bias > 5 ? '#ef4444' : r.bias < -5 ? '#38bdf8' : '#10b981' }}>
                      {r.bias > 0 ? '+' : ''}{r.bias}%
                    </span>
                  </td>
                  <td className="py-3 pl-3">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                      r.reaction.includes('Overreaction') ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                      r.reaction.includes('Underreaction') ? 'bg-[#38bdf8]/20 text-[#38bdf8]' :
                      'bg-[#10b981]/20 text-[#10b981]'
                    }`}>
                      {r.reaction}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-[10px] text-white/40 mt-3 p-2 bg-black/20 rounded">
          * Positive bias implies model predicted more demand than actualized (overreaction). Negative bias implies underestimation (underreaction).
        </div>
      </div>

      {/* Strategic Alignment */}
      <div className="bg-[#0f131c]/80 backdrop-blur-md border border-[#f59e0b]/20 p-6 rounded-xl mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]" />
          <h4 className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-widest">2. Elasticity & Strategic Alignment Evaluation</h4>
        </div>
        <div className="flex flex-col gap-4">
          {stage3.audit.strategic_alignment.map((al: any, i: number) => (
            <div key={i} className="bg-black/40 border border-white/5 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-bold text-white/90 uppercase">{al.metric}</div>
                <div className="text-sm font-mono text-[#f59e0b]">{al.value}</div>
              </div>
              <div className="text-[11px] text-white/60 leading-relaxed border-t border-white/5 pt-2">
                {al.interpretation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2026 Forward Strategy */}
      <div className="bg-[#0f131c]/80 backdrop-blur-md border border-[#10b981]/20 p-6 rounded-xl mb-8">
        <h4 className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest mb-4">3. 2026 Forward Target Strategy</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stage3.audit.forward_strategy.map((fs: any, i: number) => (
            <div key={i} className="bg-black/30 border border-[#10b981]/10 p-4 rounded-lg flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">{fs.category}</div>
                <div className="text-xs text-white/80 leading-relaxed mb-4">{fs.proposal}</div>
              </div>
              <div className="py-1 px-2 rounded bg-[#10b981]/10 text-[#10b981] font-mono text-[9px] tracking-widest border border-[#10b981]/20 self-start">
                Impact: {fs.impact}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 2026 Forecasting Confirmation */}
      <div className="text-center bg-[#ec4899]/5 text-white/60 p-4 rounded-xl border border-[#ec4899]/10 text-xs">
        <span className="text-[#ec4899] font-bold">JAN 2026 FORECAST GENERATED:</span> Successfully published baseline models for {Object.keys(stage3.predictions).length} days factoring stabilized parameters.
      </div>
    </div>
  );
}

/* ==================== OVERVIEW TAB ==================== */
function OverviewTab({ stats, diagnostics, deep }: { stats: any; diagnostics: any; deep: any }) {
  return (
    <div>
      <SectionHeader title="System Overview" subtitle="Key performance indicators across the Dubai bus transit network (2022–2025)." color="#e2cca8" />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard label="System CAGR" value={deep.kpi_summary.system_cagr} sub="2022 → H1 2025" color="#10b981" borderColor="#10b981" />
        <KPICard label="Total Routes" value={`${deep.kpi_summary.total_routes}`} sub={`${deep.kpi_summary.total_stops} stops, ${deep.kpi_summary.total_zones} zones`} color="#38bdf8" borderColor="#38bdf8" />
        <KPICard label="Critical Bottlenecks" value={`${deep.kpi_summary.critical_bottlenecks}`} sub={`${deep.kpi_summary.overload_corridors} overload corridors`} color="#ef4444" borderColor="#ef4444" />
        <KPICard label="Avg Congestion" value={stats.average_congestion.value} sub={stats.average_congestion.subtext} color="#f97316" borderColor="#f97316" />
      </div>

      {/* Monthly Congestion Chart */}
      <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl mb-8">
        <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-6">Monthly Congestion Trend (2024 vs 2025)</h4>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stats.monthly_chart} barGap={2} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} axisLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} axisLine={false} />
            <Tooltip 
              contentStyle={{ background: '#090b10', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, fontSize: 12, color: '#fff' }} 
              itemStyle={{ color: '#fff' }} 
              labelStyle={{ color: '#a1a1aa', fontWeight: 'bold', marginBottom: 4 }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar dataKey="2024" fill="#38bdf8" radius={[4, 4, 0, 0]} activeBar={{ fillOpacity: 0.6 }} />
            <Bar dataKey="2025" fill="#e2cca8" radius={[4, 4, 0, 0]} activeBar={{ fillOpacity: 0.6 }} />
            <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPICard label="Rush Hour Speed" value={stats.average_speed_rush_hour.value} sub={stats.average_speed_rush_hour.subtext} />
        <KPICard label="Travel Time (10km)" value={stats.average_travel_time_10km.value} sub={stats.average_travel_time_10km.subtext} />
        <KPICard label="Evening Congestion" value={stats.rush_hour.evening.congestion} sub={`Speed: ${stats.rush_hour.evening.speed}`} color="#ef4444" borderColor="#ef4444" />
        <KPICard label="Highway Ratio" value={stats.highway_trip_ratio.value} sub={stats.highway_trip_ratio.subtext} />
        <KPICard label="Worst Day" value={stats.worst_day.congestion} sub={stats.worst_day.date} color="#ef4444" borderColor="#ef4444" />
        <KPICard label="Time Lost Yearly" value={`${stats.rush_hour.time_lost.days}d ${stats.rush_hour.time_lost.remaining_hours}h`} sub={stats.rush_hour.time_lost.subtext} color="#f97316" borderColor="#f97316" />
      </div>
    </div>
  );
}

/* ==================== GROWTH TAB ==================== */
function GrowthTab({ deep }: { deep: any }) {
  const growthData = deep.growth_decomposition;
  return (
    <div>
      <SectionHeader
        title="A. Growth Decomposition"
        subtitle="Proving how demand has grown from 2022 to H1 2025. Decomposes system-wide Total_Pax into organic baseline growth (trend) vs seasonal noise."
        color="#10b981"
      />

      {/* Headline insight */}
      <div className="bg-[#10b981]/10 border border-[#10b981]/30 p-4 rounded-lg mb-8 text-sm text-[#10b981]">
        <span className="font-bold">KEY FINDING:</span> {growthData.headline}
      </div>

      {/* Growth Trend Chart */}
      <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl mb-8">
        <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-6">System-Wide Total Pax: Raw vs Extracted Trend</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={growthData.system_total_pax_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="period" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} axisLine={false} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`} />
            <Tooltip contentStyle={{ background: '#0f131c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, color: '#fff' }} formatter={(v: any) => [`${(Number(v) / 1000).toFixed(0)}K`]} />
            <Area type="monotone" dataKey="total_pax" fill="#10b98120" stroke="#10b981" strokeWidth={1} name="Raw Total Pax" />
            <Line type="monotone" dataKey="trend" stroke="#e2cca8" strokeWidth={2.5} dot={false} name="Extracted Trend" strokeDasharray="5 5" />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="text-[10px] text-white/30 mt-2">Visually confirms seasonal oscillation overlaid on a consistently rising trend. Growth acceleration is {growthData.growth_acceleration}.</div>
      </div>

      {/* CAGR Table: Zone + Route Type side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CAGR by Zone */}
        <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl">
          <h4 className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest mb-4">CAGR by Zone (Ranked)</h4>
          <div className="flex flex-col gap-3">
            {growthData.cagr_by_zone.map((z: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2">
                <div>
                  <div className="text-xs font-bold text-white/80">{z.zone.replace(/_/g, ' ')}</div>
                  <div className={`text-[9px] uppercase tracking-widest ${z.status === 'accelerating' ? 'text-[#10b981]' : z.status === 'decelerating' ? 'text-rose-400' : 'text-white/40'}`}>
                    {z.status} · slope: +{z.trend_slope}/mo
                  </div>
                </div>
                <div className="text-lg font-mono text-[#10b981]">{z.cagr}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* CAGR by Route Type */}
        <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl">
          <h4 className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest mb-4">CAGR by Route Type</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={growthData.cagr_by_route_type} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} />
              <YAxis dataKey="type" type="category" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} width={70} />
              <Tooltip contentStyle={{ background: '#0f131c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, color: '#fff' }} />
              <Bar dataKey="cagr" fill="#10b981" radius={[0, 6, 6, 0]} name="CAGR %" />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-[10px] text-white/30 mt-4 p-3 bg-[#10b981]/5 border border-[#10b981]/20 rounded">
            ⚠️ Feeder routes (12.8%) growing faster than Express (10.2%) — structural demand mismatch. Demand is being generated faster on feeders than trunk lines can absorb.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== SEASONALITY TAB ==================== */
function SeasonalityTab({ deep, diagnostics }: { deep: any; diagnostics: any }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const heatmapData = deep.seasonality.heatmap;

  const getHeatColor = (val: number) => {
    if (val >= 1.2) return '#10b981';
    if (val >= 1.1) return '#86efac';
    if (val >= 1.0) return '#fbbf2480';
    if (val >= 0.9) return '#f97316';
    if (val >= 0.8) return '#ef4444';
    return '#b91c1c';
  };

  return (
    <div>
      <SectionHeader
        title="B. Seasonality & Day-Type Divergence"
        subtitle="Understanding winter uplifts, summer moderation, and weekday vs weekend shifts across zones. Seasonality is NOT uniform across urban contexts."
        color="#f59e0b"
      />

      <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 p-4 rounded-lg mb-8 text-sm text-[#f59e0b]">
        <span className="font-bold">KEY FINDING:</span> {deep.seasonality.key_finding}
      </div>

      {/* Heatmap */}
      <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl mb-8 overflow-x-auto">
        <h4 className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-widest mb-4">Seasonal Intensity Heatmap (Month × Zone)</h4>
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr>
              <th className="text-left text-white/40 pb-3 pr-4">Zone</th>
              {months.map(m => <th key={m} className="text-center text-white/40 pb-3 px-1">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((row: any, i: number) => (
              <tr key={i}>
                <td className="text-white/70 py-1 pr-4 text-[11px] font-bold whitespace-nowrap">{row.zone.replace(/_/g, ' ')}</td>
                {months.map(m => (
                  <td key={m} className="text-center py-1 px-1">
                    <div
                      className="rounded px-1 py-0.5 text-[9px] font-bold"
                      style={{
                        backgroundColor: getHeatColor(row[m]),
                        color: row[m] >= 1.0 ? '#fff' : '#fff',
                        opacity: 0.9
                      }}
                    >
                      {row[m].toFixed(2)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-4 mt-4 text-[9px] text-white/40">
          <span>Scale:</span>
          <div className="flex gap-1 items-center"><div className="w-3 h-3 rounded bg-[#b91c1c]" /> &lt;0.80</div>
          <div className="flex gap-1 items-center"><div className="w-3 h-3 rounded bg-[#ef4444]" /> 0.80–0.90</div>
          <div className="flex gap-1 items-center"><div className="w-3 h-3 rounded bg-[#f97316]" /> 0.90–1.00</div>
          <div className="flex gap-1 items-center"><div className="w-3 h-3 rounded bg-[#86efac]" /> 1.10–1.20</div>
          <div className="flex gap-1 items-center"><div className="w-3 h-3 rounded bg-[#10b981]" /> &gt;1.20</div>
        </div>
      </div>

      {/* Weekday vs Weekend + Event Spikes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl">
          <h4 className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-widest mb-4">Weekday vs Weekend Divergence Index</h4>
          <div className="flex flex-col gap-3">
            {deep.seasonality.weekend_divergence.map((row: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2">
                <div>
                  <div className="text-xs font-bold text-white/80">{row.zone.replace(/_/g, ' ')}</div>
                  <div className={`text-[9px] uppercase tracking-widest ${row.type === 'Tourism' ? 'text-[#38bdf8]' : row.type === 'Commuter' ? 'text-[#f59e0b]' : 'text-white/40'}`}>{row.type}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(row.index / 1.5 * 100, 100)}%`, backgroundColor: row.index > 1 ? '#f59e0b' : '#38bdf8' }} />
                  </div>
                  <div className="text-sm font-mono" style={{ color: row.index > 1 ? '#f59e0b' : '#38bdf8' }}>{row.index}x</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-white/30 mt-4">&gt;1.0 = Weekday dominant (Commuter). &lt;1.0 = Weekend dominant (Tourism/Leisure).</div>
        </div>

        <div className="bg-[#0f131c]/80 backdrop-blur-md border border-[#ef4444]/20 p-6 rounded-xl">
          <h4 className="text-[10px] font-bold text-[#ef4444] uppercase tracking-widest mb-4">Event-Driven Demand Spikes (&gt;2σ)</h4>
          <div className="flex flex-col gap-4">
            {deep.seasonality.event_spikes.map((ev: any, i: number) => (
              <div key={i} className="bg-black/30 border border-white/5 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-bold text-white/90">{ev.event}</div>
                  <div className="text-[10px] text-white/50">{ev.date}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[10px]">
                  <div><span className="text-white/40">Zone:</span> <span className="text-white/80">{ev.zone.replace(/_/g, ' ')}</span></div>
                  <div><span className="text-white/40">Pax:</span> <span className="text-[#ef4444] font-bold">{ev.pax.toLocaleString()}</span></div>
                  <div><span className="text-white/40">Sigma:</span> <span className="text-[#ef4444]">+{ev.sigma}σ</span></div>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#ef4444] rounded-full" style={{ width: `${(ev.pax / ev.baseline) * 40}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== STRUCTURAL IMBALANCE TAB ==================== */
function ImbalanceTab({ deep, diagnostics }: { deep: any; diagnostics: any }) {
  return (
    <div>
      <SectionHeader
        title="C. Structural Imbalances"
        subtitle="Identifying where demand and capacity are fundamentally mismatched — load accumulation asymmetry, feeder-trunk disconnection, and bottleneck stops."
        color="#38bdf8"
      />

      {/* Load Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {deep.structural_imbalance.load_profiles.map((route: any) => (
          <div key={route.route_id} className={`bg-[#0f131c]/80 backdrop-blur-md border ${route.status === 'IMBALANCED' ? 'border-[#ef4444]/30' : 'border-[#22c55e]/30'} p-6 rounded-xl`}>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">{route.route_code} <span className="text-white/40 text-[10px] ml-2">{route.route_type}</span></h4>
                <div className="text-[10px] text-white/40">Route {route.route_id}</div>
              </div>
              <div className={`px-3 py-1 text-[10px] font-bold tracking-widest rounded ${route.status === 'IMBALANCED' ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30' : 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'}`}>
                {route.status}
              </div>
            </div>

            {/* Mini load chart */}
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={route.stops} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8 }} axisLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} />
                <Tooltip contentStyle={{ background: '#0f131c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10, color: '#fff' }} />
                <Bar dataKey="boarding" fill="#38bdf8" radius={[3, 3, 0, 0]} name="Boarding" />
                <Bar dataKey="alighting" fill="#f43f5e80" radius={[3, 3, 0, 0]} name="Alighting" />
              </BarChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-3 gap-3 mt-4 text-[10px]">
              <div className="bg-black/30 rounded p-2 text-center">
                <div className="text-white/40 mb-1">PLP Position</div>
                <div className="text-white font-bold text-sm">Stop #{route.plp_position}</div>
              </div>
              <div className="bg-black/30 rounded p-2 text-center">
                <div className="text-white/40 mb-1">Peak Load</div>
                <div className="text-[#f59e0b] font-bold text-sm">{route.plp_load}/{route.bus_capacity}</div>
              </div>
              <div className="bg-black/30 rounded p-2 text-center">
                <div className="text-white/40 mb-1">Utilization</div>
                <div className={`font-bold text-sm ${parseInt(route.utilization) > 80 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{route.utilization}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feeder-Trunk + Bottleneck */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Feeder-Trunk Disconnect */}
        <div className="bg-[#0f131c]/80 backdrop-blur-md border border-[#f59e0b]/20 p-6 rounded-xl">
          <h4 className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-widest mb-4">Feeder → Trunk Disconnection</h4>
          <div className="flex flex-col gap-4">
            {deep.structural_imbalance.feeder_trunk_disconnect.map((ftd: any, i: number) => (
              <div key={i} className="bg-black/30 border border-white/5 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs font-bold text-white">{ftd.feeder_route} → {ftd.trunk_route}</div>
                  <div className={`text-[9px] px-2 py-0.5 rounded font-bold ${ftd.status === 'CRITICAL' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>{ftd.status}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div><span className="text-white/40">Feeder CAGR:</span> <span className="text-[#10b981]">{ftd.feeder_cagr}%</span></div>
                  <div><span className="text-white/40">Trunk CAGR:</span> <span className="text-[#f59e0b]">{ftd.trunk_cagr}%</span></div>
                  <div><span className="text-white/40">Gap:</span> <span className="text-[#ef4444] font-bold">{ftd.gap}pp</span></div>
                </div>
                <div className="text-[9px] text-white/30 mt-2">Shared node: {ftd.shared_stop.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottleneck Stops */}
        <div className="bg-[#0f131c]/80 backdrop-blur-md border border-[#ef4444]/20 p-6 rounded-xl">
          <h4 className="text-[10px] font-bold text-[#ef4444] uppercase tracking-widest mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
              Bottleneck Stops (Dwell vs Boarding)
            </div>
          </h4>
          <div className="flex flex-col gap-3">
            {deep.structural_imbalance.bottleneck_stops.map((stop: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex-1">
                  <div className="text-xs font-bold text-white/90">{stop.name.replace(/_/g, ' ')}</div>
                  <div className="text-[9px] text-white/40">{stop.type} · {stop.zone.replace(/_/g, ' ')} · {stop.routes_served} routes</div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-[9px] text-white/40">Boarding</div>
                    <div className="text-xs font-mono text-white">{stop.avg_boarding}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-white/40">Dwell</div>
                    <div className="text-xs font-mono text-[#f97316]">{stop.dwell_time}m</div>
                  </div>
                  <div className={`text-[9px] px-2 py-0.5 rounded font-bold ${stop.risk === 'CRITICAL' ? 'bg-[#ef4444]/20 text-[#ef4444]' : stop.risk === 'HIGH' ? 'bg-[#f97316]/20 text-[#f97316]' : 'bg-[#eab308]/20 text-[#eab308]'}`}>
                    {stop.risk}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* B/A Ratio from diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-[#0f131c]/80 backdrop-blur-md border border-[#38bdf8]/20 p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
            <h4 className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">Origin Hubs (B/A &gt;&gt; 1)</h4>
          </div>
          <div className="flex flex-col gap-3">
            {diagnostics.imbalance.origins.map((o: any, i: number) => (
              <div key={i} className="bg-black/40 p-3 rounded border border-white/5 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-white/90">{o.name.replace(/_/g, ' ')}</div>
                  <div className="text-[10px] text-white/40">{o.zone.replace(/_/g, ' ')}</div>
                </div>
                <div className="text-lg font-mono text-[#38bdf8]">{o.ratio}x</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#0f131c]/80 backdrop-blur-md border border-[#f43f5e]/20 p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#f43f5e] animate-pulse" />
            <h4 className="text-[10px] font-bold text-[#f43f5e] uppercase tracking-widest">Destination Hubs (B/A &lt;&lt; 1)</h4>
          </div>
          <div className="flex flex-col gap-3">
            {diagnostics.imbalance.destinations.map((d: any, i: number) => (
              <div key={i} className="bg-black/40 p-3 rounded border border-white/5 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-white/90">{d.name.replace(/_/g, ' ')}</div>
                  <div className="text-[10px] text-white/40">{d.zone.replace(/_/g, ' ')}</div>
                </div>
                <div className="text-lg font-mono text-[#f43f5e]">{d.ratio}x</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== CONGESTION ELASTICITY TAB ==================== */
function CongestionTab({ deep, diagnostics }: { deep: any; diagnostics: any }) {
  return (
    <div>
      <SectionHeader
        title="D. Congestion-Demand Interaction"
        subtitle="Proving that congestion elasticity varies by zone: Tourism zones are elastic (demand drops), industrial zones are inelastic (captive riders)."
        color="#ef4444"
      />

      {/* Zone Elasticity Table */}
      <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl mb-8">
        <h4 className="text-[10px] font-bold text-[#ef4444] uppercase tracking-widest mb-4">Zone-Stratified Congestion-Demand Elasticity</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-widest border-b border-white/10">
                <th className="text-left pb-3 pr-3">Zone</th>
                <th className="text-center pb-3 px-2">ρ (Correlation)</th>
                <th className="text-center pb-3 px-2">ε (Elasticity)</th>
                <th className="text-center pb-3 px-2">Category</th>
                <th className="text-left pb-3 pl-3">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {deep.congestion_elasticity.zone_analysis.map((z: any, i: number) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-3 text-white/80 font-bold text-[11px]">{z.zone.replace(/_/g, ' ')}</td>
                  <td className="py-3 px-2 text-center">
                    <span className="font-mono text-sm" style={{ color: z.rho < -0.2 ? '#ef4444' : z.rho < -0.1 ? '#f97316' : '#22c55e' }}>{z.rho.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="font-mono text-sm text-[#e2cca8]">{z.epsilon.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                      z.category.includes('Highly Elastic') ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                      z.category.includes('Moderately') ? 'bg-[#f97316]/20 text-[#f97316]' :
                      z.category.includes('Highly In') ? 'bg-[#22c55e]/20 text-[#22c55e]' :
                      'bg-[#38bdf8]/20 text-[#38bdf8]'
                    }`}>{z.category}</span>
                  </td>
                  <td className="py-3 pl-3 text-[10px] text-white/50 max-w-xs">{z.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Speed-Capacity + Redistribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0f131c]/80 backdrop-blur-md border border-[#ef4444]/20 p-6 rounded-xl">
          <h4 className="text-[10px] font-bold text-[#ef4444] uppercase tracking-widest mb-4">Speed-Capacity Efficiency Loss</h4>
          <div className="text-center mb-6">
            <div className="text-4xl font-light text-[#ef4444] mb-2">{deep.congestion_elasticity.speed_capacity.capacity_loss_heavy}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest">Effective Capacity Loss Under Heavy Congestion</div>
          </div>
          <div className="flex flex-col gap-3">
            {Object.entries(deep.congestion_elasticity.speed_capacity).filter(([k]) => k !== 'capacity_loss_heavy').map(([key, val]: [string, any]) => (
              <div key={key} className="flex justify-between items-center bg-black/30 rounded p-3">
                <div className="text-[10px] text-white/60 capitalize">{key.replace(/_/g, ' ')}</div>
                <div className="flex gap-4 text-xs">
                  <span className="text-white/80">{val.avg_speed} km/h</span>
                  <span className="text-[#e2cca8] font-mono">{val.effective_trips_per_hour} trips/hr</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-[10px] text-white/30 bg-[#ef4444]/5 border border-[#ef4444]/20 p-3 rounded leading-relaxed">
            A bus on a 20km route at 35 km/h completes ~3.5 trips/hr. At 13.6 km/h heavy congestion, it drops to 1.4 trips/hr — a 60% capacity loss with the same fleet size. Adding buses is counterproductive; they contribute to congestion.
          </div>
        </div>

        <div className="bg-[#0f131c]/80 backdrop-blur-md border border-[#f59e0b]/20 p-6 rounded-xl">
          <h4 className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-widest mb-4">Demand Redistribution (Not Abandonment)</h4>
          <div className="text-xs text-white/60 leading-relaxed mb-6">{deep.congestion_elasticity.demand_redistribution.finding}</div>
          
          <div className="flex items-center gap-6 justify-center">
            <div className="text-center">
              <div className="text-3xl font-mono text-[#ef4444] mb-1">{deep.congestion_elasticity.demand_redistribution.city_drop}%</div>
              <div className="text-[10px] text-white/40">City Routes</div>
            </div>
            <div className="text-white/20 text-2xl">→</div>
            <div className="text-center">
              <div className="text-3xl font-mono text-[#10b981] mb-1">+{deep.congestion_elasticity.demand_redistribution.express_uplift}%</div>
              <div className="text-[10px] text-white/40">Express Routes</div>
            </div>
          </div>

          <div className="mt-8 text-[10px] text-white/30 bg-[#f59e0b]/5 border border-[#f59e0b]/20 p-3 rounded leading-relaxed">
            Critical nuance: Passengers don't disappear — they redistribute to parallel express routes or Metro. Analyzing only the congested route in isolation misreads redistribution as abandonment, leading to wrong capacity interventions.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== FORECAST & ALLOCATION TAB ==================== */
function ForecastTab({ deep, stats }: { deep: any; stats: any }) {
  const quadrantColors: Record<string, string> = {
    'Structural Redesign': '#ef4444',
    'Capacity Addition': '#f97316',
    'Monitor & Adjust': '#22c55e',
    'Demand Suppression Risk': '#a855f7',
  };

  return (
    <div>
      <SectionHeader
        title="E. Baseline Forecast & Allocation Strategy"
        subtitle="H2 2025 demand forecast with corridor classification and evidence-based intervention proposals. Each recommendation states root cause, evidence metric, and why the intervention addresses the cause not the symptom."
        color="#a855f7"
      />

      {/* Forecast Chart */}
      <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl mb-8">
        <h4 className="text-[10px] font-bold text-[#a855f7] uppercase tracking-widest mb-6">H2 2025 System Demand Forecast (with confidence interval)</h4>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={deep.forecast_allocation.h2_2025_forecast}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`} />
            <Tooltip contentStyle={{ background: '#0f131c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, color: '#fff' }} formatter={(v: any) => [`${(Number(v) / 1000).toFixed(0)}K`]} />
            <Area type="monotone" dataKey="confidence_high" fill="#a855f710" stroke="transparent" name="Upper 95% CI" />
            <Area type="monotone" dataKey="confidence_low" fill="#a855f710" stroke="transparent" name="Lower 95% CI" />
            <Line type="monotone" dataKey="predicted_pax" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7', r: 4, stroke: '#0f131c', strokeWidth: 2 }} name="Predicted Pax" />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="text-[10px] text-white/30 mt-2">Forecast reflects seasonal winter uplift (Nov–Dec peak) and trend extrapolation. Model: Random Forest + STL seasonal multipliers.</div>
      </div>

      {/* Corridor Classification */}
      <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl mb-8">
        <h4 className="text-[10px] font-bold text-[#a855f7] uppercase tracking-widest mb-4">Corridor Classification Matrix (Growth × Congestion Sensitivity)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-widest border-b border-white/10">
                <th className="text-left pb-3">Route</th>
                <th className="text-center pb-3">Type</th>
                <th className="text-center pb-3">Growth</th>
                <th className="text-center pb-3">Congestion Sens.</th>
                <th className="text-center pb-3">Quadrant</th>
              </tr>
            </thead>
            <tbody>
              {deep.forecast_allocation.corridor_classification.map((c: any, i: number) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 text-white/80 font-bold">{c.route}</td>
                  <td className="py-3 text-center text-white/60">{c.type}</td>
                  <td className="py-3 text-center capitalize text-white/60">{c.growth}</td>
                  <td className="py-3 text-center capitalize text-white/60">{c.congestion_sensitivity}</td>
                  <td className="py-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: `${c.color}20`, color: c.color }}>
                      {c.quadrant}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 text-[9px]">
          {Object.entries(quadrantColors).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-white/50">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interventions */}
      <div className="mb-4">
        <h4 className="text-[10px] font-bold text-[#a855f7] uppercase tracking-widest mb-4">Evidence-Based Intervention Proposals</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {deep.forecast_allocation.interventions.map((intv: any, i: number) => (
          <div key={i} className={`bg-[#0f131c]/80 backdrop-blur-md border rounded-xl p-5 ${
            intv.priority === 'CRITICAL' ? 'border-[#ef4444]/30' :
            intv.priority === 'HIGH' ? 'border-[#f97316]/30' :
            intv.priority === 'INFRASTRUCTURE' ? 'border-[#a855f7]/30' :
            'border-white/10'
          }`}>
            <div className="flex justify-between items-start mb-3">
              <div className="text-sm font-bold text-white">{intv.corridor}</div>
              <div className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                intv.priority === 'CRITICAL' ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                intv.priority === 'HIGH' ? 'bg-[#f97316]/20 text-[#f97316]' :
                intv.priority === 'INFRASTRUCTURE' ? 'bg-[#a855f7]/20 text-[#a855f7]' :
                'bg-[#eab308]/20 text-[#eab308]'
              }`}>{intv.priority}</div>
            </div>
            
            <div className="space-y-2 text-[11px]">
              <div>
                <span className="text-white/40 text-[9px] uppercase tracking-widest">Root Cause: </span>
                <span className="text-[#e2cca8]">{intv.root_cause}</span>
              </div>
              <div>
                <span className="text-white/40 text-[9px] uppercase tracking-widest">Evidence: </span>
                <span className="text-white/60">{intv.evidence}</span>
              </div>
              <div>
                <span className="text-white/40 text-[9px] uppercase tracking-widest">Intervention: </span>
                <span className="text-[#38bdf8] font-bold">{intv.intervention}</span>
              </div>
              <div className="bg-black/30 rounded p-3 mt-2 text-white/50 text-[10px] leading-relaxed">
                {intv.details}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
