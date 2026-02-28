"use client";

import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/data/system_diagnostics.json')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => console.error("Error loading system diagnostics:", e));
  }, []);

  if (!data) {
    return (
      <div className="w-full flex justify-center items-center p-24 text-white/50 font-mono tracking-widest text-sm">
        [ COMPUTING SYSTEM DIAGNOSTICS... ]
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-8 md:p-12 text-slate-50 font-sans mt-12 relative z-20 pb-32">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-light tracking-widest uppercase mb-4 text-[#e2cca8]">Dubai Mobility Shift Diagnostics</h2>
        <p className="max-w-4xl mx-auto text-white/50 text-sm leading-relaxed">
          Stage 1 Pre-Modeling System Diagnostics. Analytical framework strictly derived from the RTA Mandate, extracting deep congestion-demand interaction elasticities, seasonal divergence loops, and structural network imbalances across 2022-2025.
        </p>
      </div>

      <div className="flex justify-center mb-16">
        <div className="bg-[#1e2333]/80 backdrop-blur-md rounded-full p-1 flex border border-white/5">
          <div className="px-6 py-2 bg-[#a855f7] rounded-full text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(168,85,247,0.4)] text-white">STRATEGY MANDATE</div>
          <div className="px-6 py-2 text-white/40 text-xs font-bold tracking-widest uppercase">KPI MATRIX</div>
        </div>
      </div>

      {/* SECTION 1: GROWTH & ELASTICITY */}
      <div className="mb-16">
        <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-6 border-b border-white/10 pb-2">A. Growth Dynamics & D. Congestion Elasticity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl relative overflow-hidden group">
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-6">Fastest Growing Zone (CAGR)</h4>
            <div className="text-3xl font-light mb-1 text-emerald-400">{data.growth.top_zone.cagr}</div>
            <div className="text-white/60 text-sm tracking-wider uppercase font-bold">{data.growth.top_zone.name}</div>
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-50"></div>
          </div>

          <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl relative overflow-hidden group">
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-6">Slowest Growing Zone (CAGR)</h4>
            <div className="text-3xl font-light mb-1 text-rose-400">{data.growth.bottom_zone.cagr}</div>
            <div className="text-white/60 text-sm tracking-wider uppercase font-bold">{data.growth.bottom_zone.name}</div>
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 opacity-50"></div>
          </div>

          <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-6 rounded-xl relative overflow-hidden group md:row-span-2 flex flex-col">
             <h4 className="text-[10px] font-bold text-[#a855f7] uppercase tracking-widest mb-6">Congestion-Demand Elasticity (ρ)</h4>
             <div className="text-xs text-white/40 mb-4 leading-relaxed">
               Correlating Residual Total Pax with Congestion Level to determine if a zone's demographic comprises Captive Riders (Inelastic) or Discretionary Commuters (Elastic).
             </div>
             <div className="flex-1 flex flex-col gap-3">
               {data.elasticity.map((el: any, i: number) => (
                 <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                   <div>
                     <div className="text-sm font-bold text-white/80">{el.zone.replace('Res_', '').replace('Ind_', '').replace('CBD_', '')}</div>
                     <div className={`text-[9px] uppercase tracking-widest ${el.category === 'Stationary' ? 'text-[#38bdf8]' : 'text-rose-400'}`}>{el.category}</div>
                   </div>
                   <div className="text-xl font-mono text-[#e2cca8]">{el.correlation.toFixed(2)}</div>
                 </div>
               ))}
             </div>
             <div className="absolute top-0 right-0 w-1 h-full bg-[#a855f7] opacity-50"></div>
          </div>
        </div>
      </div>

      {/* SECTION 2: STRUCTURAL IMBALANCE */}
      <div className="mb-16">
        <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-6 border-b border-white/10 pb-2">C. Structural Imbalances (Load Asymmetry)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-[#0f131c]/80 backdrop-blur-md border border-[#38bdf8]/20 p-6 rounded-xl relative group">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse"></div>
               <h4 className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-widest">Origin Hubs (B/A &gt;&gt; 1)</h4>
            </div>
            <div className="flex flex-col gap-4">
              {data.imbalance.origins.map((org: any, i: number) => (
                <div key={i} className="bg-black/40 p-3 rounded border border-white/5 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-white/90">{org.name}</div>
                    <div className="text-[10px] text-white/40">{org.zone}</div>
                  </div>
                  <div className="text-lg font-mono text-[#38bdf8]">{org.ratio}x</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0f131c]/80 backdrop-blur-md border border-[#f43f5e]/20 p-6 rounded-xl relative group">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-2 h-2 rounded-full bg-[#f43f5e] animate-pulse"></div>
               <h4 className="text-[10px] font-bold text-[#f43f5e] uppercase tracking-widest">Destination Hubs (B/A &lt;&lt; 1)</h4>
            </div>
            <div className="flex flex-col gap-4">
              {data.imbalance.destinations.map((dest: any, i: number) => (
                <div key={i} className="bg-black/40 p-3 rounded border border-white/5 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold text-white/90">{dest.name}</div>
                    <div className="text-[10px] text-white/40">{dest.zone}</div>
                  </div>
                  <div className="text-lg font-mono text-[#f43f5e]">{dest.ratio}x</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 3: SEASONALITY */}
      <div className="mb-16">
        <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-6 border-b border-white/10 pb-2">B. Seasonality & Day-Type Divergence</h3>
        
        <div className="bg-[#0f131c]/80 backdrop-blur-md border border-white/10 p-8 rounded-xl relative group">
          <div className="grid grid-cols-4 gap-4 mb-4 text-[10px] font-bold text-white/30 uppercase tracking-widest border-b border-white/10 pb-4">
            <div>Network Zone</div>
            <div>Winter Uplift (Nov-Mar)</div>
            <div>Summer Depression (Jun-Aug)</div>
            <div>Weekday vs Weekend</div>
          </div>

          <div className="flex flex-col gap-2">
            {data.seasonality.map((s: any, i: number) => (
              <div key={i} className="grid grid-cols-4 gap-4 items-center py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors rounded px-2">
                <div className="font-bold text-sm text-[#e2cca8] truncate">{s.zone.replace('CBD_', '').replace('Coastal_', '').replace('Res_', '')}</div>
                <div className="font-mono text-lg text-emerald-400">{s.winter_uplift}x</div>
                <div className="font-mono text-lg text-rose-400">{s.summer_depression}x</div>
                <div className="font-mono text-lg text-white/80">{s.weekend_divergence}x <span className="text-[10px] text-white/30 ml-2">{s.weekend_divergence > 1 ? '(Commuter)' : '(Tourism)'}</span></div>
              </div>
            ))}
          </div>
          <div className="absolute top-0 right-0 w-1 h-full bg-[#10b981] opacity-50"></div>
        </div>

      </div>

    </div>
  );
}
