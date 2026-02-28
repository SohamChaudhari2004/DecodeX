"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Map, { Source, Layer, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface DubaiMapProps {
  showAllRoutes: boolean;
  congestionMode: boolean;
  activeRouteIds: string[];   // Routes to strictly highlight
  selectedStopId: string | null;
  routingStartId: string | null;
  routingEndId: string | null;
  onStopClick: (stopProps: any) => void;
  forecastData?: any;
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
  initialViewState = {
    longitude: 55.2708,
    latitude: 25.2048,
    zoom: 11
  }
}: DubaiMapProps) {
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
