import pandas as pd
import numpy as np
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from app.ml.utils import numpy_to_python, classify_columns, get_top_n_values

class EDASummary(BaseModel):
    row_count: int
    col_count: int
    column_types: dict
    numeric_stats: dict         # {col: {mean, median, std, min, max, q25, q75, skewness, kurtosis}}
    missing_analysis: dict      # {col: {count, pct}}
    correlation_matrix: dict    # {col: {col: value}} — Pearson only
    top_correlations: list      # [{col1, col2, correlation}] top 10 absolute values
    categorical_analysis: dict  # {col: [{value, count, pct}]} — top 10 per col
    time_series_detection: dict # {detected: bool, date_col: str|None, target_col: str|None}
    skipped_reasons: list       # if any sub-analysis was skipped

class EDAPipeline:
    def run(self, df: pd.DataFrame, cleaning_report: dict = None) -> EDASummary:
        from app.ml.utils import classify_size, get_analysis_sample
        size_class = classify_size(df)
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"EDA: size_class={size_class}, rows={len(df)}")
        
        analysis_df = get_analysis_sample(df, size_class)

        summary = EDASummary(
            row_count=len(df),
            col_count=len(df.columns),
            column_types=classify_columns(df),
            numeric_stats={},
            missing_analysis={},
            correlation_matrix={},
            top_correlations=[],
            categorical_analysis={},
            time_series_detection={"detected": False, "date_col": None, "target_col": None},
            skipped_reasons=[]
        )
        
        if df.empty:
            summary.skipped_reasons.append("DataFrame is empty")
            return summary
            
        # 1. Missing Analysis
        for col in df.columns:
            null_count = int(df[col].isnull().sum())
            null_pct = float(null_count / len(df))
            summary.missing_analysis[col] = {"count": null_count, "pct": null_pct}
            
        # Extract columns by type for targeted analysis
        numeric_cols = [c for c, t in summary.column_types.items() if t == "numeric"]
        categorical_cols = [c for c, t in summary.column_types.items() if t in ("categorical", "text", "boolean")]
        datetime_cols = [c for c, t in summary.column_types.items() if t == "datetime"]
        
        # 2. Numeric Stats
        for col in numeric_cols:
            col_data = analysis_df[col].dropna()
            if len(col_data) == 0:
                continue
            
            stats = col_data.describe().to_dict()
            skewness = float(col_data.skew()) if len(col_data) > 2 and col_data.nunique() > 1 else None
            kurtosis = float(col_data.kurtosis()) if len(col_data) > 3 and col_data.nunique() > 1 else None
            
            summary.numeric_stats[col] = numpy_to_python({
                "mean": stats.get("mean"),
                "median": col_data.median(),
                "std": stats.get("std"),
                "min": stats.get("min"),
                "max": stats.get("max"),
                "q25": stats.get("25%"),
                "q75": stats.get("75%"),
                "skewness": skewness,
                "kurtosis": kurtosis
            })
            
        # 3. Correlation matrix
        if len(numeric_cols) >= 2:
            try:
                corr_df = analysis_df[numeric_cols].fillna(analysis_df[numeric_cols].mean()).corr(method='pearson')
                summary.correlation_matrix = numpy_to_python(corr_df.to_dict())
                
                # Get top correlations
                corr_pairs = []
                for i in range(len(corr_df.columns)):
                    for j in range(i+1, len(corr_df.columns)):
                        col1 = corr_df.columns[i]
                        col2 = corr_df.columns[j]
                        val = corr_df.iloc[i, j]
                        if not pd.isna(val):
                            corr_pairs.append({"col1": col1, "col2": col2, "correlation": float(val)})
                            
                corr_pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
                summary.top_correlations = corr_pairs[:10]
            except Exception as e:
                summary.skipped_reasons.append(f"Correlation calculation failed: {str(e)}")
        else:
            summary.skipped_reasons.append("Fewer than 2 numeric columns for correlation")
            
        # 4. Categorical analysis
        for col in categorical_cols:
            summary.categorical_analysis[col] = get_top_n_values(analysis_df[col], n=10)
            
        # 5. Time series detection
        summary.time_series_detection = self._detect_timeseries(df, cleaning_report, numeric_cols, datetime_cols)
        if not summary.time_series_detection["detected"] and (datetime_cols or (cleaning_report and cleaning_report.get('year_columns_detected'))):
             summary.skipped_reasons.append("Found potential date/year column but no suitable numeric target column for time series")
                    
        return summary

    def _detect_timeseries(self, df: pd.DataFrame, cleaning_report: dict, numeric_cols: list, datetime_cols: list) -> dict:
        """
        Strategy 1 (preferred): Look for proper datetime dtype columns.
        Strategy 2 (fallback): Look for integer columns that are year-type.
        """
        result = {
            "detected": False,
            "date_col": None,
            "target_col": None,
            "is_yearly": False,
            "frequency": None
        }
        
        # Strategy 1: Datetime columns
        if datetime_cols:
            best_date_col = datetime_cols[0]
            best_target_col = self._find_best_target(df, numeric_cols)
            if best_target_col:
                result.update({
                    "detected": True,
                    "date_col": best_date_col,
                    "target_col": best_target_col,
                    "is_yearly": False
                })
                return result
                
        # Strategy 2: Year columns detected in cleaning
        year_cols = cleaning_report.get('year_columns_detected', []) if cleaning_report else []
        if year_cols:
            best_date_col = year_cols[0]
            candidates = [c for c in numeric_cols if c != best_date_col]
            best_target_col = self._find_best_target(df, candidates)
            if best_target_col:
                result.update({
                    "detected": True,
                    "date_col": best_date_col,
                    "target_col": best_target_col,
                    "is_yearly": True,
                    "frequency": "Y"
                })
                return result
                
        return result

    def _find_best_target(self, df: pd.DataFrame, candidates: list) -> str | None:
        best_target_col = None
        max_var = -1
        for col in candidates:
            # Check if it's boolean-like or an ID
            if df[col].nunique() <= 2:
                continue
            if 'id' in col.lower() or df[col].nunique() == len(df):
                continue 
            
            var = df[col].var()
            if pd.notna(var) and var > max_var:
                max_var = var
                best_target_col = col
                
        return best_target_col
