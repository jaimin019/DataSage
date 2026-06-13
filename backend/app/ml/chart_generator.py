import pandas as pd
import numpy as np
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

CHART_COLORS = {
    'primary':   '#6366f1',
    'secondary': '#10b981',
    'accent':    '#f59e0b',
    'danger':    '#ef4444',
    'purple':    '#8b5cf6',
    'cyan':      '#06b6d4',
    'lime':      '#84cc16',
    'orange':    '#f97316',
}
COLOR_SEQUENCE = list(CHART_COLORS.values())
DARK_TEMPLATE  = 'plotly_dark'
CHART_WIDTH    = 900
CHART_HEIGHT   = 480
CHART_SCALE    = 2        # retina quality

class ChartGenerator:
    """
    Generates charts as Plotly PNG images, uploads to Supabase Storage,
    and returns metadata dicts for saving to the visualizations table.
    """

    def __init__(self, supabase_client, session_id: str):
        self.supabase   = supabase_client
        self.session_id = session_id

    def generate_all(
        self,
        cleaned_df: pd.DataFrame,
        internal_df: pd.DataFrame,
        eda_summary: dict,
        anomaly_report: dict,
        cluster_report: dict,
        pipeline_config: dict,
    ) -> list[dict]:
        """
        Generates all applicable charts and returns list of metadata dicts.
        Each dict contains: chart_id, type, title, description, image_url, sort_order
        """
        col_types       = eda_summary.get('column_types', {})
        numeric_cols    = [c for c, t in col_types.items()
                           if t == 'numeric' and not c.startswith('is_outlier_')]
        categorical_cols = [c for c, t in col_types.items() if t == 'categorical']
        top_corrs       = eda_summary.get('top_correlations', [])
        year_cols       = eda_summary.get('time_series_detection', {}).get('date_col')
        year_cols       = [year_cols] if year_cols else []
        max_charts      = pipeline_config.get('max_charts', 10)

        results = []
        order   = 0

        def add(chart: dict | None):
            nonlocal order
            if chart and len(results) < max_charts:
                chart['sort_order'] = order
                results.append(chart)
                order += 1

        # Distribution: histogram + box for top 4 numeric cols
        for i, col in enumerate(numeric_cols[:4]):
            add(self._distribution(cleaned_df, col, i))

        # Categorical: bar chart for top 3 categorical cols
        for i, col in enumerate(categorical_cols[:3]):
            add(self._categorical_bar(cleaned_df, col, i))

        # Correlation heatmap (≥3 numeric cols required)
        if len(numeric_cols) >= 3:
            add(self._correlation_heatmap(cleaned_df, numeric_cols))

        # Scatter: strongest correlation pair
        if top_corrs:
            add(self._scatter(cleaned_df, top_corrs[0], categorical_cols))

        # Yearly trend line
        for year_col in year_cols[:1]:
            for num_col in numeric_cols:
                if num_col != year_col:
                    add(self._yearly_trend(cleaned_df, year_col, num_col))
                    break

        # Anomaly scatter
        if (not anomaly_report.get('skipped') and
                anomaly_report.get('total_anomalies', 0) > 0 and
                len(numeric_cols) >= 2):
            combined = (
                pd.concat([cleaned_df, internal_df], axis=1)
                if not internal_df.empty else cleaned_df
            )
            add(self._anomaly_scatter(combined, numeric_cols, anomaly_report))

        # Cluster scatter
        if cluster_report and not cluster_report.get('skipped') and cluster_report.get('pca_coords'):
            add(self._cluster_scatter(cluster_report))

        # Grouped bar: avg numeric by categorical
        if categorical_cols and numeric_cols:
            add(self._grouped_bar(cleaned_df, categorical_cols[0], numeric_cols[0]))

        # Box plots: all numeric cols in one chart
        if len(numeric_cols) >= 2:
            add(self._box_plots(cleaned_df, numeric_cols[:6]))

        return results

    def _save_figure(self, fig, chart_id: str) -> str | None:
        """
        Exports a Plotly figure to PNG bytes and uploads to Supabase Storage.
        Returns the public URL string, or None if anything fails.
        """
        try:
            import plotly.io as pio
            import io as _io

            img_bytes = pio.to_image(
                fig,
                format='png',
                width=CHART_WIDTH,
                height=CHART_HEIGHT,
                scale=CHART_SCALE,
            )

            path = f"{self.session_id}/charts/{chart_id}.png"

            self.supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
                path,
                img_bytes,
                file_options={
                    'content-type': 'image/png',
                    'upsert': 'true',
                }
            )

            url = self.supabase.storage.from_(
                settings.SUPABASE_BUCKET
            ).get_public_url(path)

            logger.info(f"Chart saved: {chart_id} → {url}")
            return url

        except Exception as e:
            logger.error(f"Chart generation failed [{chart_id}]: {e}")
            return None

    def _distribution(self, df, col, index) -> dict | None:
        import plotly.graph_objects as go
        from plotly.subplots import make_subplots

        data = df[col].dropna()
        if len(data) < 5:
            return None
        if len(data) > 10_000:
            data = data.sample(10_000, random_state=42)

        color = COLOR_SEQUENCE[index % len(COLOR_SEQUENCE)]

        fig = make_subplots(
            rows=1, cols=2,
            subplot_titles=[
                f'{col} — Histogram',
                f'{col} — Box Plot',
            ]
        )

        fig.add_trace(go.Histogram(
            x=data, nbinsx=40,
            marker_color=color, opacity=0.85,
            name=col, showlegend=False,
        ), row=1, col=1)

        fig.add_trace(go.Box(
            y=data, marker_color=color,
            boxpoints='outliers', name=col, showlegend=False,
        ), row=1, col=2)

        fig.update_layout(
            template=DARK_TEMPLATE,
            title=dict(text=f'Distribution: {col.replace("_"," ").title()}',
                       font=dict(size=15)),
            paper_bgcolor='rgba(0,0,0,0)',
            margin=dict(t=70, l=60, r=40, b=60),
        )

        chart_id = f"dist_{col}"
        url = self._save_figure(fig, chart_id)
        return None if not url else {
            'chart_id':   chart_id,
            'type':       'distribution',
            'title':      f'Distribution of {col.replace("_"," ").title()}',
            'description': f'Histogram and box plot for {col}. '
                            f'Mean: {data.mean():.2f} · Median: {data.median():.2f} · '
                            f'Std: {data.std():.2f}',
            'image_url':  url,
        }

    def _categorical_bar(self, df, col, index) -> dict | None:
        import plotly.express as px

        top = (df[col].value_counts().head(15)
                      .reset_index()
                      .rename(columns={col: 'value', 'count': 'count'}))
        if 'index' in top.columns:
            top = top.rename(columns={'index': 'value'})
        top.columns = ['value', 'count']
        top['pct'] = (top['count'] / len(df) * 100).round(1)
        top = top.sort_values('count')

        fig = px.bar(
            top, x='count', y='value', orientation='h',
            text=top['pct'].apply(lambda x: f'{x}%'),
            color='count',
            color_continuous_scale=[
                [0, '#1e1b4b'], [1, CHART_COLORS['primary']]
            ],
            template=DARK_TEMPLATE,
            title=f'Top Values: {col.replace("_"," ").title()}',
        )
        fig.update_traces(textposition='outside')
        fig.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            coloraxis_showscale=False, showlegend=False,
            margin=dict(t=60, l=160, r=100, b=60),
            yaxis_title='', xaxis_title='Count',
        )

        chart_id = f"cat_{col}"
        url = self._save_figure(fig, chart_id)
        top_val = top.iloc[-1]['value'] if len(top) else 'N/A'
        return None if not url else {
            'chart_id':   chart_id,
            'type':       'categorical_bar',
            'title':      f'Top Values: {col.replace("_"," ").title()}',
            'description': f'Most frequent values in {col}. '
                            f'Top: "{top_val}" · '
                            f'{df[col].nunique()} unique values total.',
            'image_url':  url,
        }

    def _correlation_heatmap(self, df, numeric_cols) -> dict | None:
        import plotly.express as px

        corr = df[numeric_cols].corr(method='pearson').round(3)

        fig = px.imshow(
            corr,
            color_continuous_scale='RdBu_r',
            zmin=-1, zmax=1,
            text_auto='.2f',
            aspect='auto',
            template=DARK_TEMPLATE,
            title='Correlation Matrix (Pearson)',
        )
        fig.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            margin=dict(t=60, l=120, r=60, b=120),
            font=dict(size=11),
        )
        fig.update_traces(textfont_size=11)

        url = self._save_figure(fig, 'correlation_heatmap')
        return None if not url else {
            'chart_id':    'correlation_heatmap',
            'type':        'heatmap',
            'title':       'Correlation Matrix',
            'description': 'Pearson correlation coefficients between all numeric columns. '
                           'Blue = positive, Red = negative, White = no correlation.',
            'image_url':   url,
        }

    def _scatter(self, df, top_corr: dict, categorical_cols: list) -> dict | None:
        import plotly.express as px

        col_x = top_corr['col1']
        col_y = top_corr['col2']
        r     = top_corr['correlation']

        cols = [col_x, col_y] + (categorical_cols[:1] if categorical_cols else [])
        plot_df = df[cols].dropna()
        if len(plot_df) > 3_000:
            plot_df = plot_df.sample(3_000, random_state=42)

        color_col = categorical_cols[0] if categorical_cols else None

        fig = px.scatter(
            plot_df, x=col_x, y=col_y, color=color_col,
            opacity=0.55,
            template=DARK_TEMPLATE,
            color_discrete_sequence=COLOR_SEQUENCE,
            title=f'{col_x} vs {col_y}  (r = {r:+.3f})',
        )
        fig.update_layout(paper_bgcolor='rgba(0,0,0,0)',
                          margin=dict(t=60, l=60, r=40, b=60))
        fig.update_traces(marker=dict(size=5), selector=dict(mode='markers'))

        chart_id = f"scatter_{col_x}_{col_y}"
        url = self._save_figure(fig, chart_id)
        direction = 'positive' if r > 0 else 'negative'
        strength  = 'strong' if abs(r) > 0.6 else 'moderate' if abs(r) > 0.3 else 'weak'
        return None if not url else {
            'chart_id':    chart_id,
            'type':        'scatter',
            'title':       f'{col_x.replace("_"," ").title()} vs {col_y.replace("_"," ").title()}',
            'description': f'{strength.title()} {direction} correlation (r = {r:+.3f}).',
            'image_url':   url,
        }

    def _yearly_trend(self, df, year_col, num_col) -> dict | None:
        import plotly.graph_objects as go

        g = (df.groupby(year_col)[num_col]
               .agg(['mean', 'median', 'std'])
               .reset_index()
               .sort_values(year_col))

        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=g[year_col], y=g['mean'],
            mode='lines+markers', name='Mean',
            line=dict(color=CHART_COLORS['primary'], width=2.5),
            marker=dict(size=7),
            error_y=dict(type='data', array=g['std'].tolist(),
                         visible=True, color='rgba(99,102,241,0.3)'),
        ))
        fig.add_trace(go.Scatter(
            x=g[year_col], y=g['median'],
            mode='lines+markers', name='Median',
            line=dict(color=CHART_COLORS['secondary'], width=2, dash='dash'),
            marker=dict(size=5),
        ))
        fig.update_layout(
            template=DARK_TEMPLATE,
            title=f'Avg {num_col.replace("_"," ").title()} by {year_col.replace("_"," ").title()}',
            xaxis=dict(tickmode='linear', dtick=1),
            paper_bgcolor='rgba(0,0,0,0)',
            margin=dict(t=60, l=60, r=40, b=60),
            legend=dict(orientation='h', yanchor='bottom', y=1.02),
        )

        chart_id = f"trend_{year_col}_{num_col}"
        url = self._save_figure(fig, chart_id)
        return None if not url else {
            'chart_id':    chart_id,
            'type':        'line_trend',
            'title':       f'Avg {num_col.replace("_"," ").title()} Over Time',
            'description': f'Mean (solid) and median (dashed) of {num_col} per {year_col}. '
                           f'Error bars show ±1 standard deviation.',
            'image_url':   url,
        }

    def _anomaly_scatter(self, df, numeric_cols, anomaly_report) -> dict | None:
        import plotly.graph_objects as go

        col_x, col_y = numeric_cols[0], numeric_cols[1]
        anomaly_set  = set(anomaly_report.get('anomaly_indices', []))

        plot_df = df[[col_x, col_y]].dropna()
        if len(plot_df) > 3_000:
            plot_df = plot_df.sample(3_000, random_state=42)

        is_anom  = plot_df.index.isin(anomaly_set)
        normal   = plot_df[~is_anom]
        anom     = plot_df[is_anom]

        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=normal[col_x], y=normal[col_y], mode='markers',
            name=f'Normal ({len(normal):,})',
            marker=dict(color=CHART_COLORS['primary'], size=4, opacity=0.45),
        ))
        if len(anom) > 0:
            fig.add_trace(go.Scatter(
                x=anom[col_x], y=anom[col_y], mode='markers',
                name=f'Anomaly ({len(anom):,})',
                marker=dict(color=CHART_COLORS['danger'], size=9, opacity=0.9,
                            symbol='x', line=dict(width=2, color=CHART_COLORS['danger'])),
            ))
        fig.update_layout(
            template=DARK_TEMPLATE,
            title=f'Anomaly Detection: {col_x} vs {col_y}',
            xaxis_title=col_x, yaxis_title=col_y,
            paper_bgcolor='rgba(0,0,0,0)',
            margin=dict(t=60, l=60, r=40, b=60),
            legend=dict(orientation='h', yanchor='bottom', y=1.02),
        )

        url = self._save_figure(fig, 'anomaly_scatter')
        return None if not url else {
            'chart_id':    'anomaly_scatter',
            'type':        'anomaly_scatter',
            'title':       f'Anomaly Detection ({anomaly_report["total_anomalies"]} flagged)',
            'description': f'Red × marks = IsolationForest anomalies '
                           f'({anomaly_report["anomaly_pct"]:.1f}% of data). '
                           f'Blue dots = normal data points.',
            'image_url':   url,
        }

    def _cluster_scatter(self, cluster_report) -> dict | None:
        import plotly.express as px

        pca_df          = pd.DataFrame(cluster_report['pca_coords'])
        pca_df['cluster'] = pca_df['cluster'].astype(str)

        fig = px.scatter(
            pca_df, x='x', y='y', color='cluster',
            template=DARK_TEMPLATE, color_discrete_sequence=COLOR_SEQUENCE,
            title=f'Cluster Analysis (k={cluster_report["k"]})',
            labels={'x': 'PC 1', 'y': 'PC 2'},
            opacity=0.6,
        )
        fig.update_traces(marker=dict(size=5))
        fig.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            margin=dict(t=60, l=60, r=40, b=60),
            legend_title_text='Cluster',
        )

        url = self._save_figure(fig, 'cluster_scatter')
        sil = cluster_report.get('silhouette_score')
        ch  = cluster_report.get('calinski_harabasz_score')
        score_txt = f'Silhouette: {sil:.3f}' if sil is not None else f'Calinski-Harabasz: {ch:.0f}' if ch is not None else ''
        return None if not url else {
            'chart_id':    'cluster_scatter',
            'type':        'cluster_scatter',
            'title':       f'Data Clusters (k={cluster_report["k"]})',
            'description': f'KMeans clustering projected to 2D via PCA. {score_txt}',
            'image_url':   url,
        }

    def _grouped_bar(self, df, cat_col, num_col) -> dict | None:
        import plotly.express as px

        n_unique = df[cat_col].nunique()
        if n_unique < 2 or n_unique > 25:
            return None

        g = (df.groupby(cat_col)[num_col]
               .mean().reset_index()
               .sort_values(num_col, ascending=True).tail(15))

        fig = px.bar(
            g, x=num_col, y=cat_col, orientation='h',
            color=num_col,
            color_continuous_scale=[[0, '#1e1b4b'], [1, CHART_COLORS['primary']]],
            template=DARK_TEMPLATE,
            title=f'Avg {num_col.replace("_"," ").title()} by '
                  f'{cat_col.replace("_"," ").title()}',
        )
        fig.update_layout(
            paper_bgcolor='rgba(0,0,0,0)', coloraxis_showscale=False,
            margin=dict(t=60, l=150, r=80, b=60),
            yaxis_title='', xaxis_title=f'Average {num_col}',
        )

        chart_id = f"grouped_{cat_col}_{num_col}"
        url = self._save_figure(fig, chart_id)
        return None if not url else {
            'chart_id':    chart_id,
            'type':        'grouped_bar',
            'title':       f'Avg {num_col.replace("_"," ").title()} '
                           f'by {cat_col.replace("_"," ").title()}',
            'description': f'How average {num_col} varies across {cat_col} groups.',
            'image_url':   url,
        }

    def _box_plots(self, df, numeric_cols) -> dict | None:
        import plotly.graph_objects as go

        fig = go.Figure()
        for i, col in enumerate(numeric_cols):
            data = df[col].dropna()
            if len(data) > 5_000:
                data = data.sample(5_000, random_state=42)
            fig.add_trace(go.Box(
                y=data, name=col,
                marker_color=COLOR_SEQUENCE[i % len(COLOR_SEQUENCE)],
                boxpoints='outliers', jitter=0.3,
            ))
        fig.update_layout(
            template=DARK_TEMPLATE,
            title='Box Plots — Outlier Overview',
            paper_bgcolor='rgba(0,0,0,0)',
            margin=dict(t=60, l=60, r=40, b=60),
            showlegend=False,
        )

        url = self._save_figure(fig, 'box_plots')
        return None if not url else {
            'chart_id':    'box_plots',
            'type':        'box_plots',
            'title':       'Box Plots — All Numeric Columns',
            'description': 'Median, IQR, and individual outlier points for each numeric column.',
            'image_url':   url,
        }
