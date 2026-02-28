import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import json
import os
from datetime import timedelta

def main():
    print("Loading data...")
    base_dir = r"d:\decodeX\03 - Case MOBILITY SHIFT\Train"
    ridership = pd.read_csv(os.path.join(base_dir, "Train_Ridership_2022_to_2025H1.csv"))
    
    print("Preprocessing...")
    ridership['Date'] = pd.to_datetime(ridership['Date'])
    
    # Feature Engineering
    ridership['DayOfWeek'] = ridership['Date'].dt.dayofweek
    ridership['Month'] = ridership['Date'].dt.month
    ridership['Year'] = ridership['Date'].dt.year

    # Aggregate total boardings per station per day to simplify model
    daily_stop = ridership.groupby(['Date', 'Stop_ID', 'DayOfWeek', 'Month', 'Year'])['Boarding_Count'].sum().reset_index()

    features = ['Stop_ID', 'DayOfWeek', 'Month', 'Year']
    X = daily_stop[features]
    y = daily_stop['Boarding_Count']

    print("Training RandomForest model... (this may take a few seconds)")
    model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42)
    model.fit(X, y)

    last_date = daily_stop['Date'].max()
    print(f"Data ends on {last_date.date()}. Generating 7-day forecast...")

    # Stop IDs from the training set
    unique_stops = daily_stop['Stop_ID'].unique()
    
    forecast_data = {
        "start_date": (last_date + timedelta(days=1)).strftime("%Y-%m-%d"),
        "end_date": (last_date + timedelta(days=7)).strftime("%Y-%m-%d"),
        "predictions": {}
    }

    for i in range(1, 8):
        future_date = last_date + timedelta(days=i)
        date_str = future_date.strftime("%Y-%m-%d")
        
        forecast_data["predictions"][date_str] = {}
        
        # Build features for this future day for all stops
        dt_month = future_date.month
        dt_year = future_date.year
        dt_dow = future_date.dayofweek
        
        X_pred = pd.DataFrame({
            'Stop_ID': unique_stops,
            'DayOfWeek': dt_dow,
            'Month': dt_month,
            'Year': dt_year
        })
        
        preds = model.predict(X_pred)
        
        for stop_id, pred_val in zip(unique_stops, preds):
            # Calculate a generic congestion color based on predicted boardings relative to others
            if pred_val > 500: color = '#ef4444' # Red
            elif pred_val > 250: color = '#f97316' # Orange
            elif pred_val > 100: color = '#eab308' # Yellow
            else: color = '#22c55e' # Green

            forecast_data["predictions"][date_str][str(stop_id)] = {
                "predicted_boardings": round(pred_val, 2),
                "congestion_color": color
            }

    # Save to public/data 
    output_dir = r"d:\decodeX\web\public\data"
    os.makedirs(output_dir, exist_ok=True)
    
    out_path = os.path.join(output_dir, "train_forecast.json")
    with open(out_path, "w") as f:
        json.dump(forecast_data, f, indent=2)
        
    print(f"Forecast generated successfully at {out_path}!")

if __name__ == "__main__":
    main()
