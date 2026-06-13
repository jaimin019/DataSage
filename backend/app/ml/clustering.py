import pandas as pd
import numpy as np
from pydantic import BaseModel
from typing import List, Dict, Optional
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
from app.ml.utils import numpy_to_python

import logging
from app.ml.utils import classify_size, get_analysis_sample, DatasetSize

logger = logging.getLogger(__name__)

class ClusterReport(BaseModel):
    skipped: bool = False
    skip_reason: Optional[str] = None
    k: Optional[int] = None
    silhouette_score: Optional[float] = None
    calinski_harabasz_score: Optional[float] = None
    size_class: Optional[str] = None
    sample_size_used: Optional[int] = None
    cluster_sizes: Optional[dict] = None       # {0: 234, 1: 189, 2: 312}
    cluster_labels: Optional[list] = None      # one label per row
    pca_coords: Optional[list] = None          # [{x: ..., y: ..., cluster: 0}] for scatter viz
    inertia: Optional[float] = None

class ClusteringPipeline:
    def run(self, df: pd.DataFrame) -> ClusterReport:
        size_class = classify_size(df)
        logger.info(f"Clustering: size_class={size_class}, rows={len(df)}")

        # Sample for large datasets
        sample_df = get_analysis_sample(df, size_class)
        numeric_df = sample_df.select_dtypes(include='number').dropna()

        # Minimum viability check
        if len(numeric_df) < 50 or numeric_df.shape[1] < 2:
            return ClusterReport(
                skipped=True,
                skip_reason=f"Insufficient data: {len(numeric_df)} rows, "
                            f"{numeric_df.shape[1]} numeric columns"
            )

        scaler = StandardScaler()
        X = scaler.fit_transform(numeric_df)

        if size_class in (DatasetSize.LARGE, DatasetSize.HUGE):
            from sklearn.cluster import MiniBatchKMeans
            from sklearn.metrics import calinski_harabasz_score

            KMeansClass = MiniBatchKMeans
            score_fn    = calinski_harabasz_score   # higher = better
            score_name  = 'calinski_harabasz'
            n_init      = 3                         # fewer restarts for speed
        else:
            from sklearn.cluster import KMeans
            from sklearn.metrics import silhouette_score

            KMeansClass = KMeans
            score_fn    = silhouette_score          # higher = better
            score_name  = 'silhouette'
            n_init      = 10

        # Score each k (2 to 8)
        max_k = min(9, len(X))
        scores: dict[int, float] = {}
        for k in range(2, max_k):
            km = KMeansClass(n_clusters=k, random_state=42, n_init=n_init)
            labels = km.fit_predict(X)
            scores[k] = float(score_fn(X, labels))

        if not scores:
            return ClusterReport(skipped=True, skip_reason="Could not score any k value")

        best_k = max(scores, key=scores.get)

        # Final fit with best k
        km_final = KMeansClass(n_clusters=best_k, random_state=42, n_init=n_init)
        labels   = km_final.fit_predict(X)

        # PCA projection to 2D for visualization
        pca = PCA(n_components=2, random_state=42)
        coords = pca.fit_transform(X)

        # Limit scatter data to 2,000 points regardless of dataset size
        MAX_SCATTER = 2_000
        if len(coords) > MAX_SCATTER:
            idx = np.random.default_rng(42).choice(
                len(coords), size=MAX_SCATTER, replace=False
            )
            pca_coords = [
                {'x': float(coords[i, 0]), 'y': float(coords[i, 1]),
                 'cluster': int(labels[i])}
                for i in idx
            ]
        else:
            pca_coords = [
                {'x': float(coords[i, 0]), 'y': float(coords[i, 1]),
                 'cluster': int(labels[i])}
                for i in range(len(coords))
            ]

        return ClusterReport(
            skipped=False,
            k=best_k,
            silhouette_score=float(scores[best_k]) if score_name == 'silhouette' else None,
            calinski_harabasz_score=float(scores[best_k]) if score_name == 'calinski_harabasz' else None,
            cluster_sizes={str(i): int((labels == i).sum()) for i in range(best_k)},
            cluster_labels=labels.tolist(),
            pca_coords=pca_coords,
            size_class=size_class,
            sample_size_used=len(sample_df),
            inertia=float(km_final.inertia_) if hasattr(km_final, 'inertia_') else None,
        )
