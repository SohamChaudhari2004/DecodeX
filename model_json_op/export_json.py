"""
MOBILITY SHIFT — JSON Data Exporter
Runs all ML models and exports structured JSON files for web plotting
"""

import pandas as pd
import numpy as np
import json
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, accuracy_score
from sklearn.linear_model import LinearRegression

def safe_float(v):
    if isinstance(v, (np.floating, np.integer)): return float(v)
    if isinstance(v, float) and np.isnan(v): return None
    return v

def to_serializable(obj):
    if isinstance(obj, dict):   return {k: to_serializable(v) for k,v in obj.items()}
    if isinstance(obj, list):   return [to_serializable(i) for i in obj]
    if isinstance(obj, (np.integer,)): return int(obj)
    if isinstance(obj, (np.floating,)): return round(float(obj), 4) if not np.isnan(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, pd.Timestamp): return str(obj.date())
    return obj

# ─── LOAD DATA ────────────────────────────────────────────────────
print("Loading & training models...")
DATA_DIR   = r'd:\decodeX\03 - Case MOBILITY SHIFT'
TRAIN_DIR  = fr'{DATA_DIR}\Train'
OUT_DIR    = r'd:\decodeX\model_json_op'

routes    = pd.read_csv(fr'{DATA_DIR}\Bus_Routes.csv')
ridership = pd.read_csv(fr'{TRAIN_DIR}\Train_Ridership_2022_to_2025H1.csv', parse_dates=['Date'])
traffic   = pd.read_csv(fr'{TRAIN_DIR}\Train_Traffic_2022_to_2025H1.csv', parse_dates=['Date'])
stops     = pd.read_csv(fr'{DATA_DIR}\Bus_Stops.csv')
mapping   = pd.read_csv(fr'{DATA_DIR}\Route_Stop_Mapping.csv')

ridership = ridership.merge(routes[['Route_ID','Route_Code','Route_Type','Route_Length_km','Avg_Travel_Time_Min']], on='Route_ID')
ridership = ridership.merge(stops[['Stop_ID','Zone','Stop_Type']], on='Stop_ID')
ridership = ridership.merge(traffic, on='Date')

def add_feats(df):
    df['Year']       = df['Date'].dt.year
    df['Month']      = df['Date'].dt.month
    df['DayOfWeek']  = df['Date'].dt.dayofweek
    df['IsWeekend']  = (df['Date'].dt.dayofweek >= 5).astype(int)
    df['Quarter']    = df['Date'].dt.quarter
    df['WeekOfYear'] = df['Date'].dt.isocalendar().week.astype(int)
    return df

ridership = add_feats(ridership)
traffic   = add_feats(traffic)
ridership['TotalPax'] = ridership['Boarding_Count'] + ridership['Alighting_Count']

daily = ridership.groupby(['Date','Route_ID','Route_Code','Route_Type',
                            'Route_Length_km','Avg_Travel_Time_Min',
                            'Congestion_Level','Avg_Speed_kmph']).agg(
    DailyPax=('TotalPax','sum'), Boardings=('Boarding_Count','sum'), Alightings=('Alighting_Count','sum')
).reset_index()
daily = add_feats(daily)

le = LabelEncoder()
daily['RouteType_enc'] = le.fit_transform(daily['Route_Type'])

# ─── TRAIN M1: RF RIDERSHIP ────────────────────────────────────────
FEAT1 = ['Route_ID','RouteType_enc','Route_Length_km','Avg_Travel_Time_Min',
         'Year','Month','DayOfWeek','IsWeekend','Quarter','WeekOfYear',
         'Congestion_Level','Avg_Speed_kmph']
df1 = daily[FEAT1+['DailyPax']].dropna()
X1,y1 = df1[FEAT1],df1['DailyPax']
X1tr,X1te,y1tr,y1te = train_test_split(X1,y1,test_size=0.2,random_state=42)
rf = RandomForestRegressor(n_estimators=200,max_depth=12,min_samples_leaf=5,n_jobs=-1,random_state=42)
rf.fit(X1tr,y1tr)
m1_r2  = r2_score(y1te, rf.predict(X1te))
m1_mae = mean_absolute_error(y1te, rf.predict(X1te))
print(f"  M1 RF R²={m1_r2:.4f} MAE={m1_mae:.0f}")

