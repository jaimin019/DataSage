"""
Insight agent — generates business insights using LLM with template fallback.
"""

import json
import logging
from typing import List, Optional
from pydantic import BaseModel, field_validator
from app.llm.client import LLMClient
from app.llm.prompts import (
    INSIGHT_SYSTEM_PROMPT,
    INSIGHT_USER_PROMPT,
    INSIGHT_RETRY_PROMPT,
)
from app.core.exceptions import LLMError

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {"trend", "correlation", "anomaly", "distribution", "recommendation"}


class InsightItem(BaseModel):
    rank: int
    category: str
    title: str
    body: str
    confidence: Optional[float] = None
    supporting_columns: list

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        if v not in VALID_CATEGORIES:
            return "distribution"
        return v

    @field_validator("confidence")
    @classmethod
    def cap_confidence(cls, v):
        if v is None:
            return None
        return min(max(float(v), 0.0), 0.95)

    @field_validator("rank")
    @classmethod
    def validate_rank(cls, v):
        return max(1, min(int(v), 5))


class InsightAgent:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def generate(
        self,
        session_id: str,
        filename: str,
        eda_summary: dict,
        anomaly_report: dict,
        cluster_report: dict,
    ) -> list:
        """
        Generate insights via LLM with validation, retry, and template fallback.
        """
        column_list = list(eda_summary.get("column_types", {}).keys())

        # Build context
        stats_summary = self._format_stats(eda_summary)
        top_correlations = self._format_correlations(eda_summary)
        anomaly_summary = self._format_anomaly(anomaly_report)
        cluster_summary = self._format_clusters(cluster_report)

        # Truncate context to 1500 tokens
        context = f"{stats_summary}\n{top_correlations}\n{anomaly_summary}\n{cluster_summary}"
        context = self.llm._truncate_to_token_budget(context, 1500)

        user_prompt = INSIGHT_USER_PROMPT.format(
            filename=filename,
            row_count=eda_summary.get("row_count", 0),
            col_count=eda_summary.get("col_count", 0),
            column_list=", ".join(column_list),
            stats_summary=stats_summary,
            top_correlations=top_correlations,
            anomaly_summary=anomaly_summary,
            cluster_summary=cluster_summary,
        )

        # Attempt 1
        try:
            response = await self.llm.complete(
                INSIGHT_SYSTEM_PROMPT,
                user_prompt,
                expect_json=True,
                temperature=0.4,
                max_tokens=800,
            )
            insights = self._parse_and_validate(response, column_list)
            if insights:
                insights = self._enforce_constraints(insights)
                logger.info(f"Generated {len(insights)} LLM insights for session {session_id}")
                return insights
        except (LLMError, Exception) as e:
            logger.warning(f"Insight generation attempt 1 failed: {e}")

        # Attempt 2 with stricter prompt
        try:
            response = await self.llm.complete(
                INSIGHT_RETRY_PROMPT,
                user_prompt,
                expect_json=True,
                temperature=0.2,
                max_tokens=800,
            )
            insights = self._parse_and_validate(response, column_list)
            if insights:
                insights = self._enforce_constraints(insights)
                logger.info(f"Generated {len(insights)} LLM insights on retry for session {session_id}")
                return insights
        except (LLMError, Exception) as e:
            logger.warning(f"Insight generation attempt 2 failed: {e}")

        # Fallback to templates
        logger.info(f"Using template fallback insights for session {session_id}")
        return self._template_fallback(eda_summary, anomaly_report, cluster_report)

    def _parse_and_validate(self, response: str, column_list: list) -> list:
        """Parse JSON response and validate each insight."""
        try:
            raw = json.loads(response)
        except json.JSONDecodeError:
            return []

        if not isinstance(raw, list):
            return []

        validated = []
        for item in raw[:5]:
            try:
                insight = InsightItem(**item)
                # Filter supporting_columns to only actual dataset columns
                insight.supporting_columns = [
                    c for c in insight.supporting_columns if c in column_list
                ]
                validated.append(insight.model_dump())
            except Exception:
                continue

        return validated if len(validated) >= 3 else []

    def _enforce_constraints(self, insights: list) -> list:
        for insight in insights:
            if len(insight.get('title', '')) > 80:
                insight['title'] = insight['title'][:77] + '...'
            insight.pop('confidence', None)  # Remove if LLM added it anyway
        return insights

    def _template_fallback(
        self, eda_summary: dict, anomaly_report: dict, cluster_report: dict
    ) -> list:
        """Generate basic insights from EDA stats without LLM."""
        insights = []
        rank = 0

        # Insight 1: Highest correlation pair
        top_corr = eda_summary.get("top_correlations", [])
        if top_corr:
            c = top_corr[0]
            rank += 1
            insights.append(
                {
                    "rank": rank,
                    "category": "correlation",
                    "title": f"Strong correlation: {c['col1']} & {c['col2']}",
                    "body": f"The columns {c['col1']} and {c['col2']} have a Pearson correlation of {c['correlation']:.3f}, indicating a {'strong positive' if c['correlation'] > 0 else 'strong negative'} linear relationship.",
                    "confidence": 0.90,
                    "supporting_columns": [c["col1"], c["col2"]],
                }
            )

        # Insight 2: Anomaly summary
        if anomaly_report.get("total_anomalies", 0) > 0:
            rank += 1
            insights.append(
                {
                    "rank": rank,
                    "category": "anomaly",
                    "title": f"{anomaly_report['total_anomalies']} anomalies detected",
                    "body": f"The anomaly detector ({anomaly_report.get('method_used', 'unknown')}) flagged {anomaly_report['total_anomalies']} rows ({anomaly_report.get('anomaly_pct', 0):.1f}% of data) as potential anomalies.",
                    "confidence": 0.80,
                    "supporting_columns": list(
                        anomaly_report.get("column_anomaly_counts", {}).keys()
                    )[:3],
                }
            )

        # Insight 3: Most skewed column
        numeric_stats = eda_summary.get("numeric_stats", {})
        skew_cols = [
            (col, abs(stats.get("skewness", 0) or 0))
            for col, stats in numeric_stats.items()
            if stats.get("skewness") is not None
        ]
        skew_cols.sort(key=lambda x: x[1], reverse=True)
        if skew_cols:
            col, skew = skew_cols[0]
            rank += 1
            s = numeric_stats[col]
            insights.append(
                {
                    "rank": rank,
                    "category": "distribution",
                    "title": f"{col} has high skewness ({skew:.2f})",
                    "body": f"The column {col} has a skewness of {s.get('skewness', 0):.2f} with mean={s.get('mean', 0):.2f} and std={s.get('std', 0):.2f}. This suggests a non-normal distribution that may benefit from log transformation.",
                    "confidence": 0.85,
                    "supporting_columns": [col],
                }
            )

        # Ensure at least 3 insights
        if len(insights) < 3 and numeric_stats:
            for col, stats in list(numeric_stats.items())[:3 - len(insights)]:
                rank += 1
                insights.append(
                    {
                        "rank": rank,
                        "category": "distribution",
                        "title": f"Statistics for {col}",
                        "body": f"{col} ranges from {stats.get('min', 0):.2f} to {stats.get('max', 0):.2f} with a mean of {stats.get('mean', 0):.2f} and standard deviation of {stats.get('std', 0):.2f}.",
                        "confidence": 0.90,
                        "supporting_columns": [col],
                    }
                )

        return insights[:5]

    @staticmethod
    def _format_stats(eda_summary: dict) -> str:
        lines = []
        for col, stats in list(eda_summary.get("numeric_stats", {}).items())[:5]:
            lines.append(
                f"- {col}: mean={stats.get('mean', 'N/A')}, std={stats.get('std', 'N/A')}, "
                f"skew={stats.get('skewness', 'N/A')}"
            )
        return "\n".join(lines) if lines else "No numeric statistics available."

    @staticmethod
    def _format_correlations(eda_summary: dict) -> str:
        lines = []
        for c in eda_summary.get("top_correlations", [])[:5]:
            lines.append(f"- {c['col1']} ↔ {c['col2']}: {c['correlation']:.3f}")
        return "\n".join(lines) if lines else "No correlations computed."

    @staticmethod
    def _format_anomaly(anomaly_report: dict) -> str:
        if anomaly_report.get("method_used") == "skipped":
            return "Anomaly detection was skipped."
        return (
            f"Method: {anomaly_report.get('method_used', 'N/A')}, "
            f"Total anomalies: {anomaly_report.get('total_anomalies', 0)} "
            f"({anomaly_report.get('anomaly_pct', 0):.1f}%)"
        )

    @staticmethod
    def _format_clusters(cluster_report: dict) -> str:
        if cluster_report.get("skipped"):
            return "Clustering was skipped."
        return (
            f"Optimal clusters: k={cluster_report.get('k', 'N/A')}, "
            f"Silhouette score: {cluster_report.get('silhouette_score', 'N/A')}, "
            f"Sizes: {cluster_report.get('cluster_sizes', {})}"
        )
