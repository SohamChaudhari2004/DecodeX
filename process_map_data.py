import csv
import json
import os

def assign_congestion_color(speed_kmh=None, dwell_time_min=None):
    if speed_kmh is not None:
        if speed_kmh < 15: return '#ef4444' # Red
        elif speed_kmh < 20: return '#f97316' # Orange
        elif speed_kmh < 25: return '#eab308' # Yellow
        else: return '#22c55e' # Green
        
    if dwell_time_min is not None:
        if dwell_time_min > 4.0: return '#ef4444' # Red
        elif dwell_time_min > 2.5: return '#f97316' # Orange
        elif dwell_time_min > 1.5: return '#eab308' # Yellow
        else: return '#22c55e' # Green
        
    # Default fallback neon blue
    return '#38bdf8' 

def main():
    base_dir = r"d:\decodeX\03 - Case MOBILITY SHIFT"
    output_dir = r"d:\decodeX\web\public\data"
    os.makedirs(output_dir, exist_ok=True)

    stops_csv = os.path.join(base_dir, "Bus_Stops.csv")
    routes_csv = os.path.join(base_dir, "Bus_Routes.csv")
    mapping_csv = os.path.join(base_dir, "Route_Stop_Mapping.csv")

    # 1. Build stop -> routes mapping, route -> stops mapping, and stop dwell times
    route_mappings = {}
    stop_routes = {}
    stop_dwell = {}
    
    with open(mapping_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            r_id = str(row["Route_ID"])
            s_id = str(row["Stop_ID"])
            seq = int(row["Stop_Sequence"])
            dwell = float(row["Dwell_Time_Min"])
            
            if r_id not in route_mappings:
                route_mappings[r_id] = []
            route_mappings[r_id].append({"stop_id": s_id, "sequence": seq})
            
            if s_id not in stop_routes:
                stop_routes[s_id] = []
            if r_id not in stop_routes[s_id]:
                stop_routes[s_id].append(r_id)
                
            stop_dwell[s_id] = stop_dwell.get(s_id, 0.0) + dwell

    for r_id in route_mappings:
        route_mappings[r_id].sort(key=lambda x: x["sequence"])

    # 2. Parse Stops
    stops = {}
    stops_geojson = {
        "type": "FeatureCollection",
        "features": []
    }
    
    with open(stops_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            stop_id = str(row["Stop_ID"])
            lat = float(row.get("Latitude", 0))
            lon = float(row.get("Longitude", 0))
            
            stops[stop_id] = [lon, lat]
            
            passing = stop_routes.get(stop_id, [])
            total_dwell = stop_dwell.get(stop_id, 0.0)
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": {
                    "Stop_ID": stop_id,
                    "Stop_Name": row.get("Stop_Name", ""),
                    "Stop_Type": row.get("Stop_Type", ""),
                    "Zone": row.get("Zone", ""),
                    "passing_routes": passing,
                    "total_dwell_time": total_dwell,
                    "congestion_color": assign_congestion_color(dwell_time_min=total_dwell)
                }
            }
            stops_geojson["features"].append(feature)

    # 3. Parse Routes
    routes_geojson = {
        "type": "FeatureCollection",
        "features": []
    }
    
    with open(routes_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            r_id = str(row["Route_ID"])
            if r_id in route_mappings:
                coords = []
                for m in route_mappings[r_id]:
                    s_id = m["stop_id"]
                    if s_id in stops:
                        coords.append(stops[s_id])
                        
                if len(coords) > 1:
                    length_km = float(row.get("Route_Length_km", 0))
                    time_min = float(row.get("Avg_Travel_Time_Min", 0))
                    speed = 0.0
                    if time_min > 0:
                        speed = length_km / (time_min / 60.0)
                        
                    feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": coords
                        },
                        "properties": {
                            "Route_ID": r_id,
                            "Route_Code": row.get("Route_Code", ""),
                            "Route_Type": row.get("Route_Type", ""),
                            "Speed_kmh": round(speed, 2),
                            "congestion_color": assign_congestion_color(speed_kmh=speed)
                        }
                    }
                    routes_geojson["features"].append(feature)
                    
    # Write outputs
    with open(os.path.join(output_dir, "stops.geojson"), "w", encoding="utf-8") as f:
        json.dump(stops_geojson, f, separators=(',', ':')) # compact format
    
    with open(os.path.join(output_dir, "routes.geojson"), "w", encoding="utf-8") as f:
        json.dump(routes_geojson, f, separators=(',', ':'))

    print("GeoJSON files updated with Congestion properties.")

if __name__ == "__main__":
    main()
