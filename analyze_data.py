import pypdf
import pandas as pd
import os

pdf_path = r"d:\decodeX\03 - Case MOBILITY SHIFT\Case 03 - Stage Guidelines.pdf"
print("--- PDF CONTENT ---")
try:
    with open(pdf_path, "rb") as f:
        reader = pypdf.PdfReader(f)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        print(text[:3000]) # Print first 3000 chars
        print("\n... [truncated] ...\n")
        print(text[-3000:]) # Print last 3000 chars
except Exception as e:
    print(f"Error reading PDF: {e}")

print("\n--- CSV SCHEMAS ---")
csv_files = [
    r"d:\decodeX\03 - Case MOBILITY SHIFT\Bus_Routes.csv",
    r"d:\decodeX\03 - Case MOBILITY SHIFT\Bus_Stops.csv",
    r"d:\decodeX\03 - Case MOBILITY SHIFT\Route_Stop_Mapping.csv",
    r"d:\decodeX\03 - Case MOBILITY SHIFT\Train\Train_Ridership_2022_to_2025H1.csv",
    r"d:\decodeX\03 - Case MOBILITY SHIFT\Train\Train_Traffic_2022_to_2025H1.csv"
]

for file in csv_files:
    print(f"\n=== {os.path.basename(file)} ===")
    try:
        df = pd.read_csv(file, nrows=5)
        print("Columns:", list(df.columns))
        print(df.head(3).to_string())
    except Exception as e:
        print(f"Error reading {file}: {e}")