month_cong  = traffic.groupby('Month')['Congestion_Level'].mean().to_dict()
month_speed = traffic.groupby('Month')['Avg_Speed_kmph'].mean().to_dict()
SPEED_MAP   = {1:40.0,2:35.0,3:29.9,4:24.2,5:20.9}

def rf_forecast(route_id, start, end, cong_override=None):
    ri = routes[routes['Route_ID']==route_id].iloc[0]
    rt_enc = le.transform([ri['Route_Type']])[0]
    rows = []
    for d in pd.date_range(start, end):
        m = d.month
        c = cong_override or month_cong.get(m, 2.6)
        s = month_speed.get(m, 33.0)
        rows.append({k: v for k,v in zip(FEAT1,
            [route_id, rt_enc, ri['Route_Length_km'], ri['Avg_Travel_Time_Min'],
             d.year, m, d.dayofweek, int(d.dayofweek>=5), (m-1)//3+1,
             d.isocalendar()[1], c, s])})
    preds = rf.predict(pd.DataFrame(rows)[FEAT1])
    return pd.DataFrame({'date':pd.date_range(start,end),'pax':preds.round().astype(int),
                         'route_code':ri['Route_Code'],'route_type':ri['Route_Type']})

# ─── TRAIN M2: GB CONGESTION ───────────────────────────────────────
t2 = traffic.sort_values('Date').copy()
t2['Cong_Lag1']     = t2['Congestion_Level'].shift(1)
t2['Cong_Lag7']     = t2['Congestion_Level'].shift(7)
t2['Speed_Lag1']    = t2['Avg_Speed_kmph'].shift(1)
t2['Cong_RolMean7'] = t2['Congestion_Level'].rolling(7).mean()
t2 = t2.dropna()
t2['Cong_Bin'] = t2['Congestion_Level'].round(0).astype(int).clip(1,5)
FEAT2 = ['Year','Month','DayOfWeek','IsWeekend','Quarter','Cong_Lag1','Cong_Lag7','Speed_Lag1','Cong_RolMean7']
X2,y2 = t2[FEAT2],t2['Cong_Bin']
X2tr,X2te,y2tr,y2te = train_test_split(X2,y2,test_size=0.2,random_state=42)
gbc = GradientBoostingClassifier(n_estimators=150,max_depth=5,learning_rate=0.1,random_state=42)
gbc.fit(X2tr,y2tr)
m2_acc = accuracy_score(y2te, gbc.predict(X2te))
print(f"  M2 GBC Accuracy={m2_acc*100:.1f}%")

last_cong  = t2['Congestion_Level'].tail(30).mean()
last_speed = t2['Avg_Speed_kmph'].tail(7).mean()

def pred_cong(date_str):
    d = pd.Timestamp(date_str)
    row = pd.DataFrame([{'Year':d.year,'Month':d.month,'DayOfWeek':d.dayofweek,
                          'IsWeekend':int(d.dayofweek>=5),'Quarter':(d.month-1)//3+1,
                          'Cong_Lag1':last_cong,'Cong_Lag7':last_cong,
                          'Speed_Lag1':last_speed,'Cong_RolMean7':last_cong}])
    cl    = int(gbc.predict(row)[0])
    proba = gbc.predict_proba(row)[0]
    return cl, float(proba.max())

# ─── TRAIN M3: GB ROUTE SCORER ────────────────────────────────────
route_stop_zone = mapping.merge(stops[['Stop_ID','Zone']], on='Stop_ID') \
                         .merge(routes[['Route_ID','Route_Code','Route_Type','Route_Length_km','Avg_Travel_Time_Min']], on='Route_ID')
route_zones = route_stop_zone.groupby(['Route_ID','Route_Code','Route_Type','Route_Length_km','Avg_Travel_Time_Min'])['Zone'].apply(list).reset_index()
route_zones.columns = ['Route_ID','Route_Code','Route_Type','Route_Length_km','Avg_Travel_Time_Min','Zones_Served']

