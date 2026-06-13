# DataSage — Product Specification Document
**Version:** 1.0  
**Type:** Autonomous Multi-Agent Data Analytics Platform  
**Stack:** Next.js 15 (Frontend) · FastAPI (Backend) · Supabase (DB + Auth + Storage)  
**Live URLs:**  
- Frontend: https://datasage.vercel.app (replace with your actual URL)  
- Backend API: https://datasage-api.onrender.com (replace with your actual URL)  
- API Docs: https://datasage-api.onrender.com/docs

---

## 1. Product Overview

DataSage is a web-based AI-powered data analyst. Users upload CSV files and receive:
- Automated data cleaning with an explainable report
- Exploratory data analysis (EDA) with statistics and correlations
- AI-generated business insights via Groq LLM
- Multiple chart visualizations (Plotly PNG images)
- Anomaly detection using IsolationForest
- KMeans clustering with PCA visualization
- Time-series forecasting using Prophet
- Natural language Q&A about their dataset
- Downloadable cleaned CSV, Jupyter notebook, and PDF report
- Full authentication with email/password and Google OAuth
- Analysis history with rename, star, and delete capabilities

---

## 2. User Types

**Unauthenticated User**
- Can view the landing page (/)
- Cannot upload or analyze data
- Redirected to /login when accessing /dashboard or /history

**Authenticated User**
- Can upload CSV files and run analysis
- Can view up to 50 past analyses in /history
- Can rename, star, and delete analyses
- Can download cleaned CSV, Jupyter notebook, and PDF report

---

## 3. Authentication Flows

### 3.1 Sign Up (Email + Password)
**URL:** /signup  
**Flow:**
1. User enters email and password (min 8 characters)
2. User clicks "Create account"
3. If email confirmation is OFF in Supabase: user is logged in and redirected to /history
4. If email confirmation is ON: user sees "Check your email" screen
5. User clicks confirmation link in email → redirected to /auth/callback → redirected to /history

**Validation rules:**
- Email must contain @
- Password minimum 8 characters
- Passwords must match (confirm password field)
- If email already registered: show "This email is already registered. Please sign in."
- If password too short: show "Password must be at least 8 characters."

**Expected error states:**
- Wrong format email → inline error "Please enter a valid email address"
- Mismatched passwords → inline error before API call
- Already registered email → inline error after API response

### 3.2 Sign In (Email + Password)
**URL:** /login  
**Flow:**
1. User enters email and password
2. User clicks "Sign In"
3. On success: redirected to /history (or to redirectTo query param if present)
4. On failure: inline error message shown below form

**Expected error states:**
- Wrong password → "Incorrect email or password."
- Unconfirmed email → "Please verify your email address before signing in."
- Rate limited → "Too many attempts. Please wait a few minutes."

### 3.3 Google OAuth
**URL:** /login (click "Continue with Google")  
**Flow:**
1. User clicks Google button
2. Redirected to Google account picker (same tab)
3. User selects Google account
4. Google redirects to /auth/callback
5. Supabase exchanges code for session
6. User redirected to /history

**Expected behavior:**
- Google button triggers OAuth in SAME tab (not popup)
- After successful Google auth, user is fully authenticated
- Navbar shows user's Google email

### 3.4 Sign Out
**Flow:**
1. User clicks avatar in navbar → dropdown appears
2. User clicks "Sign Out"
3. Session cleared
4. Redirected to /login
5. Navigating to /history now redirects back to /login

