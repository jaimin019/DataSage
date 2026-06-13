"""
Q&A agent — answers questions about a dataset using LLM with full context.
"""

import logging
from app.llm.client import LLMClient
from app.llm.prompts import QA_SYSTEM_PROMPT, QA_USER_PROMPT
from app.core.exceptions import LLMError

logger = logging.getLogger(__name__)

# PII keywords that trigger guardrail
PII_KEYWORDS = {
    "password", "passwords", "email", "emails", "ssn",
    "social security", "credit card", "credit cards",
    "phone number", "address", "bank account",
}

PII_RESPONSE = "I can only answer analytical questions about dataset patterns."

class QAAgent:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def answer(
        self,
        session_id: str,
        question: str,
        eda_summary: dict,
        anomaly_report: dict | None = None,
        cluster_report: dict | None = None,
        forecast_result: dict | None = None,
        cleaning_report: dict | None = None,
        filename: str = "dataset",
    ) -> dict:
        """
        Answer a question about the dataset using the full pipeline context.
        """
        # PII guardrail
        q_lower = question.lower()
        for kw in PII_KEYWORDS:
            if kw in q_lower:
                return {
                    "answer": PII_RESPONSE,
                    "question_type": "pii_blocked",
                    "supporting_columns": [],
                }

        # Build comprehensive context
        context = self._build_full_context(
            eda_summary=eda_summary,
            anomaly_report=anomaly_report or {},
            cluster_report=cluster_report or {},
            forecast_result=forecast_result,
            cleaning_report=cleaning_report or {},
            filename=filename
        )
        
        # Truncate to fit budget
        context = self.llm._truncate_to_token_budget(context, 3000)

        # Call LLM
        user_prompt = QA_USER_PROMPT.format(
            filename=filename,
            row_count=eda_summary.get("row_count", 0),
            col_count=eda_summary.get("col_count", 0),
            retrieved_context=context,
            question=question,
        )

        try:
            answer = await self.llm.complete(
                QA_SYSTEM_PROMPT,
                user_prompt,
                temperature=0.1,
                max_tokens=200,
            )
        except LLMError:
            answer = self._fallback_answer(question, eda_summary)

        # Identify supporting columns
        col_list = list(eda_summary.get("column_types", {}).keys())
        supporting = [c for c in col_list if c.lower() in answer.lower()]

        return {
            "answer": answer.strip(),
            "question_type": "analytical",
            "supporting_columns": supporting,
        }

    def generate_suggested_questions(
        self,
        filename: str,
        eda_summary: dict,
        anomaly_report: dict,
        cluster_report: dict,
        forecast_result: dict | None
    ) -> list[str]:
        """
        Generates 5 dataset-specific suggested questions.
        Uses ONLY data from the analysis — no LLM call needed here.
        Returns a list of 5 question strings.
        """
        questions = []
        col_types = eda_summary.get('column_types', {})
        numeric_cols = [c for c, t in col_types.items()
                        if t == 'numeric' and not c.startswith('is_outlier_')]
        categorical_cols = [c for c, t in col_types.items() if t == 'categorical']
        top_correlations = eda_summary.get('top_correlations', [])
        anomaly_count = anomaly_report.get('total_anomalies', 0)
        outlier_info = anomaly_report.get('column_anomaly_counts', {})
        
        # Question 1: About the most important numeric column (first numeric col)
        if numeric_cols:
            primary_col = numeric_cols[0]
            stats = eda_summary.get('numeric_stats', {}).get(primary_col, {})
            if stats:
                questions.append(
                    f"What is the distribution and average of {primary_col.replace('_', ' ')}?"
                )
            else:
                questions.append(f"What are the key statistics for {primary_col.replace('_', ' ')}?")
        
        # Question 2: About the top correlation pair (if exists)
        if top_correlations and len(top_correlations) > 0:
            c1 = top_correlations[0]['col1'].replace('_', ' ')
            c2 = top_correlations[0]['col2'].replace('_', ' ')
            coeff = top_correlations[0]['correlation']
            direction = "positively" if coeff > 0 else "negatively"
            questions.append(
                f"How strongly are {c1} and {c2} {direction} correlated?"
            )
        elif len(numeric_cols) >= 2:
            questions.append(
                f"What is the relationship between {numeric_cols[0].replace('_', ' ')} "
                f"and {numeric_cols[1].replace('_', ' ')}?"
            )
        
        # Question 3: About the primary categorical column (if exists)
        if categorical_cols:
            top_cat = categorical_cols[0].replace('_', ' ')
            questions.append(
                f"Which {top_cat} appears most frequently in this dataset?"
            )
        elif len(numeric_cols) >= 2:
            questions.append(
                f"Which rows have the highest {numeric_cols[0].replace('_', ' ')} values?"
            )
        
        # Question 4: About anomalies (specific to what was found)
        if anomaly_count > 0 and outlier_info:
            most_anomalous_col = max(outlier_info, key=outlier_info.get)
            questions.append(
                f"What anomalies were found in {most_anomalous_col.replace('_', ' ')}? "
                f"How many rows are affected?"
            )
        else:
            questions.append("Were any anomalies or outliers detected in this dataset?")
        
        # Question 5: About forecast or a second numeric column
        if forecast_result and not forecast_result.get('skipped'):
            target = forecast_result.get('target_col', '').replace('_', ' ')
            questions.append(f"What does the forecast predict for {target} over the next period?")
        elif len(numeric_cols) >= 2:
            col2 = numeric_cols[1].replace('_', ' ')
            questions.append(
                f"What is the average {col2} and how does it vary across the dataset?"
            )
        else:
            questions.append("What are the most important patterns in this dataset?")
        
        return questions[:5]

    def _build_full_context(
        self,
        eda_summary: dict,
        anomaly_report: dict,
        cluster_report: dict,
        forecast_result: dict | None,
        cleaning_report: dict,
        filename: str
    ) -> str:
        """Build a comprehensive context string covering ALL analysis results."""
        parts = []
        
        # Dataset Overview
        row_count = eda_summary.get("row_count", 0)
        col_count = eda_summary.get("col_count", 0)
        cols = list(eda_summary.get("column_types", {}).keys())
        parts.append(f"=== DATASET OVERVIEW ===\nFile: {filename}\nRows: {row_count} | Columns: {col_count}\nColumns: {', '.join(cols)}\n")

        # Data Cleaning Results
        parts.append("=== DATA CLEANING RESULTS ===")
        parts.append(f"- Duplicates removed: {cleaning_report.get('duplicates_removed', 0)}")
        
        numeric_conversions = []
        imputations = []
        for action in cleaning_report.get('missing_value_actions', []):
            if action.get('action') == 'converted_to_numeric':
                numeric_conversions.append(action.get('column'))
            elif 'imputation' in action.get('action', ''):
                imputations.append(f"{action.get('column')} ({action.get('action')}: {action.get('value')})")
        
        parts.append(f"- Columns converted to numeric: {', '.join(numeric_conversions) if numeric_conversions else 'None'}")
        parts.append(f"- Null values imputed: {', '.join(imputations) if imputations else 'None'}")
        
        outliers = []
        for out in cleaning_report.get('outlier_flags_added', []):
            outliers.append(f"{out.get('column')} ({out.get('outlier_count')} outliers bounds: {out.get('lower_bound')} to {out.get('upper_bound')})")
        parts.append(f"- Outlier columns flagged: {', '.join(outliers) if outliers else 'None'}")
        
        issues = cleaning_report.get('strategies_summary', [])
        parts.append(f"- Issues found: {', '.join(issues) if issues else 'None'}\n")

        # Column Statistics
        parts.append("=== COLUMN STATISTICS ===")
        numeric_stats = eda_summary.get("numeric_stats", {})
        for col, s in numeric_stats.items():
            parts.append(f"{col}: min={s.get('min')}, max={s.get('max')}, mean={s.get('mean')}, median={s.get('median')}, std={s.get('std')}, skewness={s.get('skewness')}")
        
        cat_stats = eda_summary.get("categorical_analysis", {})
        for col, vals in cat_stats.items():
            top_vals = ", ".join(f"{v['value']}({v['count']})" for v in vals[:5])
            parts.append(f"{col} top values: {top_vals}")
        parts.append("")
        
        # Top Correlations
        parts.append("=== TOP CORRELATIONS ===")
        corr = eda_summary.get("top_correlations", [])
        if corr:
            for c in corr:
                direction = "positive" if c['correlation'] > 0 else "negative"
                parts.append(f"{c['col1']} ↔ {c['col2']}: {c['correlation']:.3f} ({direction})")
        else:
            parts.append("No significant numeric correlations found.")
        parts.append("")

        # Anomaly Detection
        parts.append("=== ANOMALY DETECTION ===")
        if anomaly_report.get("skipped"):
            parts.append(f"Anomaly Detection: skipped - {anomaly_report.get('skip_reason', 'unknown')}")
        else:
            parts.append("Method: IsolationForest + IQR per column")
            parts.append(f"Total anomalies flagged: {anomaly_report.get('total_anomalies', 0)} ({anomaly_report.get('anomaly_pct', 0):.1f}% of rows)")
            parts.append("Per-column outlier details:")
            for out in cleaning_report.get('outlier_flags_added', []):
                parts.append(f"{out.get('column')}: {out.get('outlier_count')} outliers above {out.get('upper_bound')} or below {out.get('lower_bound')}")
        parts.append("")

        # Clustering
        parts.append("=== CLUSTERING ===")
        if cluster_report.get("skipped"):
            parts.append(f"Clustering: skipped — {cluster_report.get('skip_reason', 'unknown')}")
        else:
            parts.append(f"k={cluster_report.get('k')} clusters found. Sizes: {cluster_report.get('cluster_sizes')}. Silhouette score: {cluster_report.get('silhouette_score')}")
        parts.append("")

        # Forecast
        parts.append("=== FORECAST ===")
        if not forecast_result or forecast_result.get("skipped"):
            reason = forecast_result.get('skip_reason', 'unknown') if forecast_result else "No time series detected"
            parts.append(f"Forecasting: not applicable — {reason}")
        else:
            parts.append(f"Target metric: {forecast_result.get('target_col')}")
            parts.append(f"Trend: {forecast_result.get('trend_direction')} ({forecast_result.get('trend_pct_change', 0):.1f}% change)")
            metrics = forecast_result.get('metrics', {})
            parts.append(f"Model accuracy: MAE={metrics.get('mae')}")

        return "\n".join(parts)

    @staticmethod
    def _fallback_answer(question: str, eda_summary: dict) -> str:
        """Basic answer without LLM when API is unavailable."""
        q_lower = question.lower()
        stats = eda_summary.get("numeric_stats", {})

        for col, s in stats.items():
            if col.lower() in q_lower:
                if "average" in q_lower or "mean" in q_lower:
                    return f"The average {col} is {s.get('mean', 'N/A')}."
                if "max" in q_lower or "maximum" in q_lower or "highest" in q_lower:
                    return f"The maximum {col} is {s.get('max', 'N/A')}."
                if "min" in q_lower or "minimum" in q_lower or "lowest" in q_lower:
                    return f"The minimum {col} is {s.get('min', 'N/A')}."

        return (
            f"The dataset has {eda_summary.get('row_count', 'N/A')} rows and "
            f"{eda_summary.get('col_count', 'N/A')} columns. "
            f"I need an active LLM connection to provide a more detailed answer."
        )
