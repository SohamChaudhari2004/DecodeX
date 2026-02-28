"use client";

import { motion } from 'framer-motion';

interface StopData {
  Stop_ID: string;
  Stop_Name: string;
  Stop_Type: string;
  Zone: string;
  passing_routes: string;
  total_dwell_time?: number;
  congestion_color?: string;
}

interface HUDNodeOverlayProps {
  data: StopData;
  onClose: () => void;
  onRouteAction: () => void;
}

export default function HUDNodeOverlay({ data, onClose, onRouteAction }: HUDNodeOverlayProps) {
  const routes = Array.isArray(data.passing_routes)
    ? data.passing_routes.filter(Boolean)
    : (data.passing_routes || "").split(",").filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed top-1/2 left-24 -translate-y-1/2 w-80 z-30 pointer-events-auto"
    >
      {/* Sci-Fi connecting line visual simulating connection to Node */}
      <div className="absolute top-1/2 -right-12 w-12 h-px bg-white/40 -translate-y-1/2">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#e2cca8]"></div>
      </div>

      <div className="bg-[#090b10]/80 backdrop-blur-md hud-border p-6 font-mono text-sm uppercase tracking-widest text-[#f3f4f6]">

        <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/20">
          <div className="text-[#e2cca8] text-[10px] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#e2cca8] animate-pulse"></div>
            NODE UPLINK
          </div>
          <button onClick={onClose} className="hover:text-white transition-colors text-white/50">
            [X]
          </button>
        </div>

        <h2 className="text-2xl font-light text-white mb-1 shadow-sm drop-shadow-md leading-tight">
          {data.Stop_Name.replace(/_/g, ' ')}
        </h2>
        <div className="text-[10px] text-[#bda68c] mb-6 tracking-widest">{data.Zone.replace(/_/g, ' ')} sector</div>

        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-white/50 mb-1">Node Class</div>
              <div className="text-sm text-[#e2cca8]">{data.Stop_Type.replace(/_/g, ' ')}</div>
            </div>
            {data.total_dwell_time !== undefined && (
              <div>
                <div className="text-[10px] text-white/50 mb-1">Dwell Traffic</div>
                <div className="text-sm flex items-center gap-2" style={{ color: data.congestion_color || '#38bdf8' }}>
                  {data.total_dwell_time > 4.0 ? 'HIGH' : data.total_dwell_time > 2.5 ? 'MODERATE' : 'LOW'}
                  <span className="text-[10px] opacity-70">({data.total_dwell_time.toFixed(1)}m)</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] text-white/50 mb-1">Intersecting Routes</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {routes.map(r => (
                <div key={r} className="px-2 py-0.5 border border-[#bda68c]/40 text-xs text-[#bda68c] bg-[#bda68c]/10 rounded-sm">
                  {r}
                </div>
              ))}
              {routes.length === 0 && <span className="text-white/30 text-xs">NO ROUTES FOUND</span>}
            </div>
          </div>
        </div>

        <button
          onClick={onRouteAction}
          className="w-full interactive-btn border border-[#38bdf8]/50 bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 transition-colors py-3 text-xs text-[#38bdf8] flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
          INITIATE ROUTING (A-B)
        </button>

      </div>
    </motion.div>
  );
}