### 3.5 Protected Routes
The following routes require authentication:
- /dashboard/* → redirect to /login if not authenticated
- /history → redirect to /login if not authenticated

The following routes redirect to /history if already authenticated:
- /login
- /signup
- /forgot-password

---

## 4. Landing Page (/)

**URL:** /  
**Visible to:** All users (unauthenticated see upload CTA, authenticated are redirected to /history)

**Elements:**
- "DataSage" logo in navbar (top left)
- GitHub icon link (top right)
- Theme toggle button (dark/light)
- Hero heading: "Autonomous Data Analysis. Free Forever."
- Subheading: "Upload your CSV → AI cleans, analyzes, and generates insights in 60 seconds"
- CSV DropZone: drag-and-drop area
- "Analyze Data" button (disabled until file selected)
- Feature pills below dropzone: "Auto EDA", "Smart Charts", "AI Insights", "Trend Forecasting"

**Pre-upload preference form (shown after file selected):**
- Step 1: Analysis Goal (Explore / Prepare for ML / Detect Anomalies / Forecast / Quick overview)
- Step 2: Target Column selection (dropdown of CSV columns)
- Step 3: Analysis Depth (Quick ~15s / Standard ~60s / Deep ~3min)
- Step 4: Focus Areas (multi-select: Data quality / Distributions / Correlations / Anomalies / Clustering / Forecasting)
- Step 5: Outlier Handling (Flag only / Remove extreme outliers)
- Summary screen with "Start Analysis" button
- "Skip" option available on every step

---

## 5. CSV Upload Flow

**Endpoint:** POST /api/v1/upload  
**Auth required:** Yes (JWT in Authorization header)

**Accepted files:** CSV only (.csv extension)  
**Max file size:** 50MB

**Flow:**
1. User drops or selects a CSV file in the DropZone
2. Preference form slides down (Steps 1-5 or skip)
3. User clicks "Start Analysis" (or "Analyze Data" if skipped)
4. File uploaded to backend via FormData (file + preferences JSON)
5. Backend responds with {session_id, status: "pending", dataset_info}
6. User redirected to /dashboard/{session_id}

**Error states:**
- Non-CSV file dropped → "Only CSV files (.csv) are accepted."
- File larger than 50MB → "File size exceeds the 50MB limit."
- Not authenticated → redirect to /login

**Expected response:**
```json
{
  "session_id": "uuid",
  "status": "pending",
  "message": "Analysis pipeline started",
  "dataset_info": {
    "filename": "quikr_car.csv",
    "cleaned_filename": "cleaned_quikr_car.csv",
    "row_count": 892,
    "col_count": 6,
    "file_size_bytes": 45231,
    "columns": [...]
  }
}
```

---

## 6. Dashboard Page (/dashboard/{sessionId})

**URL:** /dashboard/{sessionId}  
**Auth required:** Yes  
**Accessible:** Only to the user who owns the session (403 for others)

### 6.1 Header
- "← My Analyses" link (navigates back to /history)
- Filename: "quikr_car.csv" (large heading)
- Row/column count: "892 rows · 6 columns"
- File size badge
- Preferences summary badge: e.g., "Anomaly focus · Standard"
- "Download Report" button (top right) — dropdown with 3 options

### 6.2 Pipeline Status Indicator
Shows 5 steps with state indicators:
1. Cleaning
2. EDA
3. Visualizations
4. Insights
5. Forecast

Each step shows: pending (grey circle) / active (pulsing blue) / done (green checkmark) / failed (red X)

Status detail text shown during active step: e.g., "Cleaning 892 rows..."

### 6.3 Tab Navigation
Five tabs: Overview | Charts | Insights | Forecast | Chat

---

## 7. Dashboard Tabs

### 7.1 Overview Tab
**Visible when:** pipeline status = "done"

Contains:
- 4 stat cards:
  - Total Rows (e.g., "892")
  - Total Columns (e.g., "6")
  - Anomalies Detected (e.g., "45" with color: red >5%, yellow 2-5%, green <2%)
  - Clusters Found (e.g., "3" or "Skipped")
- Top Correlations section (table of top 5 correlated column pairs)
- Data Quality Summary (from cleaning report)

**Does NOT contain charts** (charts are in the Charts tab only)

### 7.2 Charts Tab
**Visible when:** pipeline status = "done"

Contains:
- "X charts generated" count
- 2-column responsive grid of chart image cards
- Each card has: title, chart type badge, description, PNG image, footer note
- Heatmap and cluster scatter charts span full width
- Loading: shimmer animation while PNG images download from Supabase Storage
- Empty state: "No charts could be generated for this dataset"

**Chart types that may appear:**
- distribution (histogram + box plot)
- categorical_bar (horizontal bar chart)
- heatmap (correlation matrix)
- scatter (correlated pair with trend line)
- line_trend (yearly trend over time)
- anomaly_scatter (normal vs anomaly points)
- cluster_scatter (KMeans clusters in PCA space)
- grouped_bar (avg numeric by categorical)
- box_plots (all numeric columns)

### 7.3 Insights Tab
**Visible when:** pipeline status = "done"

Contains:
- "Key Discoveries" heading
- 3-7 insight cards sorted by rank
- Each card has:
  - Rank badge (gold/silver/bronze/grey)
  - Category badge (trend/correlation/anomaly/distribution/recommendation)
  - Title (full text, never truncated)
  - Body text (3-4 sentences with specific numbers)
  - Supporting column pills

**Does NOT show:** confidence scores

### 7.4 Forecast Tab
**If no time series detected:**
- Shows empty state with specific message explaining why
- E.g., "No Date Column Found — Add a date/time column to enable forecasting"

**If time series detected:**
- 3 stat cards: trend direction badge, trend % change, model accuracy
- ForecastChart (interactive Recharts line chart with confidence bands)
- LLM interpretation text block
- "Download forecast data as CSV" button

### 7.5 Chat Tab
**Visible when:** pipeline status = "done"

**Empty state (no messages yet):**
- DataSage Assistant header
- "Ask a question about your data" heading
- 5 dynamic suggested questions based on ACTUAL dataset columns
  (e.g., if dataset has "price" and "kms_driven": questions reference those columns)
  NOT hardcoded car-specific questions for non-car datasets

**After sending a message:**
- User message: right-aligned blue bubble
- Assistant message: left-aligned grey bubble
- Question type badge on assistant response (e.g., "Statistical", "Anomaly Analysis")
- "Thinking..." animated dots while waiting

**Input:**
- Text input field: "Ask a question about your data... (Press Enter to send)"
- Send button
- Character limit: 500 chars
- Submit on Enter key or Send button click

---

## 8. Download Features

### 8.1 Download PDF Report
**Endpoint:** GET /api/v1/session/{id}/report  
**Triggers:** Browser downloads a PDF file  
**File name:** {original_stem}_datasage_report.pdf  
**Contains:** Dataset summary, cleaning report, charts, insights

### 8.2 Download Cleaned CSV
**Endpoint:** GET /api/v1/session/{id}/download/cleaned-csv  
**File name:** cleaned_{original_stem}.csv (e.g., cleaned_quikr_car.csv)  
**Contains:** Cleaned data WITHOUT any is_outlier_ boolean columns  
**Expected:** Only original data columns in cleaned numeric form

### 8.3 Download Jupyter Notebook
**Endpoint:** GET /api/v1/session/{id}/download/notebook  
**File name:** {original_stem}_datasage_analysis.ipynb  
**Contains:** 45-65 cells including:
- Library imports
- Load raw data (pd.read_csv('{original_filename}'))
- Actual cleaning code (exact operations performed on THIS dataset)
- EDA with visualizations
- Anomaly detection
- Clustering
- Forecasting (if applicable)
- Summary
**Notebook pd.read_csv() must reference {original_filename} (not cleaned_filename)**
**to_csv() must save to {cleaned_filename} — SAME name as the downloaded CSV**

---

## 9. History Page (/history)

**URL:** /history  
**Auth required:** Yes  
**Redirect:** Unauthenticated users → /login

**Elements:**
- "My Analyses" heading
- Total count + starred count
- Search bar (filters by filename or custom label)
- "Starred only" toggle
- "+ Upload New CSV" button (navigates to /)
- Grid of HistoryCard components
- Pagination (20 per page)

**Empty state:** "No analyses yet" with "Upload a CSV" button

### 9.1 History Card
Each card shows:
- Star icon (yellow if starred, grey if not) — click to toggle
- Analysis name (custom label if renamed, else original filename)
- If renamed: original filename shown smaller below
- Status badge: Done (green) / Processing (yellow spinner) / Failed (red)
- Created date and time
- Row count · Column count · Insight count · Chart count
- "Has forecast" indicator if forecasting ran
- Preferences summary (e.g., "Anomaly focus · Standard")
- "Open Analysis" button → navigates to /dashboard/{session_id}
- "⋮" overflow menu with: Rename / Star / Delete

### 9.2 Rename Analysis
- Click ⋮ → Rename
- Dialog appears with input field pre-filled with current name
- User types new name → clicks Save
- Card immediately shows new name
- PATCH /api/v1/session/{id}/label called

### 9.3 Star/Unstar Analysis
- Click star icon on card
- Star toggles immediately (optimistic update)
- PATCH /api/v1/session/{id}/label called with is_starred field

### 9.4 Delete Analysis
- Click ⋮ → Delete
- Confirmation dialog: "Delete this analysis permanently?"
- User must click "Delete permanently" (a second, separate click)
- On confirm: card removed from list
- DELETE /api/v1/session/{id} called
- Supabase Storage files also deleted

---

## 10. API Endpoints

All endpoints except /health require JWT in Authorization header.

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/health | Health check — returns {"status": "ok"} |

### Upload
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/upload | Upload CSV + preferences, returns session_id |

### Session
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/session/{id}/status | Pipeline status + detail |
| GET | /api/v1/session/{id}/dataset | Dataset metadata |
| GET | /api/v1/session/{id}/analysis | EDA + cleaning + anomaly + cluster results |
| GET | /api/v1/session/{id}/visualizations | List of chart metadata with image_url |
| GET | /api/v1/session/{id}/insights | AI-generated insights list |
| GET | /api/v1/session/{id}/forecast | Forecast data + interpretation |
| GET | /api/v1/session/{id}/conversation | Full Q&A chat history |
| POST | /api/v1/session/{id}/qa | Ask a question, returns {answer, question_type} |

### Downloads
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/session/{id}/download/cleaned-csv | Download cleaned CSV |
| GET | /api/v1/session/{id}/download/notebook | Download Jupyter .ipynb |
| GET | /api/v1/session/{id}/report | Download PDF report |

### History
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/history | Paginated list of user's analyses |
| PATCH | /api/v1/session/{id}/label | Rename or star an analysis |
| DELETE | /api/v1/session/{id} | Delete analysis + storage files |

---

## 11. Error States and Edge Cases

### 11.1 Access Denied (403)
If a user navigates to /dashboard/{sessionId} that belongs to another user:
- Shows: "Access Denied" screen with lock icon
- Message: "This analysis belongs to a different account."
- Button: "Go to My Analyses" → navigates to /history

### 11.2 Upload Limit (429)
If user already has 50 analyses and tries to upload:
- Shows toast: "You've reached your 50-analysis limit. Delete old analyses to continue."

### 11.3 Pipeline Failed
If the analysis pipeline fails:
- Status badge shows "Failed" in red
- Error message displayed in the dashboard
- "Try Again" button shown

### 11.4 Empty CSV
If user uploads an empty CSV:
- Upload returns 422: "CSV file is empty"
- Error shown on landing page

### 11.5 Non-CSV File
If user uploads a .xlsx, .pdf, .txt, or other non-CSV:
- Error: "Only CSV files (.csv) are accepted."
- Error shown before any network call (client-side validation)

### 11.6 File Too Large (>50MB)
- Error: "File size exceeds the 50MB limit."

### 11.7 Processing State
While pipeline is running:
- Each tab shows loading skeleton
- Pipeline status shows current stage
- Charts tab shows "Charts are being generated..."
- Insights tab shows "Analysis is generating insights..."

---

## 12. Navbar Behavior

**When not logged in:**
- Logo "DataSage" (left)
- GitHub icon (right)
- Theme toggle (right)
- "Sign in" button (right) → navigates to /login

**When logged in:**
- Logo "DataSage" (left)
- GitHub icon (right)
- Theme toggle (right)
- "My Analyses" link (right) → navigates to /history
- Avatar circle (right) with first letter of user's email
- Clicking avatar opens dropdown:
  - User email (read-only label)
  - "My Analyses" option
  - Divider
  - "Sign Out" option (red text)

---

## 13. Performance Requirements

| Dataset Size | Expected Pipeline Time |
|---|---|
| < 5,000 rows | Under 30 seconds |
| 5,000 – 20,000 rows | Under 60 seconds |
| 20,000 – 50,000 rows | Under 90 seconds |
| > 50,000 rows | Under 3 minutes |

---

## 14. Key Test Scenarios

### Critical Path (must pass)
1. User signs up → receives verification (or auto-confirmed) → logs in
2. User uploads a CSV → pipeline completes → all 5 tabs have content
3. User asks a Q&A question → receives a relevant answer about the data
4. User downloads cleaned CSV → file has no is_outlier_ columns
5. User downloads notebook → notebook references correct filenames
6. User views history → past analysis appears in list
7. User deletes an analysis → it disappears from history

### Auth Edge Cases
1. Wrong password shows inline error (not browser alert)
2. Duplicate email shows clear message
3. Unauthenticated /history access → redirected to /login
4. Token expired → auto-refresh or redirect to /login
5. After sign out, protected routes redirect to login

### Data Edge Cases
1. CSV with all-string columns (e.g., quikr_car.csv raw) → pipeline cleans and produces numeric columns
2. CSV with no date column → Forecast tab shows "No Time Series Detected" message
3. CSV with <50 rows → clustering skipped gracefully
4. CSV with only 1 numeric column → correlation heatmap skipped gracefully
5. Empty CSV → clear error message, no crash

### Chart Tests
1. Charts tab shows PNG images (not blank Recharts components)
2. Images load with shimmer skeleton while downloading
3. Heatmap and cluster charts span full width
4. Histogram bars are visible (not blank/transparent)

### Download Tests
1. cleaned CSV filename matches what the notebook's to_csv() saves to
2. Notebook first cell reads original filename, not cleaned filename
3. PDF download triggers browser file save
