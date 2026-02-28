"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DubaiMap from '@/components/DubaiMap';
import HUDNodeOverlay from '@/components/HUDNodeOverlay';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import BusinessDashboard from '@/components/BusinessDashboard';
import MapHints from '@/components/MapHints';
import { buildGraph, dijkstra, pathToGeoJSON, RouteMapData, PathResult, PathSegment } from '@/lib/pathfinding';

const ROUTE_TYPE_COLOR: Record<string, string> = {
  Express:   '#38bdf8',
  City:      '#a78bfa',
  Feeder:    '#34d399',
  Intercity: '#fb923c',
};

export default function Home() {
  // ── View ─────────────────────────────────────────────────────────
  const [isIsometric, setIsIsometric] = useState(false);

  // ── UI Toggles ────────────────────────────────────────────────────
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [congestionMode, setCongestionMode] = useState(false);

  // ── Node selection ────────────────────────────────────────────────
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // ── Pathfinding ───────────────────────────────────────────────────
  const [mapData, setMapData] = useState<RouteMapData | null>(null);
  const [routingMode, setRoutingMode] = useState(false);
  const [routingStartNode, setRoutingStartNode] = useState<any | null>(null);
  const [routingEndNode, setRoutingEndNode] = useState<any | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [pathGeoJSON, setPathGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);

  // ── Forecast ──────────────────────────────────────────────────────
  const [forecastData, setForecastData] = useState<any | null>(null);
  const [showForecastUI, setShowForecastUI] = useState(false);
  const [selectedForecastDateIndex, setSelectedForecastDateIndex] = useState(0);

  useEffect(() => {
    fetch('/data/routes_map.json').then(r => r.json()).then(setMapData).catch(() => {});
    fetch('/data/train_forecast.json').then(r => r.json()).then(setForecastData).catch(() => {});
  }, []);

  // ── ESC → full reset ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSelectedNode(null);
      setRoutingMode(false);
      setRoutingStartNode(null);
      setRoutingEndNode(null);
      setPathResult(null);
      setPathGeoJSON(null);
      setShowForecastUI(false);
      setShowAllRoutes(false);
      setCongestionMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Build graph ───────────────────────────────────────────────────
  const { graph, stopIndex } = useMemo(() => {
    if (!mapData) return { graph: null, stopIndex: null };
    const g = buildGraph(mapData);
    const si = new Map(mapData.stops.map(s => [s.stop_id, s]));
    return { graph: g, stopIndex: si };
  }, [mapData]);

  // ── Dijkstra on start+end ─────────────────────────────────────────
  useEffect(() => {
    if (!graph || !stopIndex || !routingStartNode || !routingEndNode) {
      setPathResult(null); setPathGeoJSON(null); return;
    }
    const result = dijkstra(graph, stopIndex, Number(routingStartNode.Stop_ID), Number(routingEndNode.Stop_ID));
    setPathResult(result);
    setPathGeoJSON(result.found ? pathToGeoJSON(result) : null);
  }, [graph, stopIndex, routingStartNode, routingEndNode]);

  const isExploring = selectedNode !== null || routingMode;
  const isActive = !!(selectedNode || routingMode || showForecastUI || showAllRoutes || congestionMode || pathGeoJSON);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleStopClick = useCallback((stopData: any) => {
    if (!routingMode) { setSelectedNode(stopData || null); return; }
    if (!stopData) return;
    if (!routingStartNode) {
      setRoutingStartNode(stopData);
    } else if (!routingEndNode && stopData.Stop_ID !== routingStartNode.Stop_ID) {
      setRoutingEndNode(stopData);
    } else {
      setRoutingStartNode(stopData);
      setRoutingEndNode(null);
      setPathResult(null); setPathGeoJSON(null);
    }
  }, [routingMode, routingStartNode, routingEndNode]);

  const initRouting = useCallback(() => {
    setRoutingMode(true);
    setRoutingStartNode(selectedNode);
    setRoutingEndNode(null);
    setPathResult(null); setPathGeoJSON(null);
    setSelectedNode(null);
  }, [selectedNode]);

  const cancelRouting = useCallback(() => {
    setRoutingMode(false);
    setRoutingStartNode(null); setRoutingEndNode(null);
    setPathResult(null); setPathGeoJSON(null);
  }, []);

  const activeRouteIds = useMemo(() => {
    if (pathGeoJSON) return [];
    if (selectedNode && !routingMode) return selectedNode.passing_routes || [];
    return [];
  }, [selectedNode, routingMode, pathGeoJSON]);

  // ── Map view state: isometric vs 2D ──────────────────────────────
  const mapViewState = useMemo(() => isIsometric
    ? { longitude: 55.27, latitude: 25.20, zoom: 10, pitch: 60, bearing: -20 }
    : { longitude: 55.27, latitude: 25.20, zoom: 10, pitch: 0, bearing: 0 },
  [isIsometric]);

  return (
    <main className="relative w-full bg-[#090b10] text-slate-50 font-sans selection:bg-[#e2cca8]/30 overflow-x-hidden">

      {/* ── MAP HERO SECTION ─────────────────────────────────────────── */}
      <div className="relative w-full h-screen z-0 overflow-hidden bg-dot-grid">
        <div className="absolute inset-0 w-full h-full">
          <DubaiMap
            showAllRoutes={showAllRoutes}
            congestionMode={congestionMode}
            activeRouteIds={activeRouteIds}
            selectedStopId={routingMode ? null : selectedNode?.Stop_ID || null}
            routingStartId={routingStartNode?.Stop_ID || null}
            routingEndId={routingEndNode?.Stop_ID || null}
            onStopClick={handleStopClick}
            pathGeoJSON={pathGeoJSON}
            forecastData={
              showForecastUI && forecastData
                ? forecastData.predictions[Object.keys(forecastData.predictions)[selectedForecastDateIndex]]
                : null
            }
            initialViewState={{ longitude: 55.27, latitude: 25.20, zoom: 10, pitch: 0, bearing: 0 }}
            flyToViewState={mapViewState}
          />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#090b10]/40 to-[#090b10]/95 pointer-events-none" />
        </div>

        {/* Scroll pass-through side zones */}
        {['left', 'right'].map(side => (
          <div key={side} className={`absolute top-0 ${side}-0 w-[15%] h-full z-10`}
            onWheel={e => { e.stopPropagation(); window.scrollBy({ top: e.deltaY, behavior: 'smooth' }); }} />
        ))}

        {/* Hints: scroll tip + ESC toast */}
        <MapHints isActive={isActive} />

        {/* HEADER */}
        <header className="absolute top-8 left-8 md:top-12 md:left-12 z-20 pointer-events-none">
          <div className="flex flex-col gap-1 uppercase tracking-widest text-[#e2cca8] font-mono mb-2 text-xs">
            <span>Sys.Link_{isExploring ? 'OVERRIDE' : 'ACTIVE'}</span>
          </div>
          <h1 className="text-xl md:text-3xl font-light tracking-[0.2em] px-4 py-3 md:px-6 md:py-4 bg-[#090b10]/80 backdrop-blur-md hud-border flex items-center gap-4 text-white">
            <div className={`w-2 h-2 rounded-full ${routingMode ? 'bg-[#38bdf8]' : 'bg-rose-500'} animate-pulse`} />
            MOBILITY SHIFT
          </h1>
        </header>

        {/* TOP-LEFT TOGGLES (below header) */}
        <div className="absolute top-48 left-8 z-30 flex flex-col items-start gap-4 font-mono">
          <div className="flex flex-col items-start gap-3">
            {[
              {
                label: `SYS.ROUTES: ${showAllRoutes ? '[ON]' : '[OFF]'}`,
                active: showAllRoutes,
                color: '#e2cca8',
                description: 'Toggles global visibility for all operating routes across the city.',
                onClick: () => { setShowAllRoutes(v => !v); cancelRouting(); setSelectedNode(null); }
              },
              {
                label: `SYS.CONGESTION: ${congestionMode ? '[ON]' : '[OFF]'}`,
                active: congestionMode,
                color: '#ef4444',
                description: 'Visualizes traffic density across the network to highlight chokepoints.',
                onClick: () => setCongestionMode(v => !v)
              },
              {
                label: `ML.FORECAST: ${showForecastUI ? '[ACTIVE]' : '[STANDBY]'}`,
                active: showForecastUI,
                color: '#a855f7',
                description: 'Projects 30-day future passenger demand using a Random Forest ML model.',
                onClick: () => setShowForecastUI(v => !v)
              },
              {
                label: `OPT.PATH: ${routingMode ? '[ACTIVE]' : '[STANDBY]'}`,
                active: routingMode,
                color: '#38bdf8',
                description: 'Calculates the fastest multi-route journey between any two selected stops using Dijkstra.',
                onClick: () => { setRoutingMode(true); setRoutingStartNode(null); setRoutingEndNode(null); setPathResult(null); setPathGeoJSON(null); setSelectedNode(null); }
              },
              {
                label: `VIEW: ${isIsometric ? '[3D ISO]' : '[2D FLAT]'}`,
                active: isIsometric,
                color: '#34d399',
                description: 'Seamlessly toggles the camera between a flat 2D and 3D isometric projection.',
                onClick: () => setIsIsometric(v => !v)
              },
            ].map(btn => (
              <div key={btn.label} className="relative group flex items-center gap-2">
                <button onClick={btn.onClick}
                  className={`px-4 py-2 border text-xs tracking-widest transition-colors backdrop-blur-md whitespace-nowrap`}
                  style={btn.active
                    ? { background: `${btn.color}22`, borderColor: btn.color, color: btn.color }
                    : { background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)' }
                  }
                >
                  {btn.label}
                </button>
                <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/50 text-[10px] cursor-help bg-black/40 hover:bg-white/10 transition-colors shrink-0">
                  i
                </div>
                {/* Tooltip */}
                <div className="absolute left-full ml-4 px-3 py-2 bg-[#090b10]/95 backdrop-blur-md border border-white/10 text-[10px] text-white/70 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded shadow-xl z-50">
                  {btn.description}
                </div>
              </div>
            ))}
          </div>

          {/* SCROLL INDICATOR COPIED BELOW TOGGLES */}
          <div className="mt-6 text-[#22d3ee] drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] flex flex-col items-center gap-2 font-mono text-xs opacity-90 hover:opacity-100 transition-opacity animate-bounce cursor-pointer w-full text-center font-bold"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
            SCROLL FOR ANALYTICS
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* FORECAST PANEL */}
        <AnimatePresence>
          {showForecastUI && forecastData && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-[600px] max-w-[90vw] bg-[#090b10]/90 backdrop-blur-md border border-[#a855f7]/40 p-6 font-mono">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-[#a855f7] text-sm tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-[#a855f7] animate-pulse" /> PREDICTIVE AI ACTIVE
                </div>
                <div className="text-white/60 text-xs">Model: Random Forest (30-Day)</div>
              </div>
              <div className="mb-2 text-white/80 text-lg flex justify-between font-light">
                <span>Date:</span>
                <span className="text-white font-bold">
                  {new Date(Object.keys(forecastData.predictions)[selectedForecastDateIndex]).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <input type="range" min="0" max="29" value={selectedForecastDateIndex}
                onChange={e => setSelectedForecastDateIndex(parseInt(e.target.value))}
                className="w-full h-1 bg-[#a855f7]/20 rounded-lg appearance-none cursor-pointer accent-[#a855f7]" />
              <div className="flex justify-between mt-2 text-[10px] text-white/40">
                <span>{forecastData.start_date}</span><span>{forecastData.end_date}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NODE OVERLAY */}
        <AnimatePresence>
          {selectedNode && !routingMode && (
            <HUDNodeOverlay data={selectedNode} onClose={() => setSelectedNode(null)} onRouteAction={initRouting} />
          )}
        </AnimatePresence>

        {/* ── OPTIMAL PATH HUD (bottom-left) ─────────────────────── */}
        <AnimatePresence>
          {routingMode && (
            <motion.div key="routing-hud"
              initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="absolute left-8 bottom-8 z-40 w-[340px] font-mono">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[#38bdf8] text-[11px] tracking-[0.25em] uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" /> Optimal Path Engine
                </div>
                <button onClick={cancelRouting} className="text-white/30 hover:text-white text-[11px] transition-colors">[ EXIT ]</button>
              </div>

              {/* Node pickers */}
              <div className="bg-[#090b10]/90 backdrop-blur-md border border-[#38bdf8]/30 p-4 rounded-xl mb-3 space-y-3">
                {[
                  { label: 'A', color: '#38bdf8', title: 'Origin', node: routingStartNode },
                  { label: 'B', color: '#f43f5e', title: 'Destination', node: routingEndNode },
                ].map(({ label, color, title, node }) => (
                  <div key={label}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ borderColor: color, color }}>{label}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">{title}</div>
                        {node
                          ? <div className="text-white text-xs font-bold truncate">{node.Stop_Name || node.stop_name || `Stop #${node.Stop_ID}`}</div>
                          : <div className="text-white/30 text-xs italic">{label === 'A' ? 'Click a stop on the map' : routingStartNode ? 'Now click destination' : 'Pick origin first'}</div>
                        }
                      </div>
                      {node && <div style={{ color }} className="text-[10px]">✓</div>}
                    </div>
                    {label === 'A' && <div className="h-px bg-white/5 mt-3" />}
                  </div>
                ))}
              </div>

              {/* Result */}
              <AnimatePresence>
                {pathResult?.found && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                    className="bg-[#090b10]/95 backdrop-blur-md border border-[#38bdf8]/40 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
                      {[
                        { label: 'TIME',      value: `${Math.round(pathResult.totalMinutes)}m` },
                        { label: 'DISTANCE',  value: `${pathResult.totalKm}km` },
                        { label: 'TRANSFERS', value: `${pathResult.transfers}` },
                      ].map(k => (
                        <div key={k.label} className="p-3 text-center">
                          <div className="text-[8px] text-white/30 uppercase tracking-widest">{k.label}</div>
                          <div className="text-lg font-bold text-[#38bdf8] mt-0.5">{k.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 space-y-3 max-h-52 overflow-y-auto">
                      <div className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Route Segments</div>
                      {pathResult.segments.map((seg: PathSegment, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex flex-col items-center shrink-0 mt-1">
                            <div className="w-2 h-2 rounded-full border-2" style={{ borderColor: ROUTE_TYPE_COLOR[seg.route_type] ?? '#e2cca8' }} />
                            {i < pathResult.segments.length - 1 && (
                              <div className="w-px flex-1 my-1 min-h-[16px]" style={{ background: ROUTE_TYPE_COLOR[seg.route_type] ?? '#e2cca8', opacity: 0.4 }} />
                            )}
                          </div>
                          <div className="flex-1 pb-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold" style={{ color: ROUTE_TYPE_COLOR[seg.route_type] ?? '#e2cca8' }}>{seg.route_code}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded text-white/60" style={{ background: `${ROUTE_TYPE_COLOR[seg.route_type]}22` }}>{seg.route_type}</span>
                            </div>
                            <div className="text-[10px] text-white/50 mt-0.5">
                              {seg.from.stop_name?.replace(/_/g, ' ')} → {seg.to.stop_name?.replace(/_/g, ' ')}
                            </div>
                            <div className="text-[9px] text-white/30 mt-0.5">{Math.round(seg.minutes)}min · {seg.km}km</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
                {pathResult && !pathResult.found && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-[#090b10]/90 border border-red-500/30 rounded-xl p-4 text-center text-red-400 text-xs">
                    No route found between these stops.
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        

        {/* CROSSHAIR */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none opacity-10">
          <div className="relative w-[30vh] h-[30vh] border border-white/10 rounded-full flex items-center justify-center">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 -translate-x-1/2" />
            <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10 -translate-y-1/2" />
          </div>
        </div>

      </div>

      {/* ── DASHBOARD SECTION (always mounted below) ─────────────────── */}
      <div className="relative w-full z-10 bg-[#090b10] min-h-screen border-t border-white/5 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pt-12">
        <AnalyticsDashboard />
      </div>

      {/* ── BUSINESS INTELLIGENCE SECTION ────────────────────────────── */}
      <div className="relative w-full z-10 bg-[#060809] border-t border-white/5 pt-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-linear-to-r from-transparent to-[#a78bfa]/30" />
            <div className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-mono">Business Intelligence · ML Pipeline Output</div>
            <div className="h-px flex-1 bg-linear-to-l from-transparent to-[#a78bfa]/30" />
          </div>
        </div>
        <BusinessDashboard />
      </div>

    </main>
  );
}
