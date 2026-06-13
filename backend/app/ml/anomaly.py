import pandas as pd
import numpy as np
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from app.ml.utils import classify_size, get_analysis_sample, DatasetSize

logger = logging.getLogger(__name__)

class AnomalyReport(BaseModel):
    total_rows_analyzed: int
    total_anomalies: int
    anomaly_pct: float
    anomaly_indices: list        
    method_used: str             
    skip_reason: Optional[str] = None
    column_anomaly_counts: dict
    size_class: Optional[str] = None
    sample_size_used: Optional[int] = None

class AnomalyDetector:
    def detect(self, df: pd.DataFrame, contamination: float = 0.05) -> AnomalyReport:
        size_class = classify_size(df)
        logger.info(f"Anomaly detection: size_class={size_class}, rows={len(df)}")
        
        sample_df = get_analysis_sample(df, size_class)
        numeric_df = sample_df.select_dtypes(include='number').dropna(how='all')

        report = AnomalyReport(
            total_rows_analyzed=len(numeric_df),
            total_anomalies=0,
            anomaly_pct=0.0,
            anomaly_indices=[],
            method_used="skipped",
            column_anomaly_counts={},
            size_class=size_class,
            sample_size_used=len(sample_df)
        )

        if len(numeric_df) < 20 or len(numeric_df.columns) == 0:
            report.skip_reason = "Insufficient numeric data"
            return report

        # For performance, only use IsolationForest on large/huge datasets, skip the z-score fallback
        scaler = StandardScaler()
        X = scaler.fit_transform(numeric_df.fillna(numeric_df.median()))

        # Reduce estimators for HUGE datasets
        n_estimators = 50 if size_class == DatasetSize.HUGE else 100

        clf = IsolationForest(
            contamination=contamination, 
            random_state=42, 
            n_estimators=n_estimators
        )
        preds = clf.fit_predict(X)
        
        anomaly_mask = (preds == -1)
        # Note: indices are from sample_df, which has reset index.
        # This is fine for VizAgent scatter plots as long as we just need the mask.
        report.anomaly_indices = numeric_df.index[anomaly_mask].tolist()
        report.method_used = "isolation_forest"
        report.total_anomalies = len(report.anomaly_indices)
        report.anomaly_pct = float((report.total_anomalies / report.total_rows_analyzed) * 100)

        # Skip column-level z-score logic for LARGE/HUGE to save time
        if size_class in (DatasetSize.SMALL, DatasetSize.MEDIUM):
            try:
                from scipy.stats import zscore
                z_scores = numeric_df.apply(
                    lambda x: np.abs(zscore(x.fillna(x.median()), nan_policy='omit'))
                )
                for col in z_scores.columns:
                    outliers = (z_scores[col] > 3).sum()
                    if outliers > 0:
                        report.column_anomaly_counts[col] = int(outliers)
            except Exception as e:
                logger.warning(f"Z-score anomaly fallback failed: {e}")

        return report
