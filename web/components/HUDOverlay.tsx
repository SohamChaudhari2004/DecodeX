"use client";

import { motion } from 'framer-motion';

interface RouteData {
  Route_ID: string;
  Route_Code: string;
  Route_Type: string;
  Route_Length_km: string;
  Avg_Travel_Time_Min: string;
}

interface HUDOverlayProps {
  data: RouteData;
  onClose: () => void;
}

export default function HUDOverlay({ data, onClose }: HUDOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute top-1/2 right-12 -translate-y-1/2 w-80 z-30 pointer-events-auto"
    >
      {/* Sci-Fi connecting line visual (just for aesthetics to mimic the image) */}
      <div className="absolute top-1/2 -left-12 w-12 h-px bg-white/40 -translate-y-1/2">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#e2cca8]"></div>
      </div>

      <div className="bg-black/40 backdrop-blur-md hud-border p-6 font-mono text-sm uppercase tracking-widest text-slate-200">
        
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/20">
          <div className="text-[#e2cca8] text-xs">Route Signal Active</div>
          <button onClick={onClose} className="hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <h2 className="text-3xl font-light text-white mb-1 shadow-sm drop-shadow-md">
          {data.Route_Code}
        </h2>
        <div className="text-xs text-[#bda68c] mb-6">Type: {data.Route_Type}</div>

        <div className="space-y-4">
          <div>
            <div className="text-[10px] text-white/50 mb-1">Total Distance</div>
            <div className="flex items-end gap-2 text-xl text-[#f3f4f6]">
               {data.Route_Length_km} 
               <span className="text-xs text-white/40 mb-1 tracking-widest">KM</span>
            </div>
            {/* Minimal bar graph visual */}
            <div className="w-full h-1 bg-white/10 mt-2">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((parseFloat(data.Route_Length_km)/40)*100, 100)}%` }} transition={{ delay: 0.3, duration: 1 }} className="h-full bg-[#e2cca8] shadow-[0_0_8px_#e2cca8]"></motion.div>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-white/50 mb-1">Est. Travel Time</div>
            <div className="flex items-end gap-2 text-xl text-[#f3f4f6]">
               {data.Avg_Travel_Time_Min} 
               <span className="text-xs text-white/40 mb-1 tracking-widest">MIN</span>
            </div>
             <div className="w-full h-1 bg-white/10 mt-2">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((parseFloat(data.Avg_Travel_Time_Min)/80)*100, 100)}%` }} transition={{ delay: 0.5, duration: 1 }} className="h-full bg-[#bda68c]"></motion.div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/20 flex gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></div>
            <span className="text-[10px] text-rose-400">Monitoring Sector</span>
        </div>

      </div>
    </motion.div>
  );
}
