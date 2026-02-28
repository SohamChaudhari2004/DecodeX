"use client";

import { motion } from 'framer-motion';

interface HUDRoutingOverlayProps {
  startNode: { Stop_Name: string } | null;
  endNode: { Stop_Name: string } | null;
  commonRoutes: string[];
  selectedRoute: string | null;
  onSelectRoute: (route: string) => void;
  onCancel: () => void;
}

export default function HUDRoutingOverlay({ startNode, endNode, commonRoutes, selectedRoute, onSelectRoute, onCancel }: HUDRoutingOverlayProps) {
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-[400px] pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-[#090b10]/90 backdrop-blur-xl hud-border p-4 font-mono text-sm uppercase tracking-wider text-white w-full"
      >
        <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-2">
           <div className="text-[#38bdf8] text-[10px] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse"></div>
            NAV COMPUTER ACTIVE
          </div>
          <button onClick={onCancel} className="text-white/50 hover:text-rose-400 transition-colors">
            [ABORT]
          </button>
        </div>

        <div className="flex flex-col gap-3 relative">
          
          {/* Vertical connecting line */}
          <div className="absolute left-2.5 top-3 bottom-8 w-px bg-white/20"></div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-5 h-5 rounded-full bg-[#38bdf8]/20 border border-[#38bdf8] flex items-center justify-center shrink-0">
               <div className="w-1.5 h-1.5 bg-[#38bdf8] rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-[9px] text-white/50">ORIGIN</div>
               <div className="truncate text-[#e2cca8] text-xs font-bold">{startNode ? startNode.Stop_Name.replace(/_/g, ' ') : "AWAITING..."}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center shrink-0">
               <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-[9px] text-white/50">DESTINATION</div>
               <div className="truncate text-white text-xs font-bold">{endNode ? endNode.Stop_Name.replace(/_/g, ' ') : "AWAITING..."}</div>
            </div>
          </div>

        </div>

        {startNode && endNode && (
          <div className="mt-4 pt-3 border-t border-white/10">
             <div className="text-[9px] text-white/50 mb-2">AVAILABLE DIRECT ROUTES [SELECT ONE]</div>
             {commonRoutes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {commonRoutes.map(r => (
                    <button 
                      key={r} 
                      onClick={() => onSelectRoute(r)}
                      className={`px-3 py-1.5 border rounded-sm text-[10px] transition-colors focus:outline-none ${
                        selectedRoute === r 
                        ? 'bg-[#38bdf8] text-[#090b10] border-[#38bdf8] shadow-[0_0_10px_#38bdf8]' 
                        : 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/30 hover:bg-[#38bdf8]/30 hover:border-[#38bdf8]'
                      }`}
                    >
                      ROUTE {r}
                    </button>
                  ))}
                </div>
             ) : (
                <div className="text-rose-400 text-xs text-center py-2 bg-rose-500/10 border border-rose-500/30">NO DIRECT PATH FOUND</div>
             )}
          </div>
        )}

      </motion.div>
    </div>
  );
}
