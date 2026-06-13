"""
LangGraph orchestrator — builds and runs the full DataSage pipeline graph.
Each node is an async function that returns ONLY updated state keys.
"""

import logging
import pandas as pd
import io

from langgraph.graph import StateGraph, END

from app.agents.state import PipelineState
from app.agents.viz_agent import VizAgent
from app.agents.insight_agent import InsightAgent
from app.llm.client import LLMClient
from app.ml.cleaning import DataCleaningPipeline
from app.ml.eda import EDAPipeline
from app.ml.anomaly import AnomalyDetector
from app.ml.clustering import ClusteringPipeline
from app.ml.forecasting import ForecastingPipeline
from app.ml.utils import numpy_to_python
from app.services import upload_service
from app.core.config import settings

logger = logging.getLogger(__name__)


# ── Node functions ──────────────────────────────────────────────────────────

async def load_data_node(state: PipelineState) -> dict:
    """Load CSV from Supabase storage."""
    try:
        res = upload_service.supabase.storage.from_(settings.SUPABASE_BUCKET).download(
            state["file_path"]
        )
        try:
            df = pd.read_csv(io.BytesIO(res), encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(res), encoding="latin-1")

        filename = state["file_path"].split("/")[-1] if "/" in state["file_path"] else state["file_path"]
        return {"raw_df": df, "filename": filename, "current_stage": "load_data"}
    except Exception as e:
        return {"error": f"Failed to load CSV: {str(e)}", "current_stage": "load_data"}


async def cleaning_node(state: PipelineState) -> dict:
    """Run DataCleaningPipeline."""
    try:
        cleaned_df, internal_df, report = DataCleaningPipeline().run(state["raw_df"])
        return {
            "cleaned_df": cleaned_df,
            "internal_df": internal_df,
            "cleaning_report": numpy_to_python(report.model_dump()),
            "current_stage": "cleaning",
        }
    except Exception as e:
        return {"error": f"Cleaning failed: {str(e)}", "current_stage": "cleaning"}


async def eda_node(state: PipelineState) -> dict:
    """Run EDAPipeline."""
    try:
        summary = EDAPipeline().run(state["cleaned_df"], state["cleaning_report"])
        return {
            "eda_summary": numpy_to_python(summary.model_dump()),
            "current_stage": "eda",
        }
    except Exception as e:
        return {"error": f"EDA failed: {str(e)}", "current_stage": "eda"}


async def ml_node(state: PipelineState) -> dict:
    """Run AnomalyDetector + ClusteringPipeline."""
    try:
        cfg = state.get("pipeline_config", {})
        combined_df = pd.concat([state["cleaned_df"], state.get("internal_df", pd.DataFrame(index=state["cleaned_df"].index))], axis=1)
        
        anomaly_contamination = cfg.get("anomaly_contamination", 0.05)
        # Update AnomalyDetector to accept contamination if possible, or we could pass it if supported
        # We need to make sure AnomalyDetector.detect() accepts contamination
        anomaly = AnomalyDetector().detect(combined_df, contamination=anomaly_contamination)
        
        if cfg.get("skip_clustering"):
            cluster_report = {"skipped": True, "skip_reason": "Skipped per user preferences"}
        else:
            cluster = ClusteringPipeline().run(state["cleaned_df"])
            cluster_report = numpy_to_python(cluster.model_dump())
            
        return {
            "anomaly_report": numpy_to_python(anomaly.model_dump()) if hasattr(anomaly, 'model_dump') else anomaly,
            "cluster_report": cluster_report,
            "current_stage": "ml",
        }
    except Exception as e:
        return {"error": f"ML analysis failed: {str(e)}", "current_stage": "ml"}


async def viz_node(state: PipelineState) -> dict:
    """Generate visualization configs."""
    try:
        agent = VizAgent()
        charts = agent.generate(
            cleaned_df=state["cleaned_df"],
            internal_df=state.get("internal_df", pd.DataFrame(index=state["cleaned_df"].index)),
            eda_summary=state["eda_summary"],
            anomaly_report=state["anomaly_report"],
            cluster_report=state["cluster_report"],
            session_id=state["session_id"],
            supabase_client=upload_service.supabase,
            pipeline_config=state.get("pipeline_config", {}),
        )
        return {"visualizations": charts, "current_stage": "viz"}
    except Exception as e:
        logger.error(f"Visualization generation failed: {str(e)}", exc_info=True)
        return {"error": f"Visualization generation failed: {str(e)}", "current_stage": "viz"}


