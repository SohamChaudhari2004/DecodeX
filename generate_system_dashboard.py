import pandas as pd
import numpy as np
import json
import os

def main():
    print("Loading all datasets for Strategy-Aligned Dashboard...")
    base_dir = r"d:\decodeX\03 - Case MOBILITY SHIFT"
    
    routes = pd.read_csv(os.path.join(base_dir, "Bus_Routes.csv"))
    stops = pd.read_csv(os.path.join(base_dir, "Bus_Stops.csv"))
    mapping = pd.read_csv(os.path.join(base_dir, "Route_Stop_Mapping.csv"))
    ridership = pd.read_csv(os.path.join(base_dir, "Train", "Train_Ridership_2022_to_2025H1.csv"))
    traffic = pd.read_csv(os.path.join(base_dir, "Train", "Train_Traffic_2022_to_2025H1.csv"))
    
    # --- 1. Master Relational Merge ---
    ridership['Date'] = pd.to_datetime(ridership['Date'])
    traffic['Date'] = pd.to_datetime(traffic['Date'])
    
    df = ridership.merge(traffic, on='Date', how='left')
    df = df.merge(mapping, on=['Route_ID', 'Stop_ID'], how='left')
    df = df.merge(routes, on='Route_ID', how='left')
    df = df.merge(stops, on='Stop_ID', how='left')
    
    df['Total_Pax'] = df['Boarding_Count'] + df['Alighting_Count']
    df['Month'] = df['Date'].dt.month
    df['Year'] = df['Date'].dt.year
    df['Is_Weekend'] = df['Date'].dt.dayofweek.isin([5, 6])
    df['Season'] = pd.cut(df['Month'], bins=[0, 3, 5, 8, 10, 12], labels=['Winter', 'Spring', 'Summer', 'Autumn', 'Winter2'], ordered=False)
    df['Season'] = df['Season'].replace('Winter2', 'Winter')
    
    # --- A. Growth by Route Type & Zone ---
    # Yearly pax by zone
    yearly_zone_pax = df.groupby(['Zone', 'Year'])['Total_Pax'].sum().unstack()
    cagr_by_zone = {}
    for zone in yearly_zone_pax.index:
        try:
            val_22 = yearly_zone_pax.loc[zone, 2022]
            val_24 = yearly_zone_pax.loc[zone, 2024] # Full year compared to full year
            cagr = ((val_24 / val_22) ** (1/2) - 1) * 100
            cagr_by_zone[zone] = cagr
        except:
            cagr_by_zone[zone] = 0

    top_growth_zone = max(cagr_by_zone.items(), key=lambda k: k[1])
    bottom_growth_zone = min(cagr_by_zone.items(), key=lambda k: k[1])

    # --- B. Seasonality & Day-Type Divergence ---
    zone_season_avg = df.groupby(['Zone', 'Season'])['Total_Pax'].mean().unstack()
    zone_annual_avg = df.groupby('Zone')['Total_Pax'].mean()
    
    seasonality_metrics = []
    for zone in zone_annual_avg.index:
        winter_avg = zone_season_avg.loc[zone, 'Winter'] if 'Winter' in zone_season_avg.columns else 0
        summer_avg = zone_season_avg.loc[zone, 'Summer'] if 'Summer' in zone_season_avg.columns else 0
        annual = zone_annual_avg.loc[zone]
        
        wd_avg = df[(df['Zone'] == zone) & (~df['Is_Weekend'])]['Total_Pax'].mean()
        we_avg = df[(df['Zone'] == zone) & (df['Is_Weekend'])]['Total_Pax'].mean()
        
        seasonality_metrics.append({
            "zone": str(zone),
            "winter_uplift": round(winter_avg / annual, 2) if annual > 0 else 1,
            "summer_depression": round(summer_avg / annual, 2) if annual > 0 else 1,
            "weekend_divergence": round(wd_avg / we_avg, 2) if we_avg > 0 else 1
        })
    
    # Sort for top tables
    seasonality_metrics = sorted(seasonality_metrics, key=lambda x: x['winter_uplift'], reverse=True)[:4]

    # --- C. Structural Imbalances (B/A Ratio) ---
    stop_ba = df.groupby(['Stop_ID', 'Stop_Name', 'Zone'])[['Boarding_Count', 'Alighting_Count']].sum()
    stop_ba['B_A_Ratio'] = stop_ba['Boarding_Count'] / (stop_ba['Alighting_Count'] + 1) # smooth zero
    
    # Extract top origin hubs (Boarding heavy) and destination hubs (Alighting heavy)
    stop_ba = stop_ba.reset_index()
    origins = stop_ba.sort_values('B_A_Ratio', ascending=False).head(3)
    destinations = stop_ba.sort_values('B_A_Ratio', ascending=True).head(3)
    
    imbalance_origins = [{"name": r['Stop_Name'], "zone": r['Zone'], "ratio": round(r['B_A_Ratio'], 2)} for _, r in origins.iterrows()]
    imbalance_dests = [{"name": r['Stop_Name'], "zone": r['Zone'], "ratio": round(r['B_A_Ratio'], 2)} for _, r in destinations.iterrows()]

    # --- D. Congestion Elasticity (Congestion-Demand Correlation ρ) ---
    # Correlation between Total_Pax and Congestion_Level per Zone
    elasticity = []
    for zone, group in df.groupby('Zone'):
        # group by Date to get daily total pax for the zone
        daily_zone = group.groupby('Date')[['Total_Pax', 'Congestion_Level']].agg({'Total_Pax':'sum', 'Congestion_Level':'mean'})
        corr = daily_zone['Total_Pax'].corr(daily_zone['Congestion_Level'])
        if pd.notna(corr):
            # Categorize
            if corr < -0.3: cat = "Highly Elastic (Demand Drops)"
            elif corr < -0.1: cat = "Moderately Elastic"
            elif corr > 0.1: cat = "Inelastic (Captive Riders)"
            else: cat = "Stationary"
            
            elasticity.append({
                "zone": str(zone),
                "correlation": round(corr, 3),
                "category": cat
            })
            
    elasticity = sorted(elasticity, key=lambda x: x['correlation'])[:5] # Show top 5 most elastic/inelastic

    # --- E. Output Compilation ---
    output = {
        "growth": {
            "top_zone": {"name": top_growth_zone[0], "cagr": f"{top_growth_zone[1]:.1f}%"},
            "bottom_zone": {"name": bottom_growth_zone[0], "cagr": f"{bottom_growth_zone[1]:.1f}%"}
        },
        "seasonality": seasonality_metrics,
        "imbalance": {
            "origins": imbalance_origins,
            "destinations": imbalance_dests
        },
        "elasticity": elasticity
    }

    out_dir = r"d:\decodeX\web\public\data"
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "system_diagnostics.json"), "w") as f:
        json.dump(output, f, indent=2)

    print("System Diagnostics formulated and published.")

if __name__ == "__main__":
    main()
