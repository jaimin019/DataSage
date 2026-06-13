"""
LangGraph pipeline state definition.
Every agent node MUST return a dict with updated state keys only.
"""

from typing import TypedDict, Optional


class PipelineState(TypedDict):
    session_id: str
    file_path: str
    filename: str
    preferences: Optional[dict]
    pipeline_config: Optional[dict]
    raw_df: Optional[object]           # pd.DataFrame (not type-checked by TypedDict)
    cleaned_df: Optional[object]
    internal_df: Optional[object]
    cleaning_report: Optional[dict]
    eda_summary: Optional[dict]
    anomaly_report: Optional[dict]
    cluster_report: Optional[dict]
    visualizations: Optional[list]
    insights: Optional[list]
    forecast_result: Optional[dict]
    error: Optional[str]
    current_stage: str
