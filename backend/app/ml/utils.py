import numpy as np
import pandas as pd
from datetime import datetime

class DatasetSize:
    SMALL  = 'small'    # < 5,000 rows  — full pipeline, no shortcuts
    MEDIUM = 'medium'   # 5k – 20k rows — full pipeline, minor shortcuts
    LARGE  = 'large'    # 20k – 100k    — optimized path
    HUGE   = 'huge'     # > 100k rows   — heavily optimized path

def classify_size(df: pd.DataFrame) -> str:
    n = len(df)
    if n <   5_000: return DatasetSize.SMALL
    if n <  20_000: return DatasetSize.MEDIUM
    if n < 100_000: return DatasetSize.LARGE
    return DatasetSize.HUGE

def get_analysis_sample(df: pd.DataFrame, size_class: str) -> pd.DataFrame:
    """
    Returns a stratified random sample for ML operations.
    SMALL/MEDIUM: return df unchanged.
    LARGE: sample 15,000 rows.
    HUGE: sample 20,000 rows.
    Always uses random_state=42 for reproducibility.
    """
    limits = {
        DatasetSize.SMALL:  None,
        DatasetSize.MEDIUM: None,
        DatasetSize.LARGE:  15_000,
        DatasetSize.HUGE:   20_000,
    }
    limit = limits[size_class]
    if limit is None or len(df) <= limit:
        return df
    return df.sample(n=limit, random_state=42).reset_index(drop=True)

def numpy_to_python(obj):
    """
    Recursively converts numpy types to Python native types for JSON serialization.
    Handles: np.int64, np.float64, np.bool_, np.ndarray, pd.Timestamp, pd.Series
    Falls back to str() for unknown types.
    """
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, (np.ndarray,)):
        return [numpy_to_python(x) for x in obj.tolist()]
    elif isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    elif isinstance(obj, (datetime, pd.Timestamp)):
        return obj.isoformat()
    elif isinstance(obj, pd.Series):
        return [numpy_to_python(x) for x in obj.tolist()]
    elif isinstance(obj, dict):
        return {str(k): numpy_to_python(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [numpy_to_python(x) for x in obj]
    elif isinstance(obj, tuple):
        return tuple(numpy_to_python(x) for x in obj)
    elif pd.isna(obj): # handle single pd.NA or np.nan not covered by float type check
        return None
    elif isinstance(obj, (int, float, str, bool, type(None))):
        return obj
    else:
        return str(obj)

def classify_columns(df: pd.DataFrame) -> dict:
    """
    Returns a dict mapping column name to type category.
    Categories: "numeric", "categorical", "datetime", "boolean", "text", "unknown"
    """
    col_types = {}
    row_count = len(df)
    
    for col in df.columns:
        dtype = df[col].dtype
        if pd.api.types.is_bool_dtype(dtype):
            col_types[col] = "boolean"
        elif pd.api.types.is_numeric_dtype(dtype):
            col_types[col] = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            col_types[col] = "datetime"
        elif pd.api.types.is_object_dtype(dtype) or pd.api.types.is_string_dtype(dtype):
            nunique = df[col].nunique(dropna=True)
            if nunique < 20 and (row_count == 0 or nunique / row_count < 0.05):
                col_types[col] = "categorical"
            else:
                col_types[col] = "text"
        else:
            col_types[col] = "unknown"
            
    return col_types

def safe_sample(df: pd.DataFrame, max_rows: int = 50000) -> pd.DataFrame:
    """
    If df has more than max_rows, return a stratified random sample.
    Otherwise return df unchanged.
    Always set random_state=42.
    """
    if len(df) <= max_rows:
        return df.copy()
    # Simple random sample, as proper stratified requires a target column
    return df.sample(n=max_rows, random_state=42).copy()

def get_top_n_values(series: pd.Series, n: int = 10) -> list:
    """
    Returns top n most frequent values with their counts as list of dicts.
    [{"value": "X", "count": 123, "pct": 45.6}, ...]
    Handle NaN: count them but label as "__null__"
    """
    total = len(series)
    if total == 0:
        return []
    
    # Fill NA to count them
    s = series.fillna("__null__")
    counts = s.value_counts().head(n)
    
    result = []
    for val, count in counts.items():
        result.append({
            "value": numpy_to_python(val),
            "count": int(count),
            "pct": float((count / total) * 100)
        })
    return result
