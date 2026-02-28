/**
 * pathfinding.ts
 * Dijkstra's shortest-path algorithm on the Dubai bus stop/route graph.
 * The graph is built from routes_map.json stops and routes at load-time.
 */

export interface Stop {
  stop_id: number;
  stop_name: string;
  lat: number;
  lng: number;
  zone: string;
  stop_type: string;
}

export interface Route {
  route_id: number;
  route_code: string;
  route_type: string;
  length_km: number;
  avg_travel_min: number;
  stop_count: number;
  zones_served: string[];
  polyline: [number, number][]; // [lat, lng]
}

export interface RouteMapData {
  stops: Stop[];
  routes: Route[];
}

// ── Graph edge ──────────────────────────────────────────────────────────────
interface Edge {
  to: number;          // stop_id
  weight: number;      // travel time in minutes (geodesic approximation)
  route_code: string;
  route_id: number;
  route_type: string;
}

// ── Graph adjacency list ────────────────────────────────────────────────────
type Graph = Map<number, Edge[]>;

// ── Haversine distance in km ────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Route-type speed assumptions (km/h)
const SPEED: Record<string, number> = {
  Express:   42,
  City:      28,
  Feeder:    22,
  Intercity: 60,
};

// ── Build multigraph from routes_map.json ────────────────────────────────────
export function buildGraph(data: RouteMapData): Graph {
  const stopIndex = new Map<number, Stop>(data.stops.map(s => [s.stop_id, s]));
  const graph: Graph = new Map();

  for (const stop of data.stops) {
    graph.set(stop.stop_id, []);
  }

  for (const route of data.routes) {
    const speed = SPEED[route.route_type] ?? 28;
    const polyline = route.polyline; // [lat, lng] pairs
    const stopCount = polyline.length;

    // Match each polyline point to its nearest stop
    const stopSeq: Stop[] = polyline.map(([lat, lng]) => {
      let best: Stop | null = null;
      let bestDist = Infinity;
      for (const stop of data.stops) {
        const d = haversine(lat, lng, stop.lat, stop.lng);
        if (d < bestDist) { bestDist = d; best = stop; }
      }
      return best!;
    }).filter(Boolean);

    // Deduplicate consecutive same stops
    const deduped: Stop[] = [];
    for (const s of stopSeq) {
      if (!deduped.length || deduped[deduped.length - 1].stop_id !== s.stop_id) {
        deduped.push(s);
      }
    }

    // Add bidirectional edges between consecutive stops in the route
    for (let i = 0; i < deduped.length - 1; i++) {
      const a = deduped[i];
      const b = deduped[i + 1];
      const distKm = haversine(a.lat, a.lng, b.lat, b.lng);
      const travelMin = (distKm / speed) * 60;

      const edgeAB: Edge = { to: b.stop_id, weight: travelMin, route_code: route.route_code, route_id: route.route_id, route_type: route.route_type };
      const edgeBA: Edge = { to: a.stop_id, weight: travelMin, route_code: route.route_code, route_id: route.route_id, route_type: route.route_type };

      graph.get(a.stop_id)!.push(edgeAB);
      graph.get(b.stop_id)!.push(edgeBA);
    }
  }

  return graph;
}

// ── Dijkstra shortest path ────────────────────────────────────────────────────
export interface PathResult {
  found: boolean;
  totalMinutes: number;
  totalKm: number;
  stops: Stop[];
  segments: PathSegment[];
  transfers: number;
}

export interface PathSegment {
  from: Stop;
  to: Stop;
  route_code: string;
  route_id: number;
  route_type: string;
  minutes: number;
  km: number;
  coordinates: [number, number][]; // [lng, lat] for GeoJSON
}

export function dijkstra(
  graph: Graph,
  stopIndex: Map<number, Stop>,
  startId: number,
  endId: number
): PathResult {
  // Priority queue as sorted array (simple but fine for 60 nodes)
  const dist = new Map<number, number>();
  const prev = new Map<number, { from: number; edge: Edge } | null>();
  const visited = new Set<number>();

  for (const id of graph.keys()) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(startId, 0);

  const pq: { id: number; d: number }[] = [{ id: startId, d: 0 }];

  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const { id: u } = pq.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === endId) break;

    for (const edge of (graph.get(u) ?? [])) {
      if (visited.has(edge.to)) continue;
      const newDist = dist.get(u)! + edge.weight;
      if (newDist < dist.get(edge.to)!) {
        dist.set(edge.to, newDist);
        prev.set(edge.to, { from: u, edge });
        pq.push({ id: edge.to, d: newDist });
      }
    }
  }

  if (dist.get(endId) === Infinity) {
    return { found: false, totalMinutes: 0, totalKm: 0, stops: [], segments: [], transfers: 0 };
  }

  // Reconstruct path
  const path: { stopId: number; edge: Edge | null }[] = [];
  let cur = endId;
  while (cur !== startId) {
    const p = prev.get(cur);
    if (!p) break;
    path.unshift({ stopId: cur, edge: p.edge });
    cur = p.from;
  }
  path.unshift({ stopId: startId, edge: null });

  // Build segments (group consecutive stops on the same route)
  const segments: PathSegment[] = [];
  const orderedStops: Stop[] = [stopIndex.get(startId)!];
  let i = 1;

  while (i < path.length) {
    const segStartStop = stopIndex.get(path[i - 1].stopId)!;
    const curEdge = path[i].edge!;
    const segCoords: [number, number][] = [[segStartStop.lng, segStartStop.lat]];
    let segMin = 0;
    let segKm = 0;

    while (i < path.length && path[i].edge?.route_id === curEdge.route_id) {
      const toStop = stopIndex.get(path[i].stopId)!;
      segCoords.push([toStop.lng, toStop.lat]);
      segMin += path[i].edge!.weight;
      segKm  += haversine(stopIndex.get(path[i - 1].stopId)!.lat, stopIndex.get(path[i - 1].stopId)!.lng, toStop.lat, toStop.lng);
      orderedStops.push(toStop);
      i++;
    }

    segments.push({
      from:       segStartStop,
      to:         stopIndex.get(path[i - 1].stopId)!,
      route_code: curEdge.route_code,
      route_id:   curEdge.route_id,
      route_type: curEdge.route_type,
      minutes:    Math.round(segMin * 10) / 10,
      km:         Math.round(segKm * 100) / 100,
      coordinates: segCoords,
    });
  }

  const transfers = Math.max(0, segments.length - 1);
  const totalMinutes = Math.round(dist.get(endId)! * 10) / 10;
  const totalKm = segments.reduce((s, sg) => s + sg.km, 0);

  return { found: true, totalMinutes, totalKm: Math.round(totalKm * 100) / 100, stops: orderedStops, segments, transfers };
}

// ── Build GeoJSON FeatureCollection for the path ─────────────────────────────
export function pathToGeoJSON(result: PathResult): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = result.segments.map((seg, i) => ({
    type: 'Feature',
    properties: {
      route_code: seg.route_code,
      route_type: seg.route_type,
      minutes:    seg.minutes,
      km:         seg.km,
      seg_index:  i,
    },
    geometry: {
      type: 'LineString',
      coordinates: seg.coordinates,
    },
  }));

  // Also add stop points (filter undefined in case of graph gaps)
  for (const stop of result.stops.filter(Boolean)) {
    features.push({
      type: 'Feature',
      properties: { stop_id: stop.stop_id, stop_name: stop.stop_name, stop_type: stop.stop_type },
      geometry: { type: 'Point', coordinates: [stop.lng, stop.lat] },
    });
  }

  return { type: 'FeatureCollection', features };
}
