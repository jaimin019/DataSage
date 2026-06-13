import requests
import pandas as pd
import io

session_id = "7885eb56-dd08-4695-9c7a-a4550569a77d"
BASE_URL = "http://localhost:8000/api/v1"

dl_res = requests.get(f"{BASE_URL}/session/{session_id}/download/cleaned-csv")
df = pd.read_csv(io.StringIO(dl_res.text))

internal_cols = [c for c in df.columns if 'is_outlier_' in c or 'is_anomaly' in c or '_datasage_' in c]
print("Columns:", df.columns.tolist())
print("Internal columns found:", internal_cols)
