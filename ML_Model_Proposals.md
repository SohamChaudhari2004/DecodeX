# ML Model Proposals for DecodeX — Case 03: Mobility Shift
**Author:** System Analysis of `Mobility_Shift_System_Understanding.md` & `Mobility_Shift_Data_Strategy.md`  
**Date:** 28 February 2026

> This document identifies every ML model and analytical algorithm that can be reasonably derived from the 5 provided datasets and integrated into the DecodeX application to dramatically improve the quality and depth of the system's outputs.

---

## The Reasoning Foundation

The data strategy documents position this as an **efficiency and allocation optimization problem**, not a simple capacity estimation task. Every model proposed below corresponds directly to one of the 5 analytical mandates:

| Strategy Mandate | ML Domain | Data Used |
|---|---|---|
| A. Growth Decomposition | Time-Series Forecasting | Ridership, Traffic |
| B. Seasonality & Day-Type | Seasonal Decomposition | Ridership (Date features) |
| C. Structural Imbalances | Anomaly Detection / Clustering | Ridership, Mapping, Stops |
| D. Congestion Elasticity | Regression / Correlation | Traffic + Ridership by Zone |
| E. Baseline Forecast & Allocation | Predictive + Optimization | All 5 datasets |

---

## Model 1 — STL Demand Decomposition Engine
**Mandate:** A (Growth Decomposition)  
**Type:** Statistical Time-Series — STL (Seasonal-Trend Decomposition using Loess)

### What It Does
Decomposes the total daily passenger volume (`Total_Pax`) time-series into three additive components:
- **Trend:** Long-run secular growth stripped of seasonal noise — the true RTA board-facing growth line.
- **Seasonal:** The repeating within-year cyclical pattern (winter peaks, summer troughs).
- **Residual:** Remaining noise, including event-driven demand spikes.

### Why It Matters
Without this, any monthly chart will confuse seasonal peaks with genuine network growth — the judges will penalise this. The **Trend Slope** (units: additional pax-trips per month per year) becomes the most defensible growth metric.

### Derivable Outputs for the App
- `trend_slope_by_zone` per Zone: Rank zones by growth acceleration
- `seasonal_multiplier_by_month`: Apply to H2 2025 forecasts
- `event_spike_dates`: Dates exceeding baseline + 2σ, validatable against Dubai event calendars

### Key Libraries
```python
from statsmodels.tsa.seasonal import STL
```

### Integration Point
Feed `trend_slope` into the **Analytics Dashboard** → Section A (Growth Dynamics), overlaid as a line on the monthly bar chart already implemented in `AnalyticsDashboard.tsx`.

---

## Model 2 — Zonal Demand Forecaster (H2 2025)
**Mandate:** E (Baseline Forecast)  
**Type:** Machine Learning Regression — Random Forest / Gradient Boosting

### What It Does
Predicts daily `Total_Pax` per zone for each day in H2 2025 (Jul 1 — Dec 31), given:
- Extracted Trend slope from Model 1
- Month-specific seasonal multipliers from Model 1
- Projected Congestion Level (from traffic extrapolation)
- DayOfWeek (Weekday/Weekend flag)

### Why It Matters
This is the core forecasting deliverable demanded by the Stage 1 Guidelines. Without H2 2025 predictions, there is no basis for fleet allocation recommendations.

### Derivable Outputs for the App
- `h2_forecast_by_zone.json` — per-day zone demand forecasts
- **Forecast visual:** A 6-month future curve on the dashboard bar chart
- **Overload Risk Flag:** Zones where forecasted demand > 115% of historical peak

### Key Libraries
```python
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
import xgboost as xgb
```

### Integration Point
Existing `train_forecast.json` can be extended with zone-level data. The Mapbox map can recalibrate bus stop glow intensity dynamically per forecasted zone demand.

---

## Model 3 — Congestion Elasticity Regression (εD)
**Mandate:** D (Congestion-Demand Interaction)  
**Type:** OLS Regression / Spearman Correlation Analysis

