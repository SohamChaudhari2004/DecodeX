import pandas as pd
import os

class MobilityDataPipeline:
    def __init__(self, data_dir):
        """
        Initialize the pipeline with the root directory containing the data.
        This makes it easy to switch directories for Round 2 or Stage 2 data.
        """
        self.data_dir = data_dir
        self.routes = None
        self.stops = None
        self.mapping = None
        self.ridership = None
        self.traffic = None
        self.master_df = None

    def load_data(self):
        """
        Load all static and dynamic datasets. Kept modular so we can easily 
        add 'Test' or 'Round 2' paths later without breaking the logic.
        """
        print("Loading datasets...")
        
        # Using joins with os.path allows for cross-environment safety
        self.routes = pd.read_csv(os.path.join(self.data_dir, "Bus_Routes.csv"))
        self.stops = pd.read_csv(os.path.join(self.data_dir, "Bus_Stops.csv"))
        self.mapping = pd.read_csv(os.path.join(self.data_dir, "Route_Stop_Mapping.csv"))
        
        # Load Train
        train_dir = os.path.join(self.data_dir, "Train")
        r_train = pd.read_csv(os.path.join(train_dir, "Train_Ridership_2022_to_2025H1.csv"))
        t_train = pd.read_csv(os.path.join(train_dir, "Train_Traffic_2022_to_2025H1.csv"))
        r_train['Stage'] = 'Train'
        
        # Load Shock
        shock_dir = os.path.join(self.data_dir, "SHOCK", "SHOCK")
        if not os.path.exists(shock_dir):
            shock_dir = os.path.join(self.data_dir, "SHOCK")
        r_shock = pd.read_csv(os.path.join(shock_dir, "Shock_Ridership_2025_Q3.csv"))
        t_shock = pd.read_csv(os.path.join(shock_dir, "Shock_Traffic_2025_Q3.csv"))
        r_shock['Stage'] = 'Shock'
        
        # Load OutOfTime
        oot_dir = os.path.join(self.data_dir, "OutofTime")
        if not os.path.exists(oot_dir):
            oot_dir = os.path.join(self.data_dir, "OutOfTime")
        r_oot = pd.read_csv(os.path.join(oot_dir, "OutOfTime_Ridership_2025_Q4.csv"))
        t_oot = pd.read_csv(os.path.join(oot_dir, "OutOfTime_Traffic_2025_Q4.csv"))
        r_oot['Stage'] = 'OutOfTime'
        
        self.ridership = pd.concat([r_train, r_shock, r_oot], ignore_index=True)
        self.traffic = pd.concat([t_train, t_shock, t_oot], ignore_index=True)
        
        # Cast dates to datetime objects immediately
        self.ridership['Date'] = pd.to_datetime(self.ridership['Date'])
        self.traffic['Date'] = pd.to_datetime(self.traffic['Date'])
        
        print("Data loaded successfully.")

    def create_master_table(self):
        """
        Merges all tables into a single analytical view.
        Modularized so if they clarify join conditions we only change code here.
        """
        print("Building master analytical table...")
        
        # 1. Derive total pax metric early
        self.ridership['Total_Pax'] = self.ridership['Boarding_Count'] + self.ridership['Alighting_Count']
        
        # 2. Merge Ridership with Traffic (on Date)
        df = pd.merge(self.ridership, self.traffic, on='Date', how='left')
        
        # 3. Merge with Route-Stop Mapping
        # Note: mapping is static, but we apply it to every row based on Route and Stop
        df = pd.merge(df, self.mapping, on=['Route_ID', 'Stop_ID'], how='left')
        
        # 4. Merge with Routes
        df = pd.merge(df, self.routes, on='Route_ID', how='left')
        
        # 5. Merge with Stops
        df = pd.merge(df, self.stops, on='Stop_ID', how='left')
        
        self.master_df = df
        print(f"Master table built. Shape: {self.master_df.shape}")
        return self.master_df

    def feature_engineering(self):
        """
        Extract date features and other derived columns.
        If PS adds new constraints (like handling holidays), add them here.
        """
        if self.master_df is None:
            raise ValueError("Run create_master_table() first.")
            
        print("Applying feature engineering...")
        
        # Date components for seasonality
        self.master_df['Year'] = self.master_df['Date'].dt.year
        self.master_df['Month'] = self.master_df['Date'].dt.month
        self.master_df['Day'] = self.master_df['Date'].dt.day
        self.master_df['DayOfWeek'] = self.master_df['Date'].dt.dayofweek
        self.master_df['Is_Weekend'] = self.master_df['DayOfWeek'].isin([5, 6]) # Assuming Sat/Sun weekend
        
        # Season flag (Nov-Mar = Winter, Jun-Aug = Summer)
        self.master_df['Season'] = self.master_df['Month'].apply(
            lambda x: 'Winter' if x in [11, 12, 1, 2, 3] else ('Summer' if x in [6, 7, 8] else 'Transition')
        )
        
        print("Features engineered.")
        return self.master_df

# Example usage:
if __name__ == "__main__":
    DATA_DIR = r"d:\decodeX\03 - Case MOBILITY SHIFT"
    
    pipeline = MobilityDataPipeline(DATA_DIR)
    pipeline.load_data()
    master_df = pipeline.create_master_table()
    master_df = pipeline.feature_engineering()
    
    # Ready for analysis!
    print(master_df.head())