dp = daily.copy()
dp['Pax_per_km']  = dp['DailyPax'] / dp['Route_Length_km']
dp['Speed_Score'] = dp['Avg_Speed_kmph'] / 40.0
dp['Cong_Pen']    = 1 - (dp['Congestion_Level']-1)/4
dp['Time_Score']  = 1 - dp['Avg_Travel_Time_Min'] / dp['Avg_Travel_Time_Min'].max()
dp['Route_Score'] = (0.4*(dp['Pax_per_km']/dp['Pax_per_km'].max()) + 0.3*dp['Speed_Score'] + 0.2*dp['Cong_Pen'] + 0.1*dp['Time_Score'])
FEAT3 = ['Route_ID','RouteType_enc','Route_Length_km','Avg_Travel_Time_Min','Month','DayOfWeek','IsWeekend','Congestion_Level','Avg_Speed_kmph']
df3 = dp[FEAT3+['Route_Score']].dropna()
X3,y3 = df3[FEAT3],df3['Route_Score']
X3tr,X3te,y3tr,y3te = train_test_split(X3,y3,test_size=0.2,random_state=42)
gbr = GradientBoostingRegressor(n_estimators=150,max_depth=5,learning_rate=0.1,random_state=42)
gbr.fit(X3tr, y3tr)
m3_r2 = r2_score(y3te, gbr.predict(X3te))
print(f"  M3 GBR R²={m3_r2:.4f}")

def recommend(origin, dest, date_str, cong_override=None, priority='balanced'):
    d   = pd.Timestamp(date_str)
    pc, conf = pred_cong(date_str)
    cong = cong_override or pc
    spd  = SPEED_MAP.get(cong, 30.0)
    valid = []
    for _, rz in route_zones.iterrows():
        zs = rz['Zones_Served']
        if (origin in zs or not origin) and (dest in zs or not dest):
            valid.append(rz.to_dict())
    if not valid:
        valid = route_zones.to_dict('records')
    scored = []
    for rz in valid:
        rt_enc = le.transform([rz['Route_Type']])[0]
        row3 = pd.DataFrame([{'Route_ID':rz['Route_ID'],'RouteType_enc':rt_enc,
            'Route_Length_km':rz['Route_Length_km'],'Avg_Travel_Time_Min':rz['Avg_Travel_Time_Min'],
            'Month':d.month,'DayOfWeek':d.dayofweek,'IsWeekend':int(d.dayofweek>=5),
            'Congestion_Level':cong,'Avg_Speed_kmph':spd}])
        base = float(gbr.predict(row3)[0])
        travel_min = rz['Route_Length_km'] / spd * 60
        if priority=='speed':    adj = base + 0.3*(1-travel_min/120)
        elif priority=='comfort': adj = base + 0.3*(1-cong/5)
        elif priority=='capacity':
            hp = daily[daily['Route_ID']==rz['Route_ID']]['DailyPax'].mean()
            adj = base + 0.3*(hp/daily['DailyPax'].max())
        else: adj = base
        fc_row = pd.DataFrame([{'Route_ID':rz['Route_ID'],'RouteType_enc':rt_enc,
            'Route_Length_km':rz['Route_Length_km'],'Avg_Travel_Time_Min':rz['Avg_Travel_Time_Min'],
            'Year':d.year,'Month':d.month,'DayOfWeek':d.dayofweek,'IsWeekend':int(d.dayofweek>=5),
            'Quarter':(d.month-1)//3+1,'WeekOfYear':d.isocalendar()[1],
            'Congestion_Level':cong,'Avg_Speed_kmph':spd}])[FEAT1]
        fc_pax = int(rf.predict(fc_row)[0])
        scored.append({'route_code':rz['Route_Code'],'route_type':rz['Route_Type'],
                       'length_km':round(float(rz['Route_Length_km']),1),
                       'est_travel_min':round(travel_min,0),
                       'predicted_score':round(min(adj,1.0),4),
                       'forecasted_daily_pax':fc_pax,
                       'congestion_level':cong,'congestion_speed_kmph':spd,
                       'zones_served':list(set(rz['Zones_Served']))})
    scored.sort(key=lambda x: -x['predicted_score'])
    for i,s in enumerate(scored): s['rank'] = i+1
    return scored

