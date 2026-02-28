"use client";

import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DubaiMap from '@/components/DubaiMap';
import HUDNodeOverlay from '@/components/HUDNodeOverlay';
import HUDRoutingOverlay from '@/components/HUDRoutingOverlay';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import BusinessDashboard from '@/components/BusinessDashboard';

export default function Home() {
  // UI Toggles
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [congestionMode, setCongestionMode] = useState(false);

  // States
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [routingMode, setRoutingMode] = useState(false);
  const [routingStartNode, setRoutingStartNode] = useState<any | null>(null);
  const [routingEndNode, setRoutingEndNode] = useState<any | null>(null);
  const [selectedRoutingRouteId, setSelectedRoutingRouteId] = useState<string | null>(null);

  // Forecast ML States
  const [forecastData, setForecastData] = useState<any | null>(null);
  const [showForecastUI, setShowForecastUI] = useState(false);
  const [selectedForecastDateIndex, setSelectedForecastDateIndex] = useState(0);

  useEffect(() => {
    fetch('/data/train_forecast.json')
      .then(r => r.json())
      .then(d => setForecastData(d))
      .catch(e => console.error("Forecast data missing", e));
  }, []);

  const isExploring = selectedNode !== null || routingMode;

  const handleStopClick = (stopData: any) => {
    if (!routingMode) {
      if (stopData) {
        setSelectedNode(stopData);
      } else {
        setSelectedNode(null);
      }
    } else {
      // Routing mode logic
      if (!stopData) return; // ignore clicks on empty space if routing

      if (!routingStartNode) {
        setRoutingStartNode(stopData);
        setSelectedRoutingRouteId(null);
      } else if (!routingEndNode && stopData.Stop_ID !== routingStartNode.Stop_ID) {
        setRoutingEndNode(stopData);
        setSelectedRoutingRouteId(null);
      } else if (routingStartNode && routingEndNode) {
        // Reset and pick new start
        setRoutingStartNode(stopData);
        setRoutingEndNode(null);
        setSelectedRoutingRouteId(null);
      }
    }
  };

  const initRouting = () => {
    setRoutingMode(true);
    setRoutingStartNode(selectedNode);
    setRoutingEndNode(null);
    setSelectedRoutingRouteId(null);
    setSelectedNode(null);
  };

  const cancelRouting = () => {
    setRoutingMode(false);
    setRoutingStartNode(null);
    setRoutingEndNode(null);
    setSelectedRoutingRouteId(null);
  };

  // Compute common routes for highlighting
  const activeRouteIds = useMemo(() => {
    if (routingMode && routingStartNode && routingEndNode) {
      if (selectedRoutingRouteId) return [selectedRoutingRouteId];
      const startRoutes = routingStartNode.passing_routes || [];
      const endRoutes = routingEndNode.passing_routes || [];
      return startRoutes.filter((r: string) => endRoutes.includes(r) && r);
    }
    if (selectedNode && !routingMode) {
      return selectedNode.passing_routes || [];
    }
    return [];
  }, [selectedNode, routingStartNode, routingEndNode, routingMode, selectedRoutingRouteId]);

  // Compute available routes for routing overlay (ignoring selection)
  const availableRoutes = useMemo(() => {
    if (routingMode && routingStartNode && routingEndNode) {
      const startRoutes = routingStartNode.passing_routes || [];
      const endRoutes = routingEndNode.passing_routes || [];
      return startRoutes.filter((r: string) => endRoutes.includes(r) && r);
    }
    return [];
  }, [routingStartNode, routingEndNode, routingMode]);

  return (
    <main className="relative w-full bg-[#090b10] text-slate-50 font-sans selection:bg-[#e2cca8]/30 overflow-x-hidden">

      {/* MAP HERO SECTION */}
      <div className="relative w-full h-screen z-0 overflow-hidden bg-dot-grid">
        <div className="absolute inset-0 w-full h-full">
          <DubaiMap
            showAllRoutes={showAllRoutes}
            congestionMode={congestionMode}
            activeRouteIds={activeRouteIds}
            selectedStopId={routingMode ? null : selectedNode?.Stop_ID || null}
            routingStartId={routingMode ? routingStartNode?.Stop_ID || null : null}
            routingEndId={routingMode ? routingEndNode?.Stop_ID || null : null}
            onStopClick={handleStopClick}
            forecastData={
              showForecastUI && forecastData
                ? forecastData.predictions[Object.keys(forecastData.predictions)[selectedForecastDateIndex]]
                : null
            }
          />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#090b10]/40 to-[#090b10]/95 pointer-events-none"></div>
        </div>

        {/* SCROLL ZONES — transparent side panels that pass scroll to page */}
        <div
          className="absolute top-0 left-0 w-[15%] h-full z-10"
          onWheel={(e) => {
            e.stopPropagation();
            window.scrollBy({ top: e.deltaY, behavior: 'smooth' });
          }}
        />
        <div
          className="absolute top-0 right-0 w-[15%] h-full z-10"
          onWheel={(e) => {
            e.stopPropagation();
            window.scrollBy({ top: e.deltaY, behavior: 'smooth' });
          }}
        />


        {/* HEADER LOGO */}
        <header className="absolute top-8 left-8 md:top-12 md:left-12 z-20 pointer-events-none">
          <div className="flex flex-col gap-1 uppercase tracking-widest text-[#e2cca8] font-mono mb-2 text-xs">
            <span>Sys.Link_{isExploring ? 'OVERRIDE' : 'ACTIVE'}</span>
          </div>
          <h1 className="text-xl md:text-3xl font-light tracking-[0.2em] px-4 py-3 md:px-6 md:py-4 bg-[#090b10]/80 backdrop-blur-md hud-border flex items-center gap-4 text-white">
            <div className={`w-2 h-2 rounded-full ${routingMode ? 'bg-[#38bdf8]' : 'bg-rose-500'} animate-pulse`}></div>
            MOBILITY LOGIC
          </h1>
        </header>

        {/* TOP RIGHT GLOBAL TOGGLES */}
        <div className="absolute top-48 right-8 z-30 flex flex-col gap-3 font-mono">
          <button
            onClick={() => {
              setShowAllRoutes(!showAllRoutes);
              cancelRouting();
              setSelectedNode(null);
            }}
            className={`px-4 py-2 border text-xs tracking-widest transition-colors backdrop-blur-md ${showAllRoutes ? 'bg-[#e2cca8]/20 border-[#e2cca8] text-[#e2cca8]' : 'bg-black/40 border-white/20 text-white/50 hover:border-white/50 hover:text-white'}`}
          >
            SYS.ROUTES: {showAllRoutes ? '[ON]' : '[OFF]'}
          </button>
          <button
            onClick={() => setCongestionMode(!congestionMode)}
            className={`px-4 py-2 border text-xs tracking-widest transition-colors backdrop-blur-md ${congestionMode ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]' : 'bg-black/40 border-white/20 text-white/50 hover:border-white/50 hover:text-white'}`}
          >
            SYS.CONGESTION: {congestionMode ? '[ON]' : '[OFF]'}
          </button>
          <button
            onClick={() => setShowForecastUI(!showForecastUI)}
            className={`px-4 py-2 border text-xs tracking-widest transition-colors backdrop-blur-md ${showForecastUI ? 'bg-[#a855f7]/20 border-[#a855f7] text-[#a855f7]' : 'bg-black/40 border-white/20 text-white/50 hover:border-white/50 hover:text-white'}`}
          >
            ML.FORECAST: {showForecastUI ? '[ACTIVE]' : '[STANDBY]'}
          </button>
        </div>

        {/* FORECAST UI PANEL */}
        <AnimatePresence>
          {showForecastUI && forecastData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-[600px] max-w-[90vw] bg-[#090b10]/90 backdrop-blur-md border border-[#a855f7]/40 p-6 font-mono"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-[#a855f7] text-sm tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-[#a855f7] animate-pulse"></div>
                  PREDICTIVE AI ACTIVE
                </div>
                <div className="text-white/60 text-xs">Model: Random Forest (7-Day)</div>
              </div>

              <div className="mb-2 text-white/80 text-lg flex justify-between font-light">
                <span>Date:</span>
                <span className="text-white font-bold">
                  {Object.keys(forecastData.predictions)[selectedForecastDateIndex]}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="6"
                value={selectedForecastDateIndex}
                onChange={(e) => setSelectedForecastDateIndex(parseInt(e.target.value))}
                className="w-full h-1 bg-[#a855f7]/20 rounded-lg appearance-none cursor-pointer accent-[#a855f7]"
              />

              <div className="flex justify-between mt-2 text-[10px] text-white/40">
                <span>{forecastData.start_date}</span>
                <span>{forecastData.end_date}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OVERLAYS */}
        <AnimatePresence>
          {selectedNode && !routingMode && (
            <HUDNodeOverlay
              data={selectedNode}
              onClose={() => setSelectedNode(null)}
              onRouteAction={initRouting}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {routingMode && (
            <HUDRoutingOverlay
              startNode={routingStartNode}
              endNode={routingEndNode}
              commonRoutes={availableRoutes}
              selectedRoute={selectedRoutingRouteId}
              onSelectRoute={setSelectedRoutingRouteId}
              onCancel={cancelRouting}
            />
          )}
        </AnimatePresence>

        {/* OVERLAYS */}
        <div className="absolute top-0 right-0 z-50 pointer-events-none p-8 flex justify-end items-start w-full">
          <div className="text-[#38bdf8] font-mono pointer-events-auto text-right">
            <h1 className="text-2xl font-bold tracking-widest uppercase hud-border p-4 bg-[#090b10]/80 text-[#e2cca8]">DXB_RTA // OMNI</h1>
            <div className="flex flex-col gap-2 mt-2 items-end">
              <a href="/isometric" className="inline-block mt-4 px-3 py-1 text-xs border border-[#38bdf8]/50 text-[#38bdf8]/80 hover:bg-[#38bdf8]/20 hover:text-[#38bdf8] transition-colors rounded-sm w-fit">
                [ SWITCH TO 3D ISOMETRIC ]
              </a>
            </div>
          </div>
        </div>

        {/* CROSSHAIR */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none opacity-10">
          <div className="relative w-[30vh] h-[30vh] border border-white/10 rounded-full flex items-center justify-center">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 -translate-x-1/2"></div>
            <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10 -translate-y-1/2"></div>
          </div>
        </div>

        {/* SCROLL INDICATOR */}
        <div className="absolute bottom-12 right-12 text-[#ffffff] z-20 flex flex-col items-center gap-2 font-mono text-xs opacity-50 animate-bounce cursor-pointer" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
          SCROLL FOR ANALYTICS
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
        </div>

      </div> {/* END MAP SECTION */}

      {/* DASHBOARD SECTION */}
      <div className="relative w-full z-10 bg-[#090b10] min-h-screen border-t border-white/5 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pt-12">
        <AnalyticsDashboard />
      </div>

      {/* BUSINESS INTELLIGENCE SECTION */}
      <div className="relative w-full z-10 bg-[#060809] border-t border-white/5 pt-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#a78bfa]/30"></div>
            <div className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-mono">Business Intelligence · ML Pipeline Output</div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#a78bfa]/30"></div>
          </div>
        </div>
        <BusinessDashboard />
      </div>

    </main>
  );
}
