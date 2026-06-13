import pandas as pd
import numpy as np
import re
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

# Columns added for internal analysis only — must never appear in exported CSV
INTERNAL_COLUMN_PREFIXES = ('is_outlier_', 'is_anomaly', '_datasage_')

class CleaningReport(BaseModel):
    original_rows: int
    original_cols: int
    final_rows: int = 0
    final_cols: int = 0
    duplicates_removed: int = 0
    columns_renamed: dict = Field(default_factory=dict)
    missing_value_actions: list = Field(default_factory=list)
    outlier_flags_added: list = Field(default_factory=list)
    high_null_columns: list = Field(default_factory=list)
    date_columns_parsed: list = Field(default_factory=list)
    year_columns_detected: list = Field(default_factory=list)
    strategies_summary: list = Field(default_factory=list)
    internal_columns_generated: list[str] = []
    skipped: bool = False
    skip_reason: Optional[str] = None
    code_log: list[dict] = []

class DataCleaningPipeline:
    def __init__(self):
        self._code_log: list[dict] = []
        self._section: str = "setup"
        
    def _log(self, comment: str, code: str) -> None:
        """Records an executed operation. code must be valid Python."""
        self._code_log.append({
            "section": self._section,
            "comment": comment,
            "code":    code.strip(),
        })

    def run(self, df: pd.DataFrame, original_filename: str = 'dataset.csv') -> tuple[pd.DataFrame, pd.DataFrame, CleaningReport]:
        report = CleaningReport(original_rows=len(df), original_cols=len(df.columns))
        df = df.copy()

        if len(df) == 0:
            report.skipped = True
            report.skip_reason = "Empty DataFrame"
            return df, pd.DataFrame(index=df.index), report

        self._section = "setup"
        self._log(
            "Load raw data",
            f"import numpy as np\n"
            f"import pandas as pd\n"
            f"import matplotlib.pyplot as plt\n"
            f"import seaborn as sns\n\n"
            f"car = pd.read_csv('{original_filename}')\n"
            f"print(f'Raw shape: {{car.shape}}')\n"
            f"car.head()"
        )
        self._log("Inspect data types",
            "print(car.dtypes)\nprint()\ncar.describe(include='all').T")

        # ── STAGE 1: Column name normalization ─────────────────────────────
        rename_map = {}
        for col in df.columns:
            clean = str(col).strip().lower()
            clean = re.sub(r'[^a-z0-9_]', '_', clean)
            clean = re.sub(r'_+', '_', clean).strip('_')
            if not clean:
                clean = "column"
            if clean != str(col):
                rename_map[col] = clean
        df.rename(columns=rename_map, inplace=True)
        report.columns_renamed = rename_map
        
        self._section = "column_normalization"
        if rename_map:
            self._log(
                f"Rename {len(rename_map)} columns for consistency",
                f"car.rename(columns={rename_map!r}, inplace=True)\n"
                f"print('Columns renamed:', {list(rename_map.keys())!r})"
            )

        # ── STAGE 2: Duplicate removal ──────────────────────────────────────
        before = len(df)
        df.drop_duplicates(inplace=True)
        df.reset_index(drop=True, inplace=True)
        report.duplicates_removed = before - len(df)
        
        self._section = "duplicates"
        n_dropped = before - len(df)
        if n_dropped > 0:
            self._log(
                f"Remove {n_dropped} duplicate rows",
                f"n_before = len(car)\n"
                f"car.drop_duplicates(inplace=True)\n"
                f"car.reset_index(drop=True, inplace=True)\n"
                f"print(f'Removed {{n_before - len(car)}} duplicates. Shape: {{car.shape}}')"
            )
        else:
            self._log("Check for duplicates",
                f"print(f'Duplicate rows: {{car.duplicated().sum()}}')  # 0")

        # ── STAGE 3: Smart numeric extraction ─────────────────────────────
        for col in df.select_dtypes(include=['object', 'string']).columns:
            result = self._try_extract_numeric(df[col])
            if result is not None:
                conversion_rate = result.notna().mean()
                if conversion_rate > 0.6:
                    original_nulls = df[col].isnull().sum()
                    df[col] = result
                    new_nulls = df[col].isnull().sum()
                    report.missing_value_actions.append({
                        "column": col,
                        "action": "converted_to_numeric",
                        "conversion_rate_pct": round(conversion_rate * 100, 1),
                        "new_nulls_introduced": int(new_nulls - original_nulls)
                    })
                    
                    self._section = "numeric_extraction"
                    code_lines = [
                        f"# '{col}': was stored as string — extract numeric values",
                        f"print('Before:', car['{col}'].value_counts().head(3).to_dict())",
                    ]
                    
                    # We approximate detected junk/units for the log since they were applied generically
                    junk_pattern = r'^(ask for price|n/a|na|null|none|not available|-|)$'
                    code_lines.append(
                        f"# Remove junk values\n"
                        f"car['{col}'] = car['{col}'].astype(str)\n"
                        f"junk_mask = car['{col}'].str.lower().str.match(r'{junk_pattern}', na=False)\n"
                        f"car.loc[junk_mask, '{col}'] = np.nan\n"
                        f"print(f'  Junk values removed: {{junk_mask.sum()}}')"
                    )
                    
                    suffix_pat = r'\s*(kms?|kmpl|km|cc|bhp|lakhs?|cr|k|m)\s*$'
                    code_lines.append(
                        f"# Remove unit suffixes\n"
                        f"car['{col}'] = car['{col}'].astype(str).str.replace(\n"
                        f"    r'{suffix_pat}', '', regex=True\n"
                        f")"
                    )
                    
                    code_lines.extend([
                        f"# Remove commas (handles Indian: '4,25,000' and standard: '425,000')",
                        f"car['{col}'] = car['{col}'].astype(str).str.replace(',', '', regex=False)",
                        f"car['{col}'] = pd.to_numeric(car['{col}'], errors='coerce')",
                        f"n_failed = car['{col}'].isnull().sum()",
                        f"print(f'  Converted. Failed: {{n_failed}} rows')",
                        f"print(f'  Range: {{car[\"{col}\"].min():.0f}} – {{car[\"{col}\"].max():.0f}}')",
                    ])
                    
                    self._log(f"Extract numeric from '{col}'", '\n'.join(code_lines))

        # ── STAGE 4: Date column detection ────────────────────────────────
        for col in df.select_dtypes(include=['object', 'string']).columns:
            # We skip columns that are mostly numeric
            parsed = pd.to_datetime(df[col], errors='coerce')
            if parsed.notna().mean() > 0.8:
                df[col] = parsed
                report.date_columns_parsed.append(col)

        # ── STAGE 5: Year column detection ─────────────────────────────────
        for col in df.select_dtypes(include=['int64', 'float64', 'Int64']).columns:
            col_values = df[col].dropna()
            if len(col_values) > 0:
                if col_values.min() >= 1900 and col_values.max() <= 2030:
                    # To avoid detecting small numbers as years, verify max and min
                    if col_values.max() > 1950: # sensible year check
                        report.year_columns_detected.append(col)

        # ── STAGE 6: High-null column flagging ────────────────────────────
        for col in df.columns:
            null_pct = df[col].isnull().mean()
            if null_pct > 0.6:
                report.high_null_columns.append({
                    "column": col,
                    "null_pct": round(null_pct * 100, 1)
                })

        # ── STAGE 7: Missing value imputation ─────────────────────────────
        for col in df.columns:
            null_pct = df[col].isnull().mean()
            if null_pct == 0 or null_pct > 0.6:
                continue
            if pd.api.types.is_numeric_dtype(df[col]):
                median_val = df[col].median()
                if pd.notna(median_val):
                    filled = df[col].isnull().sum()
                    df[col] = df[col].fillna(median_val)
                    report.missing_value_actions.append({
                        "column": col,
                        "action": "median_imputation",
                        "value": float(median_val),
                        "filled_count": int(filled)
                    })
                    
                    self._section = "imputation"
                    self._log(
                        f"Impute {int(filled)} nulls in '{col}' with median = {float(median_val):.4f}",
                        f"# '{col}': {int(filled)} missing values ({null_pct*100:.1f}%)\n"
                        f"# Median is robust to outliers — preferred over mean\n"
                        f"car['{col}'].fillna({float(median_val):.6g}, inplace=True)\n"
                        f"print(f\"'{col}': filled {int(filled)} nulls → median = {float(median_val):.2f}\")"
                    )
            else:
                mode_vals = df[col].mode()
                if len(mode_vals) > 0 and pd.notna(mode_vals[0]):
                    filled = df[col].isnull().sum()
                    df[col] = df[col].fillna(mode_vals[0])
                    report.missing_value_actions.append({
                        "column": col,
                        "action": "mode_imputation",
                        "value": str(mode_vals[0]),
                        "filled_count": int(filled)
                    })
                    
                    self._section = "imputation"
                    self._log(
                        f"Impute {int(filled)} nulls in '{col}' with mode = '{mode_vals[0]}'",
                        f"# '{col}': {int(filled)} missing values ({null_pct*100:.1f}%)\n"
                        f"car['{col}'].fillna('{mode_vals[0]}', inplace=True)\n"
                        f"print(f\"'{col}': filled {int(filled)} nulls → mode = '{mode_vals[0]}'\")"
                    )

        # ── STAGE 8: Outlier FLAGGING ───────────────────────────────────────
        numeric_cols = df.select_dtypes(include='number').columns
        for col in numeric_cols:
            if col in report.year_columns_detected or df[col].nunique() <= 2:
                continue
            q1 = df[col].quantile(0.25)
            q3 = df[col].quantile(0.75)
            iqr = q3 - q1
            if iqr == 0:
                continue
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            outlier_mask = (df[col] < lower) | (df[col] > upper)
            outlier_count = int(outlier_mask.sum())
            if outlier_count > 0:
                flag_col = f"is_outlier_{col}"
                df[flag_col] = outlier_mask
                report.outlier_flags_added.append({
                    "column": col,
                    "outlier_count": outlier_count,
                    "lower_bound": float(lower),
                    "upper_bound": float(upper),
                    "flag_column": flag_col
                })
                
                self._section = "outlier_detection"
                self._log(
                    f"IQR outlier detection: '{col}' → {outlier_count} flagged",
                    f"# '{col}' IQR outlier detection\n"
                    f"q1, q3 = car['{col}'].quantile(0.25), car['{col}'].quantile(0.75)\n"
                    f"iqr = q3 - q1\n"
                    f"lower_bound = {lower:.4g}\n"
                    f"upper_bound = {upper:.4g}\n"
                    f"is_outlier_{col} = (car['{col}'] < lower_bound) | (car['{col}'] > upper_bound)\n"
                    f"print(f\"'{col}': {{is_outlier_{col}.sum()}} outliers "
                    f"(below {lower:.2f} or above {upper:.2f})\")\n"
                    f"# Uncomment to remove outliers instead of flagging:\n"
                    f"# car = car[~is_outlier_{col}]\n"
                    f"# car.reset_index(drop=True, inplace=True)"
                )

        report.final_rows = len(df)
        report.final_cols = len(df.columns)
        report.strategies_summary = self._build_summary(report)

        # ── Strip internal columns from the export DataFrame ──────────────────────
        internal_cols = [
            col for col in df.columns
            if any(str(col).startswith(prefix) for prefix in INTERNAL_COLUMN_PREFIXES)
        ]

        # Export DataFrame: zero internal columns — this is what users download
        df_export = df.drop(columns=internal_cols, errors='ignore').copy()

        # Internal DataFrame: only the flag columns — used by anomaly + viz agents
        df_internal = df[internal_cols].copy() if internal_cols else pd.DataFrame(index=df.index)

        # Record what was stripped (transparency)
        report.internal_columns_generated = internal_cols
        
        self._section = "save"
        self._log(
            "Save cleaned data",
            f"car.reset_index(drop=True, inplace=True)\n"
            f"print(f'Final shape: {{car.shape}}')\n"
            f"remaining_nulls = car.isnull().sum()\n"
            f"if remaining_nulls.sum() > 0:\n"
            f"    print('Remaining nulls:')\n"
            f"    print(remaining_nulls[remaining_nulls > 0])\n"
            f"car.to_csv('cleaned_dataset.csv', index=False)\n"
            f"print(f'✅ Cleaned data saved to \"cleaned_dataset.csv\"')\n"
            f"car.head()"
        )
        
        report.code_log = self._code_log

        return df_export, df_internal, report

    def _try_extract_numeric(self, series: pd.Series) -> Optional[pd.Series]:
        s = series.astype(str).str.strip().str.lower()
        
        # 1. Junk value removal
        junk_pattern = r'^(ask for price|n/a|na|null|none|not available|-|)$'
        s = s.replace(to_replace=junk_pattern, value=np.nan, regex=True)
        
        if s.isna().all():
            return None
            
        # 2. Unit suffix removal
        s = s.str.replace(r'\s*(kms?|kmpl|km|cc|bhp|lakhs?|cr|k|m)\s*$', '', regex=True)
        
        # 3. Currency symbols
        s = s.str.replace(r'[₹$€£]', '', regex=True)
        
        # 4. Handle percentages
        is_pct = s.str.endswith('%', na=False)
        s = s.str.replace('%', '', regex=False)
        
        # 5. Number formatting (commas)
        s = s.str.replace(',', '', regex=False)
        
        # Convert to numeric
        parsed = pd.to_numeric(s, errors='coerce')
        
        # Apply percentage division
        if is_pct.any():
            parsed = np.where(is_pct & parsed.notna(), parsed / 100, parsed)
            parsed = pd.Series(parsed, index=series.index)
            
        conversion_rate = parsed.notna().mean()
        if conversion_rate > 0.1: # At least 10% valid numbers to consider it numeric
            return parsed
        return None

    def _build_summary(self, report) -> list:
        summary = []
        if report.duplicates_removed > 0:
            summary.append(f"Removed {report.duplicates_removed} duplicate rows")
        for action in report.missing_value_actions:
            if action['action'] == 'converted_to_numeric':
                summary.append(
                    f"Column '{action['column']}': extracted numeric values "
                    f"({action['conversion_rate_pct']}% success rate)"
                )
            elif action['action'] == 'median_imputation':
                summary.append(
                    f"Column '{action['column']}': filled {action['filled_count']} "
                    f"nulls with median ({action['value']:.2f})"
                )
        for outlier in report.outlier_flags_added:
            summary.append(
                f"Column '{outlier['column']}': flagged {outlier['outlier_count']} "
                f"outlier rows (IQR method)"
            )
        return summary
