"use client";

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, Cell
} from 'recharts';

const ZONE_COLORS: Record<string, string> = {
  CBD_Downtown:          '#a78bfa',
  CBD_BusinessBay:       '#60a5fa',
  Coastal_Marina:        '#34d399',
  Core_Deira:            '#fbbf24',
  Ind_JebelAli:          '#f87171',
  Res_AlQusais:          '#fb923c',
  Res_InternationalCity: '#e879f9',
};

const ROUTE_TYPE_COLORS: Record<string, string> = {
  City:      '#60a5fa',
  Express:   '#34d399',
  Feeder:    '#fbbf24',
  Intercity: '#f87171',
};

const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(n);

export default function BusinessDashboard() {
  const [zone, setZone]         = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [cong, setCong]         = useState<any>(null);
  const [metrics, setMetrics]   = useState<any>(null);
  const [trends, setTrends]     = useState<any>(null);

  useEffect(() => {
    fetch('/data/zone_intelligence.json').then(r => r.json()).then(setZone);
    fetch('/data/h2_2025_forecast.json').then(r => r.json()).then(setForecast);
    fetch('/data/congestion_forecast.json').then(r => r.json()).then(setCong);
    fetch('/data/model_metrics.json').then(r => r.json()).then(setMetrics);
    fetch('/data/historical_trends.json').then(r => r.json()).then(setTrends);
  }, []);

  if (!zone || !forecast || !cong || !metrics || !trends) {
    return (
      <div className="w-full flex items-center justify-center py-24 text-white/30 font-mono text-xs tracking-widest">
        [ LOADING BUSINESS INTELLIGENCE ENGINE... ]
      </div>
    );
  }

  // --- Derived datasets ---

  // 1. Zone KPIs for stat cards
  const zones: any[] = zone.zones;
  const totalNetworkPax = zones.reduce((s: number, z: any) => s + z.total_pax, 0);
  const totalBoardings  = zones.reduce((s: number, z: any) => s + z.total_boardings, 0);

  // 2. Zone stacked bar (boardings vs alightings)
  const zoneBoardingData = zones.map((z: any) => ({
    zone: z.zone.replace('CBD_', '').replace('Coastal_', '').replace('Res_', '').replace('Ind_', '').replace('Core_', ''),
    Boardings:   Math.round(z.total_boardings / 1000),
    Alightings:  Math.round(z.total_alightings / 1000),
    CAGR:        (z.cagr_2022_2024 * 100).toFixed(1),
    color:       ZONE_COLORS[z.zone] || '#fff',
  }));

  // 3. H2 2025 system forecast area chart
  const forecastArea = forecast.system.map((m: any) => ({
    month: m.month_name,
    Passengers: m.total_pax,
    Speed: m.avg_speed_kmph,
    Congestion: m.predicted_congestion,
  }));

  // 4. Route type radar (H2 pax by route type)
  const routeTypePax: Record<string, number> = {};
  Object.values(forecast.by_route).forEach((r: any) => {
    routeTypePax[r.route_type] = (routeTypePax[r.route_type] || 0) + r.total_h2_pax;
  });
  const radarData = Object.entries(routeTypePax).map(([type, pax]) => ({
    subject: type, value: Math.round((pax as number) / 1000), fullMark: 2500,
  }));

  // 5. Monthly historical trends (system-level pax)
  const trendLine = trends.system_monthly
    .filter((r: any) => r.year >= 2023)
    .map((r: any) => ({
      date: `${r.year}-${String(r.month).padStart(2,'0')}`,
      Pax: Math.round(r.total_pax / 1000),
      YoY: r.yoy_growth_pct,
    }));

  // 6. Congestion months summary
  const congMonths = cong.monthly_summary;

  // 7. Annual totals
  const annuals = trends.annual_summary;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-12 pb-32 text-slate-50 font-sans">

      {/* HEADER */}
      <div className="mb-16 text-center pt-4">
        <div className="inline-block border border-white/10 bg-black/40 px-5 py-2 rounded-full text-[10px] tracking-[0.3em] text-white/40 uppercase mb-6">
          RTA Strategic Intelligence Report — H2 2025
        </div>
        <h2 className="text-3xl font-light tracking-widest text-[#e2cca8] uppercase mb-3">
          Dubai Bus Network Business Analysis
        </h2>
        <p className="max-w-3xl mx-auto text-white/40 text-sm leading-relaxed">
          Multi-model ML pipeline outputs integrated across 15,324 daily operational records · 12 routes · 60 stops · 7 urban zones · 2022–2025
        </p>
      </div>

      {/* ROW 1 — KPI HEADLINE CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total Network Passengers', value: fmt(totalNetworkPax), sub: '2022 — H1 2025', color: '#a78bfa' },
          { label: 'Total Boardings', value: fmt(totalBoardings), sub: 'System-wide', color: '#60a5fa' },
          { label: 'H2 2025 Forecast (Total)', value: fmt(forecast.system.reduce((s: number, m: any) => s + m.total_pax, 0)), sub: 'Jul – Dec 2025', color: '#34d399' },
          { label: 'RF Model Accuracy (R²)', value: `${(metrics.models.M1_ridership_forecast.r2_score * 100).toFixed(1)}%`, sub: `±${metrics.models.M1_ridership_forecast.mae_passengers} pax MAE`, color: '#fbbf24' },
        ].map((c, i) => (
          <div key={i} className="bg-[#0d1117] border border-white/10 rounded-xl p-5 relative overflow-hidden hover:border-white/20 transition-all">
            <div className="text-[9px] text-white/30 uppercase tracking-widest mb-4">{c.label}</div>
            <div className="text-3xl font-bold mb-1" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[10px] text-white/30">{c.sub}</div>
            <div className="absolute bottom-0 left-0 w-full h-0.5" style={{ background: c.color, opacity: 0.3 }}></div>
          </div>
        ))}
      </div>

      {/* ROW 2 — H2 FORECAST AREA + ROUTE RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* H2 Forecast Area Chart */}
        <div className="lg:col-span-2 bg-[#0d1117] border border-white/10 rounded-xl p-6">
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">H2 2025 Monthly Passenger Forecast</div>
          <div className="text-white/60 text-xs mb-6">Random Forest Regressor · System-Wide Total Passengers (Jul–Dec 2025)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={forecastArea}>
              <defs>
                <linearGradient id="fgradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10"/>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#ffffff50', fontSize: 10 }}/>
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ffffff50', fontSize: 10 }} tickFormatter={(v) => fmt(v)}/>
              <Tooltip contentStyle={{ background: '#0a0d14', border: '1px solid #ffffff20', borderRadius: 8 }} itemStyle={{ color: '#fff' }} formatter={(v: any) => [fmt(v), 'Passengers']}/>
              <Area type="monotone" dataKey="Passengers" stroke="#a78bfa" strokeWidth={2} fill="url(#fgradient)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Route Type Radar */}
        <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6">
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">H2 Pax by Route Type</div>
          <div className="text-white/60 text-xs mb-4">Capacity share per service category (K pax)</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#ffffff15"/>
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff60', fontSize: 10 }}/>
              <PolarRadiusAxis tick={{ fill: '#ffffff30', fontSize: 8 }} domain={[0, 2500]}/>
              <Radar name="Pax (K)" dataKey="value" stroke="#34d399" fill="#34d399" fillOpacity={0.2}/>
              <Tooltip contentStyle={{ background: '#0a0d14', border: '1px solid #ffffff20', borderRadius: 8 }} itemStyle={{ color: '#fff' }}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROW 3 — ZONE BOARDINGS vs ALIGHTINGS */}
      <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6 mb-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Zone-Level Boardings vs. Alightings</div>
            <div className="text-white/60 text-xs">Structural flow asymmetry per urban zone — thousands of passengers (2022–H1 2025)</div>
          </div>
          <div className="flex gap-4 text-[10px]">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#60a5fa]"></div>Boardings</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#f87171]"></div>Alightings</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={zoneBoardingData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10"/>
            <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: '#ffffff60', fontSize: 10 }}/>
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ffffff50', fontSize: 10 }} tickFormatter={v => `${v}K`}/>
            <Tooltip contentStyle={{ background: '#0a0d14', border: '1px solid #ffffff20', borderRadius: 8 }} itemStyle={{ color: '#fff' }} formatter={(v: any) => [`${v}K pax`, '']}/>
            <Bar dataKey="Boardings" fill="#60a5fa" radius={[4, 4, 0, 0]} barSize={18}/>
            <Bar dataKey="Alightings" fill="#f87171" radius={[4, 4, 0, 0]} barSize={18}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ROW 4 — HISTORICAL TREND LINE + ZONE TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
        {/* Trend Line */}
        <div className="lg:col-span-3 bg-[#0d1117] border border-white/10 rounded-xl p-6">
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Historical System Demand Trend</div>
          <div className="text-white/60 text-xs mb-6">Monthly total passengers (thousands) — 2023 to H1 2025 with YoY growth</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendLine}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10"/>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#ffffff40', fontSize: 9 }} interval={3}/>
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ffffff50', fontSize: 10 }} tickFormatter={v => `${v}K`}/>
              <Tooltip contentStyle={{ background: '#0a0d14', border: '1px solid #ffffff20', borderRadius: 8 }} itemStyle={{ color: '#fff' }} formatter={(v: any, n) => [n === 'Pax' ? `${v}K` : `${v}%`, n]}/>
              <Line type="monotone" dataKey="Pax" stroke="#a78bfa" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Zone Intelligence Table */}
        <div className="lg:col-span-2 bg-[#0d1117] border border-white/10 rounded-xl p-6 flex flex-col">
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Zone CAGR (2022–2024)</div>
          <div className="text-white/60 text-xs mb-4">Compound Annual Growth Rate per urban cluster</div>
          <div className="flex-1 flex flex-col gap-2">
            {[...zones].sort((a, b) => b.cagr_2022_2024 - a.cagr_2022_2024).map((z: any) => {
              const pct = parseFloat((z.cagr_2022_2024 * 100).toFixed(1));
              const shortName = z.zone.replace('CBD_', '').replace('Coastal_', '').replace('Res_', '').replace('Ind_', '').replace('Core_', '');
              return (
                <div key={z.zone} className="flex items-center gap-3">
                  <div className="w-20 text-[10px] text-white/50 shrink-0">{shortName}</div>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${((pct - 10) / 1) * 100}%`, background: ZONE_COLORS[z.zone] }}></div>
                  </div>
                  <div className="text-[11px] font-mono font-bold w-10 text-right" style={{ color: ZONE_COLORS[z.zone] }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ROW 5 — CONGESTION H2 BAR + ANNUAL SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* Congestion Monthly H2 2025 */}
        <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6">
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">H2 2025 Avg Congestion vs. Speed</div>
          <div className="text-white/60 text-xs mb-6">Gradient Boosting Classifier forecasts per month</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={congMonths}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10"/>
              <XAxis dataKey="month_name" axisLine={false} tickLine={false} tick={{ fill: '#ffffff50', fontSize: 10 }}/>
              <YAxis yAxisId="left"  axisLine={false} tickLine={false} tick={{ fill: '#ffffff50', fontSize: 10 }}/>
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#ffffff50', fontSize: 10 }} unit=" km/h"/>
              <Tooltip contentStyle={{ background: '#0a0d14', border: '1px solid #ffffff20', borderRadius: 8 }} itemStyle={{ color: '#fff' }}/>
              <Legend wrapperStyle={{ fontSize: 10, opacity: 0.5 }}/>
              <Bar yAxisId="left"  dataKey="avg_congestion" fill="#f43f5e" radius={[4,4,0,0]} barSize={20} name="Avg Congestion (1-5)"/>
              <Bar yAxisId="right" dataKey="avg_speed_kmph" fill="#34d399" radius={[4,4,0,0]} barSize={20} name="Avg Speed (km/h)"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Annual Growth Summary */}
        <div className="bg-[#0d1117] border border-white/10 rounded-xl p-6">
          <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Annual Network Growth</div>
          <div className="text-white/60 text-xs mb-6">Year-over-Year total pax and growth rate</div>
          <div className="flex flex-col gap-4 mt-4">
            {annuals.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0">
                <div>
                  <div className="text-xl font-bold text-white">{a.year}</div>
                  <div className="text-xs text-white/30">{fmt(a.total_pax)} total pax</div>
                </div>
                {a.yoy_growth_pct != null ? (
                  <div className="text-right">
                    <div className="text-2xl font-mono text-emerald-400">+{a.yoy_growth_pct}%</div>
                    <div className="text-[10px] text-white/30">YoY Growth</div>
                  </div>
                ) : (
                  <div className="text-white/20 text-sm">Baseline Year</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 6 — MODEL PERFORMANCE ROW */}
      <div className="bg-[#0d1117] border border-white/10 rounded-xl p-8 mb-6">
        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-8 text-center">ML Model Pipeline — Performance Metrics</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { name: 'M1 · Ridership Forecast', algo: 'Random Forest Regressor', metric: `R² = ${metrics.models.M1_ridership_forecast.r2_score}`, sub: `MAE ±${metrics.models.M1_ridership_forecast.mae_passengers} pax`, color: '#a78bfa', bar: metrics.models.M1_ridership_forecast.r2_score },
            { name: 'M2 · Congestion Predictor', algo: 'Gradient Boosting Classifier', metric: `Acc = ${(metrics.models.M2_congestion_predictor.accuracy * 100).toFixed(1)}%`, sub: '5-class level prediction', color: '#f43f5e', bar: metrics.models.M2_congestion_predictor.accuracy },
            { name: 'M3 · Route Recommender', algo: 'Gradient Boosting Regressor', metric: `R² = ${metrics.models.M3_route_recommender.r2_score}`, sub: '4 priority scoring modes', color: '#34d399', bar: metrics.models.M3_route_recommender.r2_score },
            { name: 'M4 · Zone Trend Model', algo: 'Linear Regression (per zone)', metric: `7 zones modeled`, sub: '2022–2025 H1 training', color: '#fbbf24', bar: 0.82 },
          ].map((m, i) => (
            <div key={i} className="border border-white/5 bg-black/30 rounded-xl p-5 relative overflow-hidden">
              <div className="text-xs font-bold mb-1" style={{ color: m.color }}>{m.name}</div>
              <div className="text-[9px] text-white/30 mb-4">{m.algo}</div>
              <div className="text-2xl font-mono font-bold text-white mb-1">{m.metric}</div>
              <div className="text-[10px] text-white/30 mb-4">{m.sub}</div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${m.bar * 100}%`, background: m.color }}></div>
              </div>
              <div className="absolute right-4 top-4 text-[10px] text-white/10 font-mono">M{i+1}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
