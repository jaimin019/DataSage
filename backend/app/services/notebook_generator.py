class NotebookGenerator:
    def generate(self, dataset_info: dict, cleaning_report: dict, eda_summary: dict, anomaly_report: dict, cluster_report: dict, forecast_result: dict, cleaned_filename: str = None) -> dict:
        cells = []
        if cleaned_filename:
            file_name_to_load = cleaned_filename
        else:
            file_name_to_load = f"cleaned_{dataset_info['original_name']}"
            
        def add_md(text: str):
            cells.append({
                "cell_type": "markdown",
                "metadata": {},
                "source": [line + "\n" for line in text.split('\n')]
            })
            
        def add_code(text: str):
            cells.append({
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": [line + "\n" for line in text.split('\n')]
            })

        # 1. Title & Intro
        add_md(f"# DataSage Analysis Report: {dataset_info['original_name']}\n"
               f"**Rows:** {dataset_info['row_count']} | **Columns:** {dataset_info['col_count']}\n"
               "---\n"
               "This professional-grade notebook presents automated exploratory data analysis (EDA), cleaning results, and advanced machine learning modeling executed by DataSage.")
        
        # 2. Cleaning Actions (Code Log Playback)
        from collections import defaultdict
        log_by_section = defaultdict(list)
        for entry in cleaning_report.get('code_log', []):
            log_by_section[entry['section']].append(entry)

        SECTION_TITLES = {
            'setup':               '## 📂 1. Load Raw Data & Setup',
            'column_normalization':'### 1a. Column Name Normalization',
            'duplicates':          '### 1b. Duplicate Removal',
            'numeric_extraction':  '### 1c. Numeric Value Extraction',
            'date_parsing':        '### 1d. Date Column Parsing',
            'imputation':          '### 1e. Missing Value Imputation',
            'outlier_detection':   '### 1f. Outlier Detection (IQR)',
            'save':                '### 1g. Save Cleaned Data',
        }

        SECTION_EXPLAINERS = {
            'numeric_extraction': (
                "Several columns contain numeric data stored as strings — a common issue "
                "in scraped or exported datasets. For example: `\"45,000 kms\"` instead of `45000`.\n\n"
                "We handle: Indian number format (`\"4,25,000\"` → `425000`), unit suffixes, "
                "and junk values like `\"Ask For Price\"`."
            ),
            'imputation': (
                "For columns with fewer than 60% missing values, we impute:\n"
                "- **Numeric** → **median** (robust to outliers, unlike mean)\n"
                "- **Categorical** → **mode** (most frequent value)"
            ),
            'outlier_detection': (
                "The IQR (interquartile range) method flags values below `Q1 − 1.5×IQR` "
                "or above `Q3 + 1.5×IQR`. DataSage flags them but does **not** remove them "
                "by default — the decision is yours."
            ),
        }

        for section_key, entries in log_by_section.items():
            title    = SECTION_TITLES.get(section_key, f'### {section_key.replace("_"," ").title()}')
            explainer = SECTION_EXPLAINERS.get(section_key, '')

            add_md(f"{title}\n\n{explainer}" if explainer else title)

            for entry in entries:
                code_str = entry['code']
                # If we're in the setup phase, replace the filename placeholder with the actual original filename
                if section_key == 'setup':
                    code_str = code_str.replace("'dataset.csv'", f"'{dataset_info['original_name']}'")
                # If we're in the save phase, replace the dummy cleaned name with the actual cleaned_filename
                if section_key == 'save' and cleaned_filename:
                    code_str = code_str.replace('cleaned_dataset.csv', cleaned_filename)

                add_md(f"**{entry['comment']}**")
                add_code(code_str)

        # Bridge the cleaning phase to EDA (The rest of the notebook expects `df`)
        add_code("# Assign the cleaned dataset to 'df' for the remaining analysis\n"
                 "df = car.copy()")

        # 3. EDA & Correlation
        add_md("## 2. Exploratory Data Analysis\n"
               "### Univariate Distributions")
        
        numeric_stats = eda_summary.get('numeric_stats', {})
        if numeric_stats:
            add_code("numeric_cols = df.select_dtypes(include=[np.number]).columns\n"
                     "if len(numeric_cols) > 0:\n"
                     "    df[numeric_cols].hist(bins=30, figsize=(15, 10), layout=(-1, 3), color='skyblue', edgecolor='black')\n"
                     "    plt.suptitle('Histograms of Numeric Columns', y=1.02, fontsize=16)\n"
                     "    plt.tight_layout()\n"
                     "    plt.show()")
            add_md("> **Observation:** These distributions indicate the spread and central tendency of numeric features.")
        
        add_md("### Top Correlations")
        top_corr = eda_summary.get('top_correlations', [])
        if top_corr:
            for c in top_corr[:5]:
                add_md(f"- **{c['col1']}** vs **{c['col2']}**: {c['correlation']:.3f}")
            cols = [c['col1'] for c in top_corr] + [c['col2'] for c in top_corr]
            cols = list(set(cols))[:6]
            if len(cols) >= 2:
                add_code(f"cols = {cols}\n"
                         f"corr = df[cols].corr()\n"
                         "plt.figure(figsize=(8, 6))\n"
                         "sns.heatmap(corr, annot=True, cmap='coolwarm', vmin=-1, vmax=1, center=0, square=True)\n"
                         "plt.title('Correlation Heatmap')\nplt.show()")
                add_md("> **Observation:** Strong correlations (close to 1 or -1) indicate features that move together.")
        else:
            add_md("No significant numeric correlations found.")

        # 4. Anomalies
        add_md("## 3. Anomaly Detection\n"
               "Anomalies were detected using Isolation Forest, which isolates outliers in the multidimensional space.")
        if anomaly_report and not anomaly_report.get('skipped'):
            add_md(f"**Total Anomalies Flagged:** {anomaly_report.get('total_anomalies', 0)}")
            add_code("from sklearn.ensemble import IsolationForest\n"
                     "iso = IsolationForest(contamination=0.05, random_state=42)\n"
                     "numeric_df = df.select_dtypes(include=[np.number]).dropna()\n"
                     "if not numeric_df.empty:\n"
                     "    df['is_anomaly'] = iso.fit_predict(numeric_df)\n"
                     "    print(f'Found {(df[\"is_anomaly\"] == -1).sum()} anomalies')\n"
                     "    \n"
                     "    # Visualize anomalies if there are at least 2 numeric columns\n"
                     "    if len(numeric_df.columns) >= 2:\n"
                     "        col_x = numeric_df.columns[0]\n"
                     "        col_y = numeric_df.columns[1]\n"
                     "        plt.figure(figsize=(8, 6))\n"
                     "        sns.scatterplot(data=df, x=col_x, y=col_y, hue='is_anomaly', palette={1: 'blue', -1: 'red'}, alpha=0.6)\n"
                     "        plt.title(f'Anomaly Detection: {col_x} vs {col_y}')\n"
                     "        plt.show()")
            add_md("> **Observation:** Red points (-1) signify statistical outliers that deviate significantly from the rest of the dataset.")
        else:
            add_md("Anomaly detection skipped or not applicable.")

        # 5. Clustering
        add_md("## 4. Cluster Analysis\n"
               "K-Means clustering was applied to identify natural groupings in the data.")
        if cluster_report and not cluster_report.get('skipped'):
            add_md(f"**Optimal Clusters (k):** {cluster_report.get('k')}\n"
                   f"**Silhouette Score:** {cluster_report.get('silhouette_score', 0):.3f}")
            add_code("from sklearn.cluster import KMeans\n"
                     "from sklearn.preprocessing import StandardScaler\n"
                     "from sklearn.decomposition import PCA\n\n"
                     "numeric_df = df.select_dtypes(include=[np.number]).dropna()\n"
                     "if not numeric_df.empty:\n"
                     "    scaler = StandardScaler()\n"
                     "    scaled = scaler.fit_transform(numeric_df)\n"
                     f"    kmeans = KMeans(n_clusters={cluster_report.get('k', 3)}, random_state=42)\n"
                     "    df['Cluster'] = kmeans.fit_predict(scaled)\n"
                     "    \n"
                     "    # 2D PCA Visualization\n"
                     "    pca = PCA(n_components=2)\n"
                     "    pca_coords = pca.fit_transform(scaled)\n"
                     "    plt.figure(figsize=(8, 6))\n"
                     "    sns.scatterplot(x=pca_coords[:,0], y=pca_coords[:,1], hue=df['Cluster'], palette='viridis')\n"
                     "    plt.title('2D PCA of Clusters')\n"
                     "    plt.show()")
            add_md("> **Observation:** Points of the same color belong to the same cluster. Distinct separations imply strong underlying patterns.")
        else:
            add_md("Clustering skipped or not applicable.")

        # 6. Forecasting
        if forecast_result and not forecast_result.get('skipped'):
            add_md("## 5. Time Series Forecast\n"
                   f"**Target:** {forecast_result.get('target_col')} | **Trend:** {forecast_result.get('trend_direction')}\n\n"
                   "Prophet was used to decompose the time series and predict future values.")
            add_code("from prophet import Prophet\n\n"
                     f"prep_df = df[['{forecast_result.get('date_col')}', '{forecast_result.get('target_col')}']].copy()\n"
                     "prep_df.columns = ['ds', 'y']\n"
                     "prep_df = prep_df.dropna().sort_values('ds')\n"
                     "m = Prophet(yearly_seasonality=True)\n"
                     "m.fit(prep_df)\n"
                     "future = m.make_future_dataframe(periods=30)\n"
                     "forecast = m.predict(future)\n"
                     "\n"
                     "fig = m.plot(forecast)\n"
                     "plt.title('Time Series Forecast')\n"
                     "plt.show()\n"
                     "\n"
                     "fig2 = m.plot_components(forecast)\n"
                     "plt.show()")
            add_md("> **Observation:** The top chart shows the forecast and uncertainty intervals. The bottom charts break down the overall trend and seasonality.")

        notebook = {
            "cells": cells,
            "metadata": {
                "kernelspec": {
                    "display_name": "Python 3",
                    "language": "python",
                    "name": "python3"
                },
                "language_info": {
                    "codemirror_mode": {"name": "ipython", "version": 3},
                    "file_extension": ".py",
                    "mimetype": "text/x-python",
                    "name": "python",
                    "nbconvert_exporter": "python",
                    "pygments_lexer": "ipython3",
                    "version": "3.10.0"
                }
            },
            "nbformat": 4,
            "nbformat_minor": 4
        }
        
        return notebook
