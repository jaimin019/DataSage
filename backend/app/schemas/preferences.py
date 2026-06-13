from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from enum import Enum

class AnalysisGoal(str, Enum):
    EXPLORE           = "explore"
    PREPARE_ML        = "prepare_ml"
    DETECT_ANOMALIES  = "detect_anomalies"
    FORECAST          = "forecast"
    QUICK_OVERVIEW    = "quick_overview"

class AnalysisDepth(str, Enum):
    QUICK    = "quick"
    STANDARD = "standard"
    DEEP     = "deep"

class FocusArea(str, Enum):
    DATA_QUALITY  = "data_quality"
    DISTRIBUTIONS = "distributions"
    CORRELATIONS  = "correlations"
    ANOMALIES     = "anomalies"
    CLUSTERING    = "clustering"
    FORECASTING   = "forecasting"

class OutlierHandling(str, Enum):
    FLAG_ONLY      = "flag_only"
    REMOVE_EXTREME = "remove_extreme"

class UserPreferences(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    goal:             AnalysisGoal    = AnalysisGoal.EXPLORE
    target_column:    Optional[str]   = None
    depth:            AnalysisDepth   = AnalysisDepth.STANDARD
    focus_areas:      List[FocusArea] = []
    outlier_handling: OutlierHandling = OutlierHandling.FLAG_ONLY

    def to_pipeline_config(self) -> dict:
        """Convert preferences to concrete pipeline control flags."""
        cfg = {
            'max_charts':          10,
            'max_insights':        5,
            'skip_clustering':     False,
            'skip_forecast':       False,
            'anomaly_contamination': 0.05,
            'primary_column':      self.target_column,
            'remove_outliers_threshold': None,
        }

        # Depth overrides
        if self.depth == AnalysisDepth.QUICK:
            cfg.update(max_charts=4, max_insights=3, skip_clustering=True)
        elif self.depth == AnalysisDepth.DEEP:
            cfg.update(max_charts=16, max_insights=7)

        # Goal overrides
        if self.goal == AnalysisGoal.QUICK_OVERVIEW:
            cfg.update(max_charts=3, max_insights=3, skip_clustering=True)
        elif self.goal == AnalysisGoal.DETECT_ANOMALIES:
            cfg['anomaly_contamination'] = 0.10  # more sensitive
        elif self.goal == AnalysisGoal.FORECAST:
            cfg['prioritize_forecast'] = True

        # Focus area overrides (only when user made explicit selections)
        if self.focus_areas:
            if FocusArea.CLUSTERING  not in self.focus_areas: cfg['skip_clustering'] = True
            if FocusArea.FORECASTING not in self.focus_areas: cfg['skip_forecast']   = True

        # Outlier handling
        if self.outlier_handling == OutlierHandling.REMOVE_EXTREME:
            cfg['remove_outliers_threshold'] = 3.0

        return cfg

    def to_summary(self) -> str:
        """Human-readable one-liner for dashboard display."""
        parts = []
        goal_labels = {
            'explore':          'Explore patterns',
            'prepare_ml':       'ML preparation',
            'detect_anomalies': 'Anomaly focus',
            'forecast':         'Forecast focus',
            'quick_overview':   'Quick overview',
        }
        parts.append(goal_labels.get(self.goal.value, self.goal.value))
        parts.append({'quick': 'Quick', 'standard': 'Standard',
                      'deep': 'Deep'}[self.depth.value])
        if self.target_column:
            parts.append(f'{self.target_column} column')
        return ' · '.join(parts)
