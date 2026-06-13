import numpy as np
import pandas as pd
from app.ml.utils import numpy_to_python

class VizAgent:
    def generate(
        self,
        cleaned_df:     pd.DataFrame,
        internal_df:    pd.DataFrame,
        eda_summary:    dict,
        anomaly_report: dict,
        cluster_report: dict,
        session_id:     str,
        supabase_client,
        pipeline_config: dict,
    ) -> list[dict]:
        from app.ml.chart_generator import ChartGenerator
        gen = ChartGenerator(supabase_client, session_id)
        return gen.generate_all(
            cleaned_df, internal_df,
            eda_summary, anomaly_report, cluster_report,
            pipeline_config,
        )
