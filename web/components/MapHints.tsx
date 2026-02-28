"use client";

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface MapHintsProps {
  /** Show the "Press ESC to reset" toast */
  isActive: boolean;
}

export default function MapHints({ isActive }: MapHintsProps) {
  const [showScrollHint, setShowScrollHint] = useState(true);

  // Hide scroll hint after 5 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowScrollHint(false), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* ── SCROLL HINT — top-centre, 5 second auto-dismiss ───────── */}
      <AnimatePresence>
        {showScrollHint && (
          <motion.div
            key="scroll-hint"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="flex items-center gap-3 bg-[#090b10]/85 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full font-mono text-[11px] tracking-widest text-white/60 shadow-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-[#e2cca8] animate-pulse shrink-0" />
              Scroll from the sides to explore statistics below
              <div className="flex gap-1 opacity-50">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ESC RESET TOAST — bottom-centre, shown when anything active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="esc-hint"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="flex items-center gap-3 bg-[#090b10]/90 backdrop-blur-md border border-[#38bdf8]/30 px-5 py-2.5 rounded-full font-mono text-[11px] tracking-widest shadow-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse shrink-0" />
              <span className="text-white/40">System active —</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white text-[10px] font-bold tracking-widest">ESC</kbd>
              <span className="text-white/40">to reset all</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
