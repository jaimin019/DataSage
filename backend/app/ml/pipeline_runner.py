import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories import session_repository
from app.db.models import Analysis, Forecast, Visualization, Insight
from app.agents.orchestrator import build_graph
from app.agents.state import PipelineState

logger = logging.getLogger(__name__)

class PipelineRunner:
    """
    Orchestrates all ML stages using LangGraph.
    Called by FastAPI BackgroundTasks.
    """
    
    def __init__(self):
        self.graph = build_graph()

    async def run(self, session_id: str, file_path: str, db: AsyncSession, preferences: dict = None):
        try:
            prefs = preferences or {}
            from app.schemas.preferences import UserPreferences
            user_prefs = UserPreferences(**prefs)
            
            initial_state: PipelineState = {
                "session_id": session_id,
                "file_path": file_path,
                "filename": "",
                "preferences": user_prefs.model_dump(),
                "pipeline_config": user_prefs.to_pipeline_config(),
                "raw_df": None,
                "cleaned_df": None,
                "cleaning_report": None,
                "eda_summary": None,
                "anomaly_report": None,
                "cluster_report": None,
                "visualizations": None,
                "insights": None,
                "forecast_result": None,
                "error": None,
                "current_stage": "starting"
            }
            
            # Run the graph
            # Since the graph might update the state asynchronously, we iterate through the steps
            async for s in self.graph.astream(initial_state):
                # The state format is {node_name: {state_updates}}
                for node_name, state_update in s.items():
                    if "current_stage" in state_update:
                        stage = state_update["current_stage"]
                        if stage not in ["done", "failed"]:
                            detail = None
                            if node_name == "load_data_node" and "raw_df" in state_update:
                                stage = "cleaning"
                                detail = f"Cleaning {len(state_update['raw_df']):,} rows..."
                            elif node_name == "cleaning_node" and "cleaned_df" in state_update:
                                stage = "eda"
                                from app.ml.utils import classify_size, get_analysis_sample
                                analysis_df = get_analysis_sample(state_update['cleaned_df'], classify_size(state_update['cleaned_df']))
                                detail = f"Statistical analysis on {len(analysis_df):,} rows..."
                            elif node_name == "eda_node":
                                stage = "viz"
                                detail = "Detecting anomalies and clusters..."
                            elif node_name == "viz_node":
                                stage = "insights"
                                detail = "Generating AI insights..."
                                
                            await session_repository.update_status(db, session_id, stage, detail=detail)
                           
            # Get the final state to save results
            final_state = await self.graph.ainvoke(initial_state)

            if final_state.get("error"):
                raise Exception(final_state["error"])

            # Upload cleaned dataframe
            if final_state.get("cleaned_df") is not None:
                from app.services.upload_service import supabase
                from app.core.config import settings
                from sqlalchemy.future import select
                from app.db.models import Dataset
                
                ds_res = await db.execute(select(Dataset).where(Dataset.session_id == session_id))
                dataset = ds_res.scalars().first()
                
                if dataset and dataset.cleaned_filename:
                    storage_path = f"{session_id}/cleaned/{dataset.cleaned_filename}"
                    
                    try:
                        internal_prefixes = ('is_outlier_', 'is_anomaly', '_datasage_')
                        assert not any(
                            col.startswith(prefix)
                            for col in final_state["cleaned_df"].columns
                            for prefix in internal_prefixes
                        ), f"Internal columns found in export DataFrame: {final_state['cleaned_df'].columns.tolist()}"
                        
                        cleaned_csv = final_state["cleaned_df"].to_csv(index=False).encode('utf-8')
                        
                        supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
                            file=cleaned_csv,
                            path=storage_path,
                            file_options={"content-type": "text/csv"}
                        )
                        
                        dataset.cleaned_path = storage_path
                    except Exception as e:
                        logger.error(f"Failed to upload cleaned CSV: {str(e)}")

            # Generate Suggested Questions
            from app.agents.qa_agent import QAAgent
            qa_agent = QAAgent(None)
            suggested_questions = qa_agent.generate_suggested_questions(
                filename=final_state.get("filename", ""),
                eda_summary=final_state.get("eda_summary", {}) or {},
                anomaly_report=final_state.get("anomaly_report", {}) or {},
                cluster_report=final_state.get("cluster_report", {}) or {},
                forecast_result=final_state.get("forecast_result")
            )

            # Save Analysis Results
            analyses = []
            if final_state.get("cleaning_report"):
                analyses.append(Analysis(session_id=session_id, analysis_type="cleaning_report", results=final_state["cleaning_report"], suggested_questions=suggested_questions))
            if final_state.get("eda_summary"):
                analyses.append(Analysis(session_id=session_id, analysis_type="eda_summary", results=final_state["eda_summary"], suggested_questions=suggested_questions))
            if final_state.get("anomaly_report"):
                analyses.append(Analysis(session_id=session_id, analysis_type="anomaly_results", results=final_state["anomaly_report"], suggested_questions=suggested_questions))
            if final_state.get("cluster_report"):
                analyses.append(Analysis(session_id=session_id, analysis_type="cluster_results", results=final_state["cluster_report"], suggested_questions=suggested_questions))
            
            if analyses:
                db.add_all(analyses)

            # Save Visualizations
            if final_state.get("visualizations"):
                vizs = []
                for v in final_state["visualizations"]:
                    vizs.append(Visualization(
                        session_id=session_id,
                        chart_id=v.get("chart_id"),
                        title=v.get("title"),
                        chart_type=v.get("type"),
                        data=v.get("data"),
                        config={"description": v.get("description", "")},
                        image_url=v.get("image_url"),
                        sort_order=v.get("sort_order", 0)
                    ))
                db.add_all(vizs)

            # Save Insights
            if final_state.get("insights"):
                insights = []
                for i in final_state["insights"]:
                    insights.append(Insight(
                        session_id=session_id,
                        content=i.get("body"),
                        importance="high" if i.get("rank", 5) <= 2 else "medium", # map rank to importance for now
                        rank=i.get("rank"),
                        category=i.get("category"),
                        supporting_columns=i.get("supporting_columns"),
                        confidence=i.get("confidence")
                    ))
                db.add_all(insights)

            # Save Forecast
            if final_state.get("forecast_result"):
                eda_summary = final_state.get("eda_summary", {})
                target_col = eda_summary.get("time_series_detection", {}).get("target_col", "unknown")
                db.add(Forecast(
                    session_id=session_id,
                    target_column=target_col,
                    forecast_data=final_state["forecast_result"]
                ))

            await db.commit()
            
            await session_repository.update_status(db, session_id, "done")
            
        except Exception as e:
            logger.error(f"Pipeline failed for session {session_id}: {str(e)}")
            try:
                await session_repository.update_status(db, session_id, "failed", str(e))
            except Exception as inner_e:
                logger.error(f"Failed to update session status to failed: {str(inner_e)}")

pipeline_runner = PipelineRunner()
