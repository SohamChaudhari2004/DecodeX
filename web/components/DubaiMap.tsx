"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Map, { Source, Layer, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// Route-type colours for path segments
const ROUTE_TYPE_COLOR: Record<string, string> = {
  Express:   '#38bdf8',
  City:      '#a78bfa',
  Feeder:    '#34d399',
  Intercity: '#fb923c',
};

interface DubaiMapProps {
  showAllRoutes: boolean;
  congestionMode: boolean;
  activeRouteIds: string[];   // Routes to strictly highlight
  selectedStopId: string | null;
  routingStartId: string | null;
  routingEndId: string | null;
  onStopClick: (stopProps: any) => void;
  forecastData?: any;
  pathGeoJSON?: GeoJSON.FeatureCollection | null;
  /** Changing this triggers a flyTo animation — use for 2D↔3D toggle */
  flyToViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
  };
}

export default function DubaiMap({
  showAllRoutes,
  congestionMode,
  activeRouteIds,
  selectedStopId,
  routingStartId,
  routingEndId,
  onStopClick,
  forecastData,
  pathGeoJSON = null,
  flyToViewState,
  initialViewState = {
    longitude: 55.2708,
    latitude: 25.2048,
    zoom: 11
  }
}: DubaiMapProps) {
  // Fly to new view when flyToViewState changes (skip first render)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!flyToViewState || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyToViewState.longitude, flyToViewState.latitude],
      zoom:    flyToViewState.zoom,
      pitch:   flyToViewState.pitch   ?? 0,
      bearing: flyToViewState.bearing ?? 0,
      duration: 1200,
      essential: true,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToViewState]);
  // 0→1 draw-on progress; resets and plays whenever pathGeoJSON changes
  const [pathProgress, setPathProgress] = useState(0);

  useEffect(() => {
    if (!pathGeoJSON) { setPathProgress(0); return; }
    setPathProgress(0);
    const DURATION = 2000; // ms
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      // ease-in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setPathProgress(Math.max(0, Math.min(1, eased)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pathGeoJSON]);

  // Build per-segment color expression for path lines
  const pathColorExpr = useMemo(() => {
    if (!pathGeoJSON) return '#38bdf8';
    const expr: any[] = ['match', ['get', 'route_type']];
    for (const [type, color] of Object.entries(ROUTE_TYPE_COLOR)) {
      expr.push(type, color);
    }
    expr.push('#e2cca8');
    return expr;
  }, [pathGeoJSON]);

  // line-gradient clips the line at pathProgress using line-progress
  // Gradient: color from 0 → pathProgress, then transparent after
  const makeGradient = useCallback((color: string) => {
    const p = Math.max(0.001, pathProgress);
    // Fully drawn — no clipping needed, just solid colour
    if (p >= 0.999) {
      return ['interpolate', ['linear'], ['line-progress'], 0, color, 1, color] as any;
    }
    const after = p + 0.001; // always < 1 here since p < 0.999
    return [
      'interpolate', ['linear'], ['line-progress'],
      0,     color,
      p,     color,
      after, 'rgba(0,0,0,0)',
      1,     'rgba(0,0,0,0)',
    ] as any;
  }, [pathProgress]);

  // Extract all line coordinates from pathGeoJSON for tracker interpolation
  const pathCoords = useMemo<[number,number][]>(() => {
    if (!pathGeoJSON) return [];
    const coords: [number,number][] = [];
    for (const f of pathGeoJSON.features) {
      if (f.geometry.type === 'LineString') {
        coords.push(...(f.geometry.coordinates as [number,number][]));
      }
    }
    return coords;
  }, [pathGeoJSON]);

  // Tracker point: moves along pathCoords from 0→1, looping
  const [trackerPoint, setTrackerPoint] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    if (!pathGeoJSON || pathCoords.length < 2) { setTrackerPoint(null); return; }
    let frame: number;
    let t = 0;
    const SPEED = 0.0018; // fraction of total path per frame (~60fps → ~9s per loop)

    // Segment accumulated lengths for accurate interpolation
    const segLengths: number[] = [0];
    for (let i = 1; i < pathCoords.length; i++) {
      const [x1, y1] = pathCoords[i - 1];
      const [x2, y2] = pathCoords[i];
      const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      segLengths.push(segLengths[i - 1] + d);
    }
    const totalLen = segLengths[segLengths.length - 1];

    const getPointAt = (frac: number): [number, number] => {
      const target = frac * totalLen;
      let lo = 0, hi = segLengths.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (segLengths[mid] <= target) lo = mid; else hi = mid;
      }
      const seg = segLengths[hi] - segLengths[lo];
      const alpha = seg === 0 ? 0 : (target - segLengths[lo]) / seg;
      const [x1, y1] = pathCoords[lo];
      const [x2, y2] = pathCoords[hi];
      return [x1 + (x2 - x1) * alpha, y1 + (y2 - y1) * alpha];
    };

    // Wait for draw animation to finish before starting tracker
    const timer = setTimeout(() => {
      const animate = () => {
        t = (t + SPEED) % 1;
        const [lng, lat] = getPointAt(t);
        setTrackerPoint({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: [lng, lat] },
          }],
        });
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }, 2100);

    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [pathGeoJSON, pathCoords]);
  const mapRef = useRef<MapRef>(null);
  const [hoveredStopId, setHoveredStopId] = useState<string | null>(null);
  const [hoveredStopRoutes, setHoveredStopRoutes] = useState<string[]>([]);
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);

  const onMouseEnter = useCallback((e: any) => {
    if (e.features && e.features.length > 0) {
      if (e.features[0].layer.id.includes('stop')) {
        const id = e.features[0].properties.Stop_ID;
        const routes = (e.features[0].properties.passing_routes || "").split(',').filter(Boolean);
        setHoveredStopId(id);
        setHoveredStopRoutes(routes);
      } else if (showAllRoutes && e.features[0].layer.id.includes('route')) {
        setHoveredRouteId(e.features[0].properties.Route_ID);
      }
      if (mapRef.current) mapRef.current.getMap().getCanvas().style.cursor = 'crosshair';
    }
  }, [showAllRoutes]);

  const onMouseLeave = useCallback(() => {
    setHoveredStopId(null);
    setHoveredStopRoutes([]);
    setHoveredRouteId(null);
    if (mapRef.current) mapRef.current.getMap().getCanvas().style.cursor = '';
  }, []);

  const onClick = useCallback((e: any) => {
    if (e.features && e.features.length > 0) {
      const stopFeature = e.features.find((f: any) => f.layer.id.includes('stop'));
      if (stopFeature) {
        const props = { ...stopFeature.properties };
        // MapLibre serializes arrays to strings — parse passing_routes back into a real array
        if (typeof props.passing_routes === 'string') {
          try {
            props.passing_routes = JSON.parse(props.passing_routes);
          } catch {
            props.passing_routes = props.passing_routes.split(',').filter(Boolean);
          }
        }
        onStopClick(props);
        return;
      }
    }
    // Clicking empty space
    onStopClick(null);
  }, [onStopClick]);


  const glowColor = '#e2cca8';
  const activeColor = '#ffffff';

  // Build the match array for highlighted routes
  // format: ['in', ['get', 'Route_ID'], ['literal', ['A', 'B', 'C']]]
  const combinedHighlights = Array.from(new Set([...activeRouteIds, ...hoveredStopRoutes]));
  const highlightExpression = (combinedHighlights.length > 0
    ? ['in', ['get', 'Route_ID'], ['literal', combinedHighlights]]
    : ['==', '1', '2']) as any;

  const isHoveredRoute = (hoveredRouteId
    ? ['==', ['get', 'Route_ID'], hoveredRouteId]
    : ['==', '1', '2']) as any;

  const showRouteBase = showAllRoutes ? true : highlightExpression;

  const isSelectedStop = (selectedStopId
    ? ['==', ['get', 'Stop_ID'], selectedStopId]
    : ['==', '1', '2']) as any;

  const isRoutingNode = (routingStartId || routingEndId
    ? ['in', ['get', 'Stop_ID'], ['literal', [routingStartId || '', routingEndId || '']]]
    : ['==', '1', '2']) as any;

  const isHoveredStop = (hoveredStopId
    ? ['==', ['get', 'Stop_ID'], hoveredStopId]
    : ['==', '1', '2']) as any;

  // Check if a node shares ANY route with the currently hovered node
  const isAdjacentStop = (hoveredStopRoutes.length > 0
    ? ['any', ...hoveredStopRoutes.map(r => ['in', r, ['get', 'passing_routes']])]
    : ['==', '1', '2']) as any;

  const activeStopExp = ['any', isSelectedStop, isRoutingNode, isHoveredStop] as any;

  // Determine node visibility based on hover state
  const isAnyStopHovered = hoveredStopId !== null;

  // Dynamic ML Forecasting override
  const forecastNodeColorExp = useMemo(() => {
    if (!forecastData) return null;
    const match = ['match', ['get', 'Stop_ID']];
    for (const [stopId, data] of Object.entries(forecastData)) {
      match.push(stopId, (data as any).congestion_color);
    }
    match.push('#38bdf8'); // default glow
    return match as any;
  }, [forecastData]);

  // If forecasting is active, hide route colors and drop them to bg logic? 
  // Let's just override stop circles
  const computedCircleColor = forecastNodeColorExp || (congestionMode ? ['get', 'congestion_color'] : [
    'case',
    isRoutingNode, '#38bdf8',
    glowColor
  ]);

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        interactive={true}
        attributionControl={false}
        interactiveLayerIds={['stops-glow-layer', 'stops-core-layer', ...(showAllRoutes ? ['routes-click-layer'] : [])]}
        onMouseMove={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <Source id="routes" type="geojson" data="/data/routes.geojson">
          {/* Subtle track - only visible if showAllRoutes */}
          <Layer
            id="routes-bg-layer"
            type="line"
            paint={{
              'line-color': 'rgba(255,255,255,0.05)',
              'line-width': 2,
              'line-dasharray': [2, 2],
              'line-opacity': showAllRoutes ? 1 : 0
            }}
          />

          {/* Outer Glow for Highlights */}
          <Layer
            id="routes-glow-layer"
            type="line"
            paint={{
              'line-color': congestionMode ? ['get', 'congestion_color'] : [
                'case',
                highlightExpression, glowColor,
                isHoveredRoute, glowColor,
                'rgba(226, 204, 168, 0.05)'
              ],
              'line-width': [
                'case',
                highlightExpression, 12,
                isHoveredRoute, 8,
                2
              ],
              'line-blur': 6,
              'line-opacity': [
                'case',
                highlightExpression, 0.8,
                isHoveredRoute, 0.5,
                showAllRoutes ? 0.1 : 0
              ]
            }}
          />

          {/* Core Line */}
          <Layer
            id="routes-core-layer"
            type="line"
            paint={{
              'line-color': congestionMode ? ['get', 'congestion_color'] : [
                'case',
                highlightExpression, activeColor,
                isHoveredRoute, activeColor,
                'rgba(255, 255, 255, 0.05)'
              ],
              'line-width': [
                'case',
                highlightExpression, 3,
                isHoveredRoute, 2,
                1
              ],
              'line-opacity': [
                'case',
                highlightExpression, 1,
                isHoveredRoute, 1,
                showAllRoutes ? 0.2 : 0
              ]
            }}
          />

          {showAllRoutes && (
            <Layer
              id="routes-click-layer"
              type="line"
              paint={{
                'line-color': 'transparent',
                'line-width': 15
              }}
            />
          )}
        </Source>

        {/* ── OPTIMAL PATH LAYERS ──────────────────────────────── */}
        {pathGeoJSON && (
          <Source id="path" type="geojson" data={pathGeoJSON} lineMetrics={true}>

            {/* 1. Wide outer halo — fades in with draw */}
            <Layer
              id="path-halo"
              type="line"
              filter={['==', '$type', 'LineString']}
              paint={{
                'line-color': makeGradient('#38bdf8'),
                'line-width': 28,
                'line-blur': 22,
                'line-opacity': 0.6,
              }}
            />

            {/* 2. Core draw-on line */}
            <Layer
              id="path-core"
              type="line"
              filter={['==', '$type', 'LineString']}
              paint={{
                'line-gradient': makeGradient('#a78bfa'),
                'line-width': 5,
                'line-opacity': 1,
              }}
            />

            {/* 3. Tracker dot rendered in a separate Source below */}

            {/* 4. Path stop GLOW circles */}
            <Layer
              id="path-stop-glow"
              type="circle"
              filter={['==', '$type', 'Point']}
              paint={{
                'circle-radius': 20,
                'circle-color': '#a78bfa',
                'circle-opacity': pathProgress,
                'circle-blur': 1,
              }}
            />

            {/* 5. Path stop core circles */}
            <Layer
              id="path-stop-core"
              type="circle"
              filter={['==', '$type', 'Point']}
              paint={{
                'circle-radius': 7,
                'circle-color': '#ffffff',
                'circle-stroke-width': 2.5,
                'circle-stroke-color': '#a78bfa',
                'circle-opacity': pathProgress,
              }}
            />
          </Source>
        )}

        {/* ── TRACKER DOT ─────────────────────────────── */}
        {trackerPoint && (
          <Source id="tracker" type="geojson" data={trackerPoint}>
            {/* Outer corona */}
            <Layer
              id="tracker-corona"
              type="circle"
              paint={{
                'circle-radius': 22,
                'circle-color': '#ffffff',
                'circle-opacity': 0.15,
                'circle-blur': 1,
              }}
            />
            {/* Mid glow */}
            <Layer
              id="tracker-glow"
              type="circle"
              paint={{
                'circle-radius': 12,
                'circle-color': '#38bdf8',
                'circle-opacity': 0.6,
                'circle-blur': 0.6,
              }}
            />
            {/* Bright core */}
            <Layer
              id="tracker-core"
              type="circle"
              paint={{
                'circle-radius': 5,
                'circle-color': '#ffffff',
                'circle-opacity': 1,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#38bdf8',
              }}
            />
          </Source>
        )}

        <Source id="stops" type="geojson" data="/data/stops.geojson">
          {/* Node Outer Glow */}
          <Layer
            id="stops-glow-layer"
            type="circle"
            paint={{
              'circle-radius': [
                'case',
                activeStopExp, 32, // was 24
                24                 // was 14
              ],
              'circle-color': computedCircleColor,
              'circle-opacity': [
                'case',
                activeStopExp, 0.5,
                // Highlight adjacent, keep others at default glow
                isAnyStopHovered, [
                  'case',
                  isAdjacentStop, 0.35,
                  0.15 // Default instead of hiding
                ],
                0.15 // Default
              ],
              'circle-blur': 1
            }}
          />

          {/* Node Core */}
          <Layer
            id="stops-core-layer"
            type="circle"
            paint={{
              'circle-radius': [
                'case',
                activeStopExp, 12,   // was 8
                8                   // was 4
              ],
              'circle-color': forecastNodeColorExp || (congestionMode ? ['get', 'congestion_color'] : activeColor),
              'circle-opacity': [
                'case',
                activeStopExp, 1,
                1
              ],
              'circle-stroke-width': [
                'case',
                activeStopExp, 2,
                1
              ],
              'circle-stroke-color': '#090b10',
              'circle-stroke-opacity': [
                'case',
                activeStopExp, 1,
                1
              ]
            }}
          />
        </Source>
      </Map>
    </div>
  );
}