### What It Does
Formally computes the **Congestion Elasticity of Demand** coefficient εD per Zone:
```
εD = % change in Total_Pax / % change in Congestion_Level
```
Implemented as `log(Total_Pax) ~ log(Congestion_Level) + month_year_fixed_effects`.

A coefficient of **-0.3** means: a 10% increase in congestion → 3% demand drop.

### Why It Matters
This is the single most analytically sophisticated finding the judges are looking for. It distinguishes the team's submission from descriptive-only analyses. It directly answers: *"Are passengers abandoning the network under congestion, or are they captive riders?"*

### Zone-Level Expected Findings (based on doc analysis)
| Zone | Expected εD | Interpretation |
|---|---|---|
| Coastal_Marina | Most negative (e.g. -0.5) | Tourists have modal alternatives → elastic |
| CBD_BusinessBay | Moderately negative (-0.2 to -0.3) | Mixed professional + retail |
| Ind_JebelAli | Near zero (0.0) | Blue-collar shift workers → captive |
| Res_InternationalCity | Near zero (0.0 to +0.1) | Migrant workers → captive |

### Derivable Outputs for the App
- `elasticity_coefficients.json` — per Zone
- **Dashboard Table:** Elasticity matrix (already partially implemented — upgrade from Pearson ρ to εD)
- **Map:** Color zones by elasticity level on the isometric view

### Key Libraries
```python
import statsmodels.api as sm
from scipy.stats import spearmanr
```

---

## Model 4 — Bus Bunching Vulnerability Classifier
**Mandate:** C (Structural Imbalances) + E (Allocation)  
**Type:** Classification — Logistic Regression / Rule-Based Threshold Model

### What It Does
For each `Route_ID`, computes a **Bunching Risk Score** based on:
- High `Dwell_Time_Min` at early stops (triggers late arrival cascade)
- High `Boarding_Count` at peak stops (forces extra dwell)
- Low `Avg_Speed_kmph` on dates with high congestion

Labels each route as: `LOW_RISK` / `MEDIUM_RISK` / `HIGH_RISK` for bunching.

### Why It Matters
The documents extensively describe the 5-stage congestion cascade: Cycle Elongation → Bunching → Capacity Reduction → Demand Abandonment → Reliability Collapse. Quantifying which **routes are at Stage 2 (Bunching)** right now is a killer finding.

### Derivable Outputs for the App
- `bunching_risk_by_route.json`
- **Map layer:** Route line glow color switching to Orange/Red for HIGH_RISK routes
- **Dashboard:** "Most Vulnerable Routes" table under Structural Imbalances

---

## Model 5 — Stop-Level Load Accumulation Profiler
**Mandate:** C (Structural Imbalances)  
**Type:** Deterministic Pandas Algorithm (rolling cumulative sum)

### What It Does
For every `Route_ID`, reconstructs the **implied in-vehicle bus load** across the stop sequence:
```python
cumulative_net_load = rolling_sum(Boarding_Count - Alighting_Count, by=[Route_ID, Stop_Sequence])
```
Identifies the **Peak Load Point (PLP)** — the Stop_Sequence position where the bus is most crowded.

If `cumulative_net_load > 70` at any intermediate stop, that route segment is flagged as **structurally overloaded** (exceeds standard bus capacity).

### Why It Matters
This does not require any ML — it is directly derivable from the data. But it is the most concrete evidence of where the network is physically failing, which the documents call the highest-confidence identification method.

### Derivable Outputs for the App
- `load_profiles_by_route.json` — per-stop cumulative net load vectors
- **Map animation:** Animate bus load accumulation along a selected route in the isometric view
- **Dashboard card:** "Peak Overload Corridor" — specific named route and stop

---

## Model 6 — Zone Corridor Growth Classifier (4-Quadrant Matrix)
**Mandate:** E (Forecast & Allocation Strategy)  
**Type:** Rule-Based Classification using Mandate A + D outputs

### What It Does
Applies the Case Guidelines **4-Quadrant Classification** to every Zone using computed values from Model 1 (trend slope) and Model 3 (elasticity):

