import pypdf
import pandas as pd
import os

pdf_path = r"d:\decodeX\03 - Case MOBILITY SHIFT\Case 03 - Stage Guidelines.pdf"

with open(r"d:\decodeX\analysis_output_utf8.txt", "w", encoding="utf-8") as out_f:
    out_f.write("--- PDF CONTENT ---\n")
    try:
        with open(pdf_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            out_f.write(text[:5000]) # First 5000
            out_f.write("\n... [truncated] ...\n")
            out_f.write(text[-5000:]) # Last 5000
    except Exception as e:
        out_f.write(f"Error reading PDF: {e}\n")

    out_f.write("\n--- CSV SCHEMAS ---\n")
    csv_files = [
        r"d:\decodeX\03 - Case MOBILITY SHIFT\Bus_Routes.csv",
        r"d:\decodeX\03 - Case MOBILITY SHIFT\Bus_Stops.csv",
        r"d:\decodeX\03 - Case MOBILITY SHIFT\Route_Stop_Mapping.csv",
        r"d:\decodeX\03 - Case MOBILITY SHIFT\Train\Train_Ridership_2022_to_2025H1.csv",
        r"d:\decodeX\03 - Case MOBILITY SHIFT\Train\Train_Traffic_2022_to_2025H1.csv"
    ]

    for file in csv_files:
        out_f.write(f"\n=== {os.path.basename(file)} ===\n")
        try:
            df = pd.read_csv(file, nrows=5)
            out_f.write(f"Columns: {list(df.columns)}\n")
            out_f.write(df.head(3).to_string() + "\n")
        except Exception as e:
            out_f.write(f"Error reading {file}: {e}\n")