# M4: Zone trend
zone_monthly = ridership.groupby(['Year','Month','Zone'])['TotalPax'].sum().reset_index()
ZONES = sorted(ridership['Zone'].unique())
zone_models = {}
for z in ZONES:
    zd = zone_monthly[zone_monthly['Zone']==z].copy()
    zd['t'] = (zd['Year']-2022)*12 + zd['Month']
    zone_models[z] = LinearRegression().fit(zd[['t','Month']], zd['TotalPax'])

print("  All models trained.\n")

# ══════════════════════════════════════════════════════════════════
# JSON 1: model_metrics.json
# ══════════════════════════════════════════════════════════════════
model_metrics = {
    "generated_at": "2025-07-01",
    "training_data": {
        "date_range": {"start": "2022-01-01", "end": "2025-06-30"},
        "total_daily_records": int(len(daily)),
        "routes": int(len(routes)),
        "stops": int(len(stops)),
        "zones": int(len(ZONES))
    },
    "models": {
        "M1_ridership_forecast": {
            "algorithm": "Random Forest Regressor",
            "r2_score": round(m1_r2, 4),
            "mae_passengers": round(m1_mae, 0),
            "features": FEAT1,
            "description": "Predicts daily passengers per route given date, route, and congestion"
        },
        "M2_congestion_predictor": {
            "algorithm": "Gradient Boosting Classifier",
            "accuracy": round(m2_acc, 4),
            "classes": [1,2,3,4,5],
            "features": FEAT2,
            "description": "Predicts congestion level (1-5) for any future date"
        },
        "M3_route_recommender": {
            "algorithm": "Gradient Boosting Regressor",
            "r2_score": round(m3_r2, 4),
            "scoring_weights": {"pax_efficiency":0.4,"speed":0.3,"congestion_penalty":0.2,"time":0.1},
            "priority_modes": ["balanced","speed","comfort","capacity"],
            "description": "Scores and ranks routes given origin zone, destination zone, date, and priority"
        },
        "M4_zone_trend": {
            "algorithm": "Linear Regression per Zone",
            "zones_modeled": ZONES,
            "description": "Linear demand trend model per zone for multi-month forecasting"
        }
    }
}
with open(fr'{OUT_DIR}\model_metrics.json','w') as f:
    json.dump(to_serializable(model_metrics), f, indent=2)
print("✅ model_metrics.json")

# ══════════════════════════════════════════════════════════════════
# JSON 2: h2_2025_forecast.json — route × month forecast
# ══════════════════════════════════════════════════════════════════
print("Building forecast JSON...")
forecast_data = {"meta":{"period":"H2 2025","months":["Jul","Aug","Sep","Oct","Nov","Dec"]},"system":[],"by_route":{},"by_route_type":{}}

all_fc_rows = []
for rid in routes['Route_ID']:
    fc = rf_forecast(rid,'2025-07-01','2025-12-31')
    all_fc_rows.append(fc)
fc_all = pd.concat(all_fc_rows)