| Quadrant | Label | Recommendation |
|---|---|---|
| High Growth + High Elasticity | 🔴 Redesign Urgently | Express service insertion, bus lanes |
| High Growth + Low Elasticity | 🟡 Add Capacity | Fleet reallocation, headway reduction |
| Low Growth + High Elasticity | 🟠 Investigate Suppression | Service quality degradation check |
| Low Growth + Low Elasticity | 🟢 Reallocate Away | Pull buses, redeploy to red zones |

### Why It Matters
This matrix **directly produces fleet reallocation recommendations** — the ultimate deliverable of Stage 1. The board gets a named quadrant with a quantified rationale for every zone.

### Derivable Outputs for the App
- **Dashboard Section:** "Network Response Matrix" — 4-quadrant card grid with each zone placed
- Color coded by risk level mapping to the existing congestion system (Red, Orange, Yellow, Green)

---

## Model 7 — Feeder-to-Trunk Disconnection Detector
**Mandate:** C (Structural Imbalances)  
**Type:** Cross-Join Correlation Analysis

### What It Does
At every Metro_Link stop, computes:
1. Total daily Boarding_Count from **Feeder** routes arriving at that stop
2. Total daily Boarding_Count from **Express/City** routes departing from that same stop

A **disconnection** exists when Feeder arrivals grow at >X% CAGR but trunk departures grow at <X% — the network is generating passengers it cannot absorb.

### Why It Matters
This is explicitly called out in the System Understanding doc as one of three structural imbalance signatures the judges will look for. It requires the full 5-way master join to execute — a demonstration of relational sophistication.

### Derivable Outputs for the App
- **Metro_Link stop markers** on the DubaiMap with a "feeder overflow" badge
- **Dashboard:** "Feeder Disconnect Ranking" — top 3 Metro_Link nodes under pressure

---

## Model 8 — Seasonal Fleet Reallocation Optimizer
**Mandate:** E (Allocation Strategy)  
**Type:** Linear Programming (optional) or Rule-Based Optimizer

### What It Does
Using the seasonal multipliers per zone from Model 1, computes the **optimal fleet redistribution** for each quarter of H2 2025:
- Pull buses from summer-low zones (e.g., Marina in Aug)
- Push buses to high-growth zones (e.g., Jebel Ali on weekday AM peaks)
- Output: routes × headway_change recommendations

### Why It Matters
This converts analysis into **actionable RTA board recommendations** — the difference between a data science submission and an operational strategy submission.

### Key Libraries
```python
from scipy.optimize import linprog  # or use pulp
```

### Derivable Outputs for the App
- `reallocation_recommendations.json`
- **Dashboard Section:** "H2 2025 Fleet Strategy" — a table of proposed headway changes per route type

---

## Summary Priority Matrix

| Priority | Model | Complexity | Impact |
|---|---|---|---|
| 🔴 High | STL Demand Decomposition (M1) | Medium | Foundational for all forecasts |
| 🔴 High | Congestion Elasticity Regression (M3) | Medium | Key judge differentiator |
| 🔴 High | Stop Load Accumulation Profiler (M5) | Low | Directly proves structural imbalances |
| 🟡 Medium | Zonal H2 2025 Demand Forecaster (M2) | Medium | Core Stage 1 deliverable |
| 🟡 Medium | Zone Corridor 4Q Classifier (M6) | Low | Fleet allocation justification |
| 🟡 Medium | Feeder-Trunk Disconnection Detector (M7) | Medium | Named corridor evidence |
| 🟢 Bonus | Bus Bunching Vulnerability Classifier (M4) | Medium | Strong visual integration on map |
| 🟢 Bonus | Seasonal Fleet Optimizer (M8) | High | Full allocation strategy output |

---

## Integration Architecture Summary

```
DATA LAYER (CSVs) 
   ↓
[data_pipeline.py] → 195k row Master Table
   ↓
[generate_system_dashboard.py] → Models 1, 3, 5, 6, 7 → JSON outputs
   ↓
[web/public/data/*.json] → Next.js API
   ↓
[AnalyticsDashboard.tsx] → Dashboard Sections A, B, C, D, E
[DubaiMap.tsx + isometric/page.tsx] → Live map layer coloring
```

---

*All models are grounded exclusively in the 5 provided datasets. No external data sources assumed.*
