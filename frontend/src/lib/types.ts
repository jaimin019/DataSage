export interface ColumnInfo {
  name: string;
  dtype: string;
  null_count: number;
  null_pct: number;
  sample_values: unknown[];
}

export interface DatasetMetadata {
  filename: string;
  row_count: number;
  col_count: number;
  file_size_bytes: number;
  columns: ColumnInfo[];
  cleaned_filename: string;
}

export interface UploadResponse {
  session_id: string;
  status: string;
  message: string;
  dataset_info: DatasetMetadata;
}

export type PipelineStatus = "pending" | "cleaning" | "eda" | "viz" | "insights" | "forecast" | "done" | "failed";

export interface SessionStatusResponse {
  session_id: string;
  status: PipelineStatus;
  error_msg?: string;
  status_detail?: string;
  preferences_summary?: string;
  updated_at: string;
}

// Ensure compatibility with older code expecting SessionStatus
export type SessionStatus = SessionStatusResponse;

// ─── Chart Data Types ───────────────────────────────────────────

export interface ChartResponse {
  chart_id: string;
  type: string;
  title: string;
  description: string;
  image_url: string;
  sort_order: number;
}

// ─── Legacy Chart Types (kept for backward compat with old chart components) ──

/** @deprecated Use ChartResponse + Plotly PNGs instead */
export interface ChartConfig {
  x_key?: string;
  y_key?: string;
  color?: string;
  color_key?: string;
  orientation?: "horizontal" | "vertical";
  x_label?: string;
  y_label?: string;
  columns?: string[];
  k?: number;
  xLabel?: string;
  yLabel?: string;
}

/** @deprecated */
export interface HistogramBin { bin_label: string; bin_start: number; bin_end: number; count: number; }
/** @deprecated */
export interface BarDataPoint { label: string; count: number; pct: number; }
/** @deprecated */
export interface ScatterDataPoint { x: number; y: number; color_group: string; }
/** @deprecated */
export interface AnomalyScatterPoint { x: number; y: number; is_anomaly: boolean; }
/** @deprecated */
export interface GroupedBarPoint { category: string; mean: number; median: number; count: number; }
/** @deprecated */
export interface HeatmapPoint { x: string; y: string; value: number; }
/** @deprecated */
export interface LineDataPoint { [key: string]: number | string; }
/** @deprecated */
export interface ClusterPoint { x: number; y: number; cluster: number; }

// ─── Insights ───────────────────────────────────────────────────

export interface Insight {
  rank: number;
  category: "trend" | "correlation" | "anomaly" | "distribution" | "recommendation";
  title: string;
  body: string;
  supporting_columns: string[];
}

export interface InsightsResponse {
  session_id: string;
  insights: Insight[];
}

// ─── Visualizations ─────────────────────────────────────────────

export interface VisualizationsResponse {
  session_id: string;
  charts: ChartResponse[];
}

// ─── Forecast ───────────────────────────────────────────────────

export interface ForecastPoint {
  ds: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
}

export interface ForecastResponse {
  skipped: boolean;
  skip_reason?: string;
  date_col?: string;
  target_col?: string;
  trend_direction?: string;
  trend_pct_change?: number;
  is_yearly?: boolean;
  historical_data?: { ds: string; y: number }[];
  forecast_data?: ForecastPoint[];
  metrics?: { mae: number; rmse: number; mape?: number };
  llm_interpretation?: string;
}

// ─── Chat / Q&A ─────────────────────────────────────────────────

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  question_type?: string;
}

export interface QARequest {
  question: string;
}

export interface QAResponse {
  answer: string;
  question_type: string;
  conversation_id: string;
}

// ─── Analysis Summary ───────────────────────────────────────────

export interface AnalysisSummary {
  row_count: number;
  col_count: number;
  anomaly_count: number;
  anomaly_pct: number;
  cluster_count: number;
  top_correlations: { col1: string; col2: string; correlation: number }[];
  suggested_questions?: string[];
}
