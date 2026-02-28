# MOBILITY SHIFT: Data Strategy & Reasoning Guide
*Prepared for the Team*

This document outlines our approach to tackling **Stage 1 (Baseline Network Diagnostics & Forecasting)** of the Case 03 - Mobility Shift challenge based *only* on the provided data and case guidelines. The focus here is strictly on reasoning and mapping the data to the competition objectives before jumping into modeling.

---

## 1. The Core Objective
We are solving an **efficiency and allocation optimization problem** under growth and congestion pressure. It is *not* just a capacity estimation task. 
The board's mandate is: "Align demand, corridor efficiency, and fleet allocation under accelerating urban growth."

We need to provide insights and forecasts for H2 2025 (July 1 - Dec 31) and propose operational adjustments.

## 2. Our Data Arsenal
We have 5 datasets that need to be merged carefully. The case guidelines warn: **"Incorrect relational merging may materially distort corridor analysis."**

### Network Datasets (Static)
1. **`Bus_Routes.csv`**: Contains `Route_ID`, `Route_Code`, Start/End stops, `Route_Length_km`, `Avg_Travel_Time_Min`, **`Route_Type`** (City, Express, Feeder, Intercity).
2. **`Bus_Stops.csv`**: Contains `Stop_ID`, `Stop_Name`, Lat/Lon, **`Stop_Type`**, and **`Zone`** (e.g., Core_Deira, Res_InternationalCity).
3. **`Route_Stop_Mapping.csv`**: Links Routes to Stops via `Stop_Sequence` and gives **`Dwell_Time_Min`**.

### Time-Series Datasets (Dynamic)
4. **`Train_Ridership_2022_to_2025H1.csv`**: Daily data mapping `Route_ID`, `Stop_ID`, and `Date` to `Boarding_Count` and `Alighting_Count`. 
   - *Key metric to derive*: `Total_Pax = Boarding_Count + Alighting_Count`.
5. **`Train_Traffic_2022_to_2025H1.csv`**: Daily data mapping `Date` to `Congestion_Level` and `Avg_Speed_kmph`.

### 🚨 Crucial Data Merge Strategy
To build our primary analytical table, we must join:
- `Train_Ridership` with `Train_Traffic` on **`Date`**.
- The result with `Route_Stop_Mapping` on **`Route_ID`** and **`Stop_ID`**.
- The result with `Bus_Routes` on **`Route_ID`**.
- The result with `Bus_Stops` on **`Stop_ID`**.

---

## 3. Tackling the Stage 1 Mandates (The Reasoning)

We have 5 key deliverables. Here is how we will reason through them using the data:

### A. Growth Decomposition
**Goal:** Prove how demand has grown from 2022 to H1 2025.
- **Approach:** Aggregate `Total_Pax` system-wide by Month/Year. We need to decouple organic baseline growth (the long-term trend) from seasonal spikes using a time-series decomposition (e.g., STL or simple moving averages).
- **Why?** The guidelines state urban population expanded steadily. We need the slope of that underlying expansion, ignoring the noisy seasonal peaks.

### B. Seasonal Insight & Event/Day-Type Divergence
**Goal:** Understand winter uplifts, summer moderation, and weekday vs weekend shifts.
- **Approach:** 
  - Compare average `Total_Pax` across Winter (Nov-Mar) vs. Summer (Jun-Aug).
  - Extract day-of-week from the `Date` column to contrast Weekday vs. Weekend behaviors.
  - Check if these seasonal variations are uniform. *Hint: They aren't. Tourism zones (Marina) likely spike differently in Winter than Residential or Industrial zones (Jebel Ali).* Use the `Zone` column from `Bus_Stops.csv` to cut this data.

### C. Route-Type Comparison & Structural Imbalance
**Goal:** Find multi-year demand dynamics and emerging imbalances based on route function.
- **Approach:** Group `Total_Pax` by `Route_Type` (City, Express, Feeder, Intercity) and track demand over time.
- **Identifying Imbalance:** Do Feeder routes show massive passenger growth while the attached Express routes show stagnation? Look for "bottlenecks"—stops with massive `Boarding_Count` where passengers are queuing, but downstream stops show low activity. 

### D. Congestion Elasticity (Congestion-Demand Interaction)
**Goal:** Prove that we know how congestion affects passenger behavior and system capacity.
- **Approach:** Correlate `Congestion_Level` and `Avg_Speed_kmph` (from Traffic data) against `Total_Pax` for specific `Zone`s or `Route_Type`s.
- **The Theory to Test:** When congestion is High (lower speeds), do passengers shift away from surface buses? Or does effective capacity drop (buses get stuck in traffic, taking longer to complete a loop, effectively reducing the number of buses serving a stop per hour)? The case says *full stationarity must not be assumed*. We need to show if/how demand drops or relocates when speeds plummet.

### E. Baseline Forecast & Initial Allocation Strategy
**Goal:** Forecast daily demand per route for H2 2025 (July 1 - Dec 31) and propose fleet/headway changes.
- **Forecasting Approach:** Extrapolate the long-term trend computed in Step A, re-apply the Summer/Winter seasonal multipliers computed in Step B, and adjust for projected congestion. 
- **Allocation Strategy Reasoning:**
  - **Overload Risk Corridors:** Identify route-stop sequences where forecasted `Total_Pax` drastically exceeds current historical maximums. Propose **Fleet Reallocation** here.
  - **Underutilized Capacity:** Identify routes/zones where growth is flat or negative. Pull buses from here.
  - **Headway Modification:** If Dwell Time at stops is increasing or Speed is dropping due to congestion, simply adding more buses causes bunching. Instead, we might need *Express* services or skipping stops.

---

## 4. Next Steps for the Team
1. **Data Prep script:** Write a Python/Pandas script to execute the Master Merge perfectly on `Route_ID`, `Stop_ID`, and `Date`. Verify row counts to ensure no duplication.
2. **Exploratory Data Analysis (EDA):** Generate line charts for Total Demand over time to visually confirm the seasonality and growth trends.
---

## 5. Agile Python Pipeline (For Future Rounds)
To make this system extremely flexible to changes or new rules in Stage 2/Round 2, we have built a modular Object-Oriented python pipeline (`data_pipeline.py`).

**Why this matters:**
If the RTA board suddenly drops a new dataset or changes a constraint later, you don't want to rewrite 10 different Jupyter Notebook cells. The `MobilityDataPipeline` class handles everything dynamically:

1. **`load_data()`**: Automatically grabs CSVs from strictly defined parameter paths. If they just drop a "Round_2_Data" folder on us later, we just change the `DATA_DIR` argument, and the whole system runs instantly.
2. **`create_master_table()`**: Executes the complex 5-way join securely. 
3. **`feature_engineering()`**: Extracts the Seasons, Weekends, and Time dynamics. If they add a "Ramadan" or "Public Holiday" constraint later, we just add one line here instead of rewriting the analysis.

You can import this anywhere (e.g., in a Jupyter Notebook) via:
```python
from data_pipeline import MobilityDataPipeline
pipeline = MobilityDataPipeline(r"d:\decodeX\03 - Case MOBILITY SHIFT")
pipeline.load_data()
df = pipeline.create_master_table()
df = pipeline.feature_engineering()
```
This guarantees the data loading phase is instantly scalable and adaptable to whatever curveballs the judges throw in the next rounds.
