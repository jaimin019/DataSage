import pytest
import pandas as pd
from app.agents.state import PipelineState
from app.agents.viz_agent import VizAgent
from app.agents.insight_agent import InsightAgent
from app.agents.qa_agent import QAAgent
from app.llm.client import LLMClient
from app.core.exceptions import LLMError

@pytest.fixture
def sample_eda_summary():
    return {
        "row_count": 100,
        "col_count": 3,
        "column_types": {"age": "numeric", "fare": "numeric", "class": "categorical"},
        "numeric_stats": {
            "age": {"mean": 30.5, "std": 10.2, "min": 1, "max": 80, "skewness": 0.5},
            "fare": {"mean": 50.1, "std": 20.5, "min": 5, "max": 200, "skewness": 1.2}
        },
        "top_correlations": [
            {"col1": "age", "col2": "fare", "correlation": 0.45}
        ],
        "categorical_analysis": {
            "class": [{"value": "Third", "count": 55}, {"value": "First", "count": 25}]
        },
        "time_series_detection": {"detected": False}
    }

def test_viz_agent(sample_eda_summary):
    # Dummy data
    df = pd.DataFrame({
        "age": [20, 30, 40],
        "fare": [10.5, 20.5, 30.5],
        "class": ["Third", "First", "Third"]
    })
    anomaly_report = {"method_used": "skipped"}
    cluster_report = {"skipped": True}
    
    agent = VizAgent()
    charts = agent.generate(df, sample_eda_summary, anomaly_report, cluster_report)
    
    # We expect histograms for the numeric columns and a bar chart for categorical
    assert len(charts) > 0
    types = [c["type"] for c in charts]
    assert "histogram" in types
    assert "bar" in types

@pytest.mark.asyncio
async def test_qa_agent_fallback(sample_eda_summary):
    # Test QA agent fallback when LLM fails (we can simulate this by passing a broken client or just relying on the fact we have no API keys)
    client = LLMClient()
    agent = QAAgent(client)
    
    # Test PII rejection
    res = await agent.answer("session123", "What is the password?", sample_eda_summary)
    assert res["question_type"] == "pii_blocked"
    assert "I can only answer analytical questions" in res["answer"]
    
    # Test basic fallback calculation
    res = await agent.answer("session123", "What is the average age?", sample_eda_summary)
    assert "30.5" in res["answer"] # Should extract mean from stats

@pytest.mark.asyncio
async def test_insight_agent_fallback(sample_eda_summary):
    client = LLMClient()
    agent = InsightAgent(client)
    
    anomaly_report = {"method_used": "skipped", "total_anomalies": 0}
    cluster_report = {"skipped": True}
    
    insights = await agent.generate(
        "session123", "titanic.csv", sample_eda_summary, anomaly_report, cluster_report
    )
    
    assert len(insights) >= 3
    assert insights[0]["rank"] == 1
    assert "confidence" in insights[0]