# System monthly
sys_m = fc_all.groupby(fc_all['date'].dt.month)['pax'].sum().reset_index()
sys_m.columns = ['month','total_pax']
month_names = {7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'}
for _,r in sys_m.iterrows():
    cl, conf = pred_cong(f"2025-{int(r['month']):02d}-15")
    forecast_data['system'].append({
        'month': int(r['month']),
        'month_name': month_names[int(r['month'])],
        'total_pax': int(r['total_pax']),
        'predicted_congestion': cl,
        'congestion_confidence': round(conf,3),
        'avg_speed_kmph': SPEED_MAP.get(cl,30.0)
    })

# By route
for rc in fc_all['route_code'].unique():
    sub = fc_all[fc_all['route_code']==rc]
    rt  = sub['route_type'].iloc[0]
    monthly_data = []
    for m, grp in sub.groupby(sub['date'].dt.month):
        monthly_data.append({
            'month': int(m), 'month_name': month_names[int(m)],
            'total_pax': int(grp['pax'].sum()),
            'avg_daily_pax': round(float(grp['pax'].mean()),1),
            'peak_day_pax': int(grp['pax'].max()),
            'weekday_avg': round(float(grp[grp['date'].dt.dayofweek<5]['pax'].mean()),1),
            'weekend_avg': round(float(grp[grp['date'].dt.dayofweek>=5]['pax'].mean()),1)
        })
    ri = routes[routes['Route_Code']==rc].iloc[0]
    forecast_data['by_route'][rc] = {
        'route_type': rt,
        'route_length_km': round(float(ri['Route_Length_km']),2),
        'avg_travel_time_min': float(ri['Avg_Travel_Time_Min']),
        'total_h2_pax': int(sub['pax'].sum()),
        'monthly': monthly_data
    }

# By route type
for rt in fc_all['route_type'].unique():
    sub = fc_all[fc_all['route_type']==rt]
    forecast_data['by_route_type'][rt] = {
        'total_h2_pax': int(sub['pax'].sum()),
        'monthly': [{
            'month': int(m), 'month_name': month_names[int(m)],
            'total_pax': int(grp['pax'].sum())
        } for m,grp in sub.groupby(sub['date'].dt.month)]
    }

with open(fr'{OUT_DIR}\h2_2025_forecast.json','w') as f:
    json.dump(to_serializable(forecast_data), f, indent=2)
print("✅ h2_2025_forecast.json")

# ══════════════════════════════════════════════════════════════════
# JSON 3: congestion_forecast.json — daily + monthly predictions
# ══════════════════════════════════════════════════════════════════
print("Building congestion JSON...")
cong_label = {1:'Free Flow',2:'Light',3:'Moderate',4:'Heavy',5:'Severe'}
cong_json = {"daily":[], "monthly_summary":[], "historical_distribution":[], "speed_impact":[]}

for d in pd.date_range('2025-07-01','2025-12-31'):
    cl, conf = pred_cong(str(d.date()))
    cong_json['daily'].append({
        'date': str(d.date()), 'month': int(d.month), 'day_of_week': int(d.dayofweek),
        'is_weekend': bool(d.dayofweek>=5),
        'predicted_level': cl, 'label': cong_label[cl],
        'predicted_speed_kmph': SPEED_MAP[cl], 'confidence': round(conf,3)
    })

# Monthly summary
for m in range(7,13):
    days = [r for r in cong_json['daily'] if r['month']==m]
    levels = [r['predicted_level'] for r in days]
    cong_json['monthly_summary'].append({
        'month': m, 'month_name': month_names[m],
        'avg_congestion': round(np.mean(levels),2),
        'avg_speed_kmph': round(np.mean([SPEED_MAP[l] for l in levels]),1),
        'days_by_level': {str(i): levels.count(i) for i in range(1,6)},
        'pct_heavy_severe': round(sum(1 for l in levels if l>=4)/len(levels)*100,1)
    })

# Historical distribution
hist_dist = traffic['Congestion_Level'].round().astype(int).value_counts().sort_index()
for cl, cnt in hist_dist.items():
    cong_json['historical_distribution'].append({
        'level': int(cl), 'label': cong_label.get(int(cl),'?'),
        'days': int(cnt), 'pct': round(cnt/len(traffic)*100,1)
    })

# Speed impact per route
for _,rt in routes.iterrows():
    for cl in range(1,6):
        spd = SPEED_MAP[cl]
        eff_time = rt['Route_Length_km']/spd*60
        delay    = eff_time - rt['Avg_Travel_Time_Min']
        cong_json['speed_impact'].append({
            'route_code': rt['Route_Code'], 'route_type': rt['Route_Type'],
            'congestion_level': int(cl), 'label': cong_label[cl],
            'effective_speed_kmph': spd,
            'effective_travel_min': round(eff_time,1),
            'base_travel_min': float(rt['Avg_Travel_Time_Min']),
            'delay_min': round(max(delay,0),1),
            'capacity_retained_pct': round(spd/40.0*100,1)
        })

with open(fr'{OUT_DIR}\congestion_forecast.json','w') as f:
    json.dump(to_serializable(cong_json), f, indent=2)
print("✅ congestion_forecast.json")

# ══════════════════════════════════════════════════════════════════
# JSON 4: route_recommendations.json — pre-computed scenario matrix
# ══════════════════════════════════════════════════════════════════
print("Building route recommendations JSON...")

scenarios = [
    # (origin, dest, date, cong_override, priority)
    ('Res_AlQusais',         'CBD_Downtown',          '2025-11-15', None, 'speed'),
    ('Res_AlQusais',         'CBD_Downtown',          '2025-11-15', None, 'comfort'),
    ('Res_AlQusais',         'CBD_Downtown',          '2025-11-15', None, 'balanced'),
    ('Coastal_Marina',       'Ind_JebelAli',          '2025-12-20', 4,    'comfort'),
    ('Coastal_Marina',       'Ind_JebelAli',          '2025-12-20', 4,    'speed'),
    ('Res_InternationalCity','CBD_BusinessBay',        '2025-07-04', None, 'balanced'),
    ('Core_Deira',           'Coastal_Marina',        '2025-10-01', None, 'capacity'),
    ('Core_Deira',           'Coastal_Marina',        '2025-10-01', None, 'speed'),
    ('CBD_Downtown',         'Ind_JebelAli',          '2025-08-12', 2,    'speed'),
    ('CBD_Downtown',         'Ind_JebelAli',          '2025-08-12', 2,    'balanced'),
    ('Res_AlQusais',         'Res_InternationalCity', '2025-09-05', None, 'balanced'),
    ('CBD_BusinessBay',      'Core_Deira',            '2025-11-28', None, 'speed'),
    ('Ind_JebelAli',         'CBD_Downtown',          '2025-12-01', 3,    'comfort'),
    ('Coastal_Marina',       'CBD_Downtown',          '2025-07-20', None, 'balanced'),
    ('Res_InternationalCity','Core_Deira',             '2025-10-15', None, 'capacity'),
]

rec_json = {"scenarios":[], "all_routes_ranked":{}}

for orig, dest, dt, cong, prio in scenarios:
    cl_pred, conf = pred_cong(dt)
    actual_cong = cong or cl_pred
    recs = recommend(orig, dest, dt, cong, prio)
    rec_json['scenarios'].append({
        'origin_zone': orig, 'destination_zone': dest, 'date': dt,
        'priority': prio, 'congestion_level': actual_cong,
        'congestion_label': cong_label[actual_cong],
        'congestion_confidence': round(conf,3),
        'routes': recs
    })

# All routes ranked for each priority on a peak day
for prio in ['balanced','speed','comfort','capacity']:
    recs = recommend('', '', '2025-11-20', priority=prio)
    rec_json['all_routes_ranked'][prio] = recs

with open(fr'{OUT_DIR}\route_recommendations.json','w') as f:
    json.dump(to_serializable(rec_json), f, indent=2)
print("✅ route_recommendations.json")

# ══════════════════════════════════════════════════════════════════
# JSON 5: zone_intelligence.json
# ══════════════════════════════════════════════════════════════════
print("Building zone JSON...")
zone_json = {"zones":[], "zone_pairs":[], "h2_2025_forecast":[], "historical_monthly":[]}

# Zone stats
zone_stats = ridership.groupby('Zone').agg(
    total_pax=('TotalPax','sum'), avg_daily_pax=('TotalPax','mean'),
    total_boardings=('Boarding_Count','sum'), total_alightings=('Alighting_Count','sum')
).reset_index()

for _,zs in zone_stats.iterrows():
    # CAGR
    z = zs['Zone']
    zyr = ridership[ridership['Zone']==z].groupby('Year')['TotalPax'].sum()
    cagr = None
    if 2022 in zyr.index and 2024 in zyr.index:
        cagr = round((float(zyr[2024])/float(zyr[2022]))**0.5 - 1, 4)
    # Stop count
    zone_stops = stops[stops['Zone']==z]
    # Routes serving this zone
    rz_serving = route_stop_zone[route_stop_zone['Zone']==z]['Route_Code'].unique().tolist()
    zone_json['zones'].append({
        'zone': z, 'total_pax': int(zs['total_pax']),
        'avg_daily_pax': round(float(zs['avg_daily_pax']),1),
        'total_boardings': int(zs['total_boardings']),
        'total_alightings': int(zs['total_alightings']),
        'net_flow': int(zs['total_boardings'] - zs['total_alightings']),
        'cagr_2022_2024': cagr,
        'stop_count': int(len(zone_stops)),
        'stop_types': zone_stops['Stop_Type'].value_counts().to_dict(),
        'routes_serving': rz_serving,
        'centroid': {'lat': round(float(zone_stops['Latitude'].mean()),6),
                     'lng': round(float(zone_stops['Longitude'].mean()),6)}
    })

# Zone-to-zone pair coverage
for oz in ZONES:
    for dz in ZONES:
        if oz==dz: continue
        connecting = []
        for _,rz in route_zones.iterrows():
            if oz in rz['Zones_Served'] and dz in rz['Zones_Served']:
                connecting.append(rz['Route_Code'])
        zone_json['zone_pairs'].append({
            'origin': oz, 'destination': dz,
            'route_count': len(connecting),
            'routes': connecting
        })

# H2 2025 forecast
for m in range(7,13):
    t_val = (2025-2022)*12 + m
    for z in ZONES:
        pred = float(zone_models[z].predict([[t_val, m]])[0])
        zone_json['h2_2025_forecast'].append({
            'zone': z, 'month': m, 'month_name': month_names[m],
            'forecast_pax': max(0, round(pred))
        })

# Historical monthly
for _,row in zone_monthly.iterrows():
    zone_json['historical_monthly'].append({
        'zone': row['Zone'], 'year': int(row['Year']),
        'month': int(row['Month']), 'total_pax': int(row['TotalPax'])
    })

with open(fr'{OUT_DIR}\zone_intelligence.json','w') as f:
    json.dump(to_serializable(zone_json), f, indent=2)
print("✅ zone_intelligence.json")

# ══════════════════════════════════════════════════════════════════
# JSON 6: routes_map.json — geodata for map visualization
# ══════════════════════════════════════════════════════════════════
print("Building map JSON...")
map_json = {"stops":[], "routes":[], "route_stop_sequences":[]}

for _,s in stops.iterrows():
    map_json['stops'].append({
        'stop_id': int(s['Stop_ID']), 'stop_name': s['Stop_Name'],
        'lat': round(float(s['Latitude']),6), 'lng': round(float(s['Longitude']),6),
        'zone': s['Zone'], 'stop_type': s['Stop_Type']
    })

for _,r in routes.iterrows():
    ri2 = routes[routes['Route_ID']==r['Route_ID']].iloc[0]
    # Get ordered stop coordinates
    seq = mapping[mapping['Route_ID']==r['Route_ID']].sort_values('Stop_Sequence')
    seq = seq.merge(stops[['Stop_ID','Latitude','Longitude','Zone']], on='Stop_ID')
    map_json['routes'].append({
        'route_id': int(r['Route_ID']), 'route_code': r['Route_Code'],
        'route_type': r['Route_Type'],
        'length_km': float(r['Route_Length_km']),
        'avg_travel_min': float(r['Avg_Travel_Time_Min']),
        'stop_count': int(len(seq)),
        'zones_served': list(seq['Zone'].unique()),
        'polyline': [[round(float(row['Latitude']),6), round(float(row['Longitude']),6)]
                     for _,row in seq.iterrows()]
    })

for _,row in route_stop_zone.sort_values(['Route_ID','Stop_Sequence']).iterrows():
    map_json['route_stop_sequences'].append({
        'route_id': int(row['Route_ID']), 'route_code': row['Route_Code'],
        'stop_id': int(row['Stop_ID']), 'sequence': int(row['Stop_Sequence']),
        'zone': row['Zone'], 'dwell_time_min': float(row['Dwell_Time_Min'])
    })

with open(fr'{OUT_DIR}\routes_map.json','w') as f:
    json.dump(to_serializable(map_json), f, indent=2)
print("✅ routes_map.json")

# ══════════════════════════════════════════════════════════════════
# JSON 7: historical_trends.json — for time-series charts
# ══════════════════════════════════════════════════════════════════
print("Building historical trends JSON...")
trends_json = {"system_monthly":[], "route_monthly":[], "annual_summary":[], "congestion_monthly":[]}

# System monthly
sys_m2 = ridership.groupby(['Year','Month'])['TotalPax'].sum().reset_index()
sys_m2_dict = {(int(r['Year']),int(r['Month'])):int(r['TotalPax']) for _,r in sys_m2.iterrows()}
for _,r in sys_m2.iterrows():
    yr,mo,pax = int(r['Year']),int(r['Month']),int(r['TotalPax'])
    yoy = None
    prev_pax = sys_m2_dict.get((yr-1,mo))
    if prev_pax: yoy = round((pax-prev_pax)/prev_pax*100,2)
    trends_json['system_monthly'].append({
        'year': yr, 'month': mo, 'date': f'{yr}-{mo:02d}-01',
        'total_pax': pax, 'yoy_growth_pct': yoy
    })

# Route monthly
rm = ridership.groupby(['Year','Month','Route_Code','Route_Type'])['TotalPax'].sum().reset_index()
for _,r in rm.iterrows():
    trends_json['route_monthly'].append({
        'year': int(r['Year']), 'month': int(r['Month']),
        'date': f"{int(r['Year'])}-{int(r['Month']):02d}-01",
        'route_code': r['Route_Code'], 'route_type': r['Route_Type'],
        'total_pax': int(r['TotalPax'])
    })

# Annual summary
ann = ridership.groupby('Year')['TotalPax'].sum().reset_index()
for i,(_,r) in enumerate(ann.iterrows()):
    yoy = None
    if i>0:
        prev_pax = ann.iloc[i-1]['TotalPax']
        yoy = round((r['TotalPax']-prev_pax)/prev_pax*100,2)
    trends_json['annual_summary'].append({
        'year': int(r['Year']), 'total_pax': int(r['TotalPax']), 'yoy_growth_pct': yoy
    })

# Congestion monthly
cm = traffic.groupby(['Year','Month'])['Congestion_Level'].agg(['mean','min','max']).reset_index()
cm.columns = ['Year','Month','avg','min','max']
for _,r in cm.iterrows():
    trends_json['congestion_monthly'].append({
        'year': int(r['Year']), 'month': int(r['Month']),
        'date': f"{int(r['Year'])}-{int(r['Month']):02d}-01",
        'avg_congestion': round(float(r['avg']),3),
        'min_congestion': round(float(r['min']),1),
        'max_congestion': round(float(r['max']),1),
        'avg_speed_kmph': round(SPEED_MAP.get(round(r['avg']),30.0),1)
    })

with open(fr'{OUT_DIR}\historical_trends.json','w') as f:
    json.dump(to_serializable(trends_json), f, indent=2)
print("✅ historical_trends.json")

# ══════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════
import os
files = ['model_metrics.json','h2_2025_forecast.json','congestion_forecast.json',
         'route_recommendations.json','zone_intelligence.json','routes_map.json','historical_trends.json']
print("\n" + "═"*55)
print("  JSON OUTPUT SUMMARY")
print("═"*55)
for fn in files:
    path = fr'{OUT_DIR}\{fn}'
    size = os.path.getsize(path)/1024
    with open(path) as f: obj = json.load(f)
    top_keys = list(obj.keys())
    print(f"  {fn:<35} {size:>6.1f} KB  keys={top_keys}")
print("═"*55)
print("✅ All 7 JSON files ready for web plotting")