async def insight_node(state: PipelineState) -> dict:
    """Generate insights via LLM or template fallback."""
    try:
        llm = LLMClient()
        agent = InsightAgent(llm)
        insights = await agent.generate(
            session_id=state["session_id"],
            filename=state.get("filename", "dataset"),
            eda_summary=state["eda_summary"],
            anomaly_report=state["anomaly_report"],
            cluster_report=state["cluster_report"],
        )
        return {"insights": insights, "current_stage": "insights"}
    except Exception as e:
        logger.warning(f"Insight node error: {e}, using empty insights")
        return {"insights": [], "current_stage": "insights"}


async def forecast_node(state: PipelineState) -> dict:
    """Run ForecastingPipeline if time series detected."""
    try:
        cfg = state.get("pipeline_config", {})
        if cfg.get("skip_forecast"):
            return {
                "forecast_result": {"skipped": True, "skip_reason": "Skipped per user preferences"},
                "current_stage": "forecast"
            }
            
        ts = state["eda_summary"].get("time_series_detection", {})
        date_col = ts.get("date_col")
        target_col = ts.get("target_col")
        is_yearly = ts.get("is_yearly", False)

        if date_col and target_col:
            result = ForecastingPipeline().run(state["cleaned_df"], date_col, target_col, is_yearly)
            return {
                "forecast_result": numpy_to_python(result.model_dump()),
                "current_stage": "forecast",
            }
        return {"current_stage": "forecast"}
    except Exception as e:
        logger.warning(f"Forecast node error: {e}")
        return {"current_stage": "forecast"}


async def save_results_node(state: PipelineState) -> dict:
    """Mark pipeline as complete. Actual DB saving is done by pipeline_runner."""
    return {"current_stage": "done"}


async def error_node(state: PipelineState) -> dict:
    """Mark pipeline as failed."""
    logger.error(f"Pipeline error for session {state['session_id']}: {state.get('error')}")
    return {"current_stage": "failed"}


# ── Routing functions ───────────────────────────────────────────────────────

def check_error(state: PipelineState) -> str:
    """Route to error_node if error is set."""
    if state.get("error"):
        return "error_node"
    return "continue"


def should_forecast(state: PipelineState) -> str:
    """Route to forecast_node if time series detected."""
    if state.get("error"):
        return "error_node"
    ts = (state.get("eda_summary") or {}).get("time_series_detection", {})
    if ts.get("detected"):
        return "forecast_node"
    return "save_results_node"


# ── Graph builder ───────────────────────────────────────────────────────────

def build_graph():
    """Build and compile the LangGraph StateGraph."""
    graph = StateGraph(PipelineState)

    # Add nodes
    graph.add_node("load_data_node", load_data_node)
    graph.add_node("cleaning_node", cleaning_node)
    graph.add_node("eda_node", eda_node)
    graph.add_node("ml_node", ml_node)
    graph.add_node("viz_node", viz_node)
    graph.add_node("insight_node", insight_node)
    graph.add_node("forecast_node", forecast_node)
    graph.add_node("save_results_node", save_results_node)
    graph.add_node("error_node", error_node)

    # Set entry point
    graph.set_entry_point("load_data_node")

    # Add edges with error checking
    graph.add_conditional_edges("load_data_node", check_error, {
        "error_node": "error_node",
        "continue": "cleaning_node",
    })
    graph.add_conditional_edges("cleaning_node", check_error, {
        "error_node": "error_node",
        "continue": "eda_node",
    })
    graph.add_conditional_edges("eda_node", check_error, {
        "error_node": "error_node",
        "continue": "ml_node",
    })
    graph.add_conditional_edges("ml_node", check_error, {
        "error_node": "error_node",
        "continue": "viz_node",
    })
    graph.add_conditional_edges("viz_node", check_error, {
        "error_node": "error_node",
        "continue": "insight_node",
    })

    # insight_node → conditional: forecast or save
    graph.add_conditional_edges("insight_node", should_forecast, {
        "error_node": "error_node",
        "forecast_node": "forecast_node",
        "save_results_node": "save_results_node",
    })

    graph.add_edge("forecast_node", "save_results_node")
    graph.add_edge("save_results_node", END)
    graph.add_edge("error_node", END)

    return graph.compile()
