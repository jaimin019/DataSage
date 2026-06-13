import pandas as pd
import numpy as np
import logging
from pydantic import BaseModel
from typing import List, Dict, Optional
from app.ml.utils import numpy_to_python
import os
import sys
from contextlib import contextmanager

@contextmanager
def suppress_stdout_stderr():
    """A context manager that redirects stdout and stderr to devnull"""
    with open(os.devnull, 'w') as fnull:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        sys.stdout = fnull
        sys.stderr = fnull
        try:
            yield
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr

class ForecastMetrics(BaseModel):
    mae: float
    rmse: float
    mape: Optional[float] = None

class ForecastResult(BaseModel):
    skipped: bool = False
    skip_reason: Optional[str] = None
    date_col: Optional[str] = None
    target_col: Optional[str] = None
    model_used: Optional[str] = None
    horizon_days: int = 90
    historical_data: Optional[list] = None    # [{ds, y}] last 365 points max
    forecast_data: Optional[list] = None      # [{ds, yhat, yhat_lower, yhat_upper}]
    metrics: Optional[ForecastMetrics] = None
    trend_direction: Optional[str] = None     # "up" | "down" | "flat"
    trend_pct_change: Optional[float] = None

class ForecastingPipeline:
    def run(self, df: pd.DataFrame, date_col: str, target_col: str, is_yearly: bool = False) -> ForecastResult:
        result = ForecastResult(
            date_col=date_col,
            target_col=target_col,
            model_used="Prophet"
        )
        
        try:
            from prophet import Prophet
            from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error
        except ImportError as e:
            result.skipped = True
            result.skip_reason = f"Prophet library not installed: {str(e)}"
            return result
            
        try:
            # Step 1: Data preparation
            if is_yearly:
                prep_df = df.groupby(date_col)[target_col].mean().reset_index()
                prep_df.columns = ['ds', 'y']
                prep_df['ds'] = pd.to_datetime(prep_df['ds'].astype(str), format='%Y')
                prep_df = prep_df.dropna().sort_values('ds')
                
                if len(prep_df) < 5:
                    result.skipped = True
                    result.skip_reason = f"Insufficient data: need >= 5 years for forecasting"
                    return result
            else:
                prep_df = df[[date_col, target_col]].copy()
                prep_df.columns = ['ds', 'y']
                prep_df['ds'] = pd.to_datetime(prep_df['ds'], errors='coerce')
                prep_df = prep_df.dropna().sort_values('ds')
                
                if len(prep_df) < 10:
                    result.skipped = True
                    result.skip_reason = "Insufficient data: need >= 10 rows for forecasting"
                    return result
                
            if prep_df['y'].nunique() <= 1:
                result.skip_reason = "Target column has zero variance (all same values)"
                
            if (prep_df['y'] < 0).any():
                if result.skip_reason is None:
                    result.skip_reason = "Note: Target column contains negative values."
                else:
                    result.skip_reason += " Note: Target column contains negative values."
                    
            # Step 2: Walk-forward validation
            split_idx = int(len(prep_df) * 0.8)
            train_df = prep_df.iloc[:split_idx]
            test_df = prep_df.iloc[split_idx:]
            
            if len(test_df) >= 2:
                with suppress_stdout_stderr():
                    val_model = Prophet(
                        yearly_seasonality=False if is_yearly else 'auto',
                        weekly_seasonality=False if is_yearly else 'auto',
                        daily_seasonality=False,
                        changepoint_prior_scale=0.05
                    )
                    val_model.fit(train_df)
                    future_val = val_model.make_future_dataframe(periods=len(test_df))
                    forecast_val = val_model.predict(future_val)
                    
                    predictions = forecast_val.iloc[-len(test_df):]['yhat'].values
                    actuals = test_df['y'].values
                    
                    mae = float(mean_absolute_error(actuals, predictions))
                    rmse = float(np.sqrt(mean_squared_error(actuals, predictions)))
                    
                    if (actuals == 0).any():
                        mape = None
                    else:
                        mape = float(mean_absolute_percentage_error(actuals, predictions))
                        
                    result.metrics = ForecastMetrics(mae=mae, rmse=rmse, mape=mape)
            
            # Step 3: Refit on full data
            with suppress_stdout_stderr():
                model = Prophet(
                    yearly_seasonality=False if is_yearly else 'auto',
                    weekly_seasonality=False if is_yearly else 'auto',
                    daily_seasonality=False,
                    changepoint_prior_scale=0.05
                )
                model.fit(prep_df)
                
                # Step 4: Generate forecast
                horizon = 5 if is_yearly else 90
                freq = 'Y' if is_yearly else 'D'
                future = model.make_future_dataframe(periods=horizon, freq=freq)
                forecast = model.predict(future)
                
            # Formatting results
            future_forecast = forecast.iloc[-horizon:]
            
            forecast_list = []
            for _, row in future_forecast.iterrows():
                ds_val = str(row['ds'].year) if is_yearly else row['ds'].isoformat()
                forecast_list.append({
                    "ds": ds_val,
                    "yhat": float(row['yhat']),
                    "yhat_lower": float(row['yhat_lower']),
                    "yhat_upper": float(row['yhat_upper'])
                })
            result.forecast_data = numpy_to_python(forecast_list)
            
            # Step 6: Limit historical data
            hist_limit = prep_df.iloc[-365:]
            hist_list = []
            for _, row in hist_limit.iterrows():
                ds_val = str(row['ds'].year) if is_yearly else row['ds'].isoformat()
                hist_list.append({
                    "ds": ds_val,
                    "y": float(row['y'])
                })
            result.historical_data = numpy_to_python(hist_list)
            
            # Step 5: Trend analysis
            if len(hist_list) > 0 and len(forecast_list) > 0:
                hist_end = hist_list[-1]['y']
                forecast_end = forecast_list[-1]['yhat']
                
                if hist_end != 0:
                    pct_change = ((forecast_end - hist_end) / hist_end) * 100
                    result.trend_pct_change = float(pct_change)
                    
                    if pct_change > 2:
                        result.trend_direction = "up"
                    elif pct_change < -2:
                        result.trend_direction = "down"
                    else:
                        result.trend_direction = "flat"
                else:
                    result.trend_direction = "flat"
                    result.trend_pct_change = 0.0

        except Exception as e:
            result.skipped = True
            result.skip_reason = f"Prophet error: {str(e)}"
            
        return result
