# DataSage

**Autonomous Multi-Agent Data Analytics Platform**

DataSage is a production-grade, open-source data analyst. Upload any CSV and receive automated cleaning, exploratory analysis, AI-generated insights, anomaly detection, clustering, trend forecasting, and natural language Q&A — in under 60 seconds. No code required. No API costs.

---

## What It Does

Upload a CSV file. DataSage runs a 5-stage multi-agent pipeline automatically:

**Cleaning** — Detects Indian number formatting, strips unit suffixes, handles junk values like "Ask For Price", imputes nulls with median/mode, flags IQR outliers without removing them.

**Exploratory Analysis** — Computes per-column statistics, skewness, kurtosis, Pearson correlations, categorical frequency distributions, and detects year-type columns for time-series routing.

**Visualization** — Generates 6 to 10 Plotly PNG charts: distribution histograms with box plots, correlation heatmaps, scatter plots with OLS trend lines, yearly trend lines, anomaly overlays, and KMeans cluster projections.

**AI Insights** — Sends computed statistics (never raw data) to a Groq-hosted LLM. Returns 5 to 7 ranked business insights with category tags, supporting columns, and 3 to 4 sentence explanations grounded in actual numbers.

**Forecasting** — Detects time-series structure including integer year columns, runs Facebook Prophet, produces 90-day or multi-year forecasts with confidence bands, MAE/MAPE evaluation, and an LLM-written trend interpretation.

**Natural Language Q&A** — A context-aware chat agent retrieves the relevant analysis slice per question type and answers with specific numbers from the actual pipeline results.

---

## Key Features

- Automated data cleaning with an explainable step-by-step report
- 10 chart types rendered as Plotly PNGs served from Supabase Storage
- IsolationForest anomaly detection with per-column Z-score breakdown
- KMeans clustering with automatic k selection via Calinski-Harabasz score
- Prophet forecasting with walk-forward validation metrics
- LangGraph 6-node agent graph with conditional time-series routing
- Provider-agnostic LLM client — swap Groq, HuggingFace, or any OpenAI-compatible endpoint via a single config flag
- Downloadable cleaned CSV (no internal flag columns), Jupyter notebook with actual executed cleaning code, and PDF report
- User authentication via Supabase Auth (email + Google OAuth)
- Analysis history with rename, star, delete, and 50-analysis soft limit
- User preference form — goal, target column, depth, focus areas, and outlier handling — all of which adjust pipeline behavior
- Performance routing by dataset size: MiniBatchKMeans and IsolationForest subsampling activate above 10,000 rows; a 50,000-row dataset completes in under 90 seconds

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | TanStack Start, Vite, React 19, TypeScript, TailwindCSS, ShadCN UI, Framer Motion |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), asyncpg |
| ML Pipeline | Pandas, NumPy, Scikit-learn, SciPy, StatsModels, Prophet |
| Visualization | Plotly (PNG generation via kaleido) |
| Agent Framework | LangGraph |
| LLM Inference | Groq API (llama-3.1-8b-instant) with HuggingFace fallback |
| Database | PostgreSQL via Supabase |
| Storage | Supabase Storage |
| Authentication | Supabase Auth (email + Google OAuth) |
| Deployment | Vercel (frontend), Render (backend), Supabase (DB + storage) |

Infrastructure cost: zero. Every service runs on a free tier.

---

## Architecture

```
Browser (TanStack Start / Vite)
        |
        | HTTPS + JWT
        v
FastAPI Backend (Render)
        |
        +---> LangGraph Pipeline
        |         |
        |         +-- Cleaning Agent
        |         +-- EDA Agent
        |         +-- Visualization Agent (Plotly -> Supabase Storage)
        |         +-- Insight Agent (Groq LLM)
        |         +-- Forecast Agent (Prophet) [conditional]
        |         +-- QA Agent (Groq LLM)
        |
        +---> PostgreSQL (Supabase)   -- sessions, datasets, analyses,
        |                                visualizations, insights, forecasts,
        |                                conversations, reports, analysis_labels
        |
        +---> Supabase Storage        -- original CSV, cleaned CSV,
                                         chart PNGs, PDF reports, notebooks
```

Row Level Security is enabled on all tables. Users can only access their own data at the database level, independent of application code.

---

## Local Setup

**Prerequisites:** Python 3.11+, Node.js 18+, a Supabase project, a Groq API key.

**Backend**

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in .env: DATABASE_URL, SUPABASE_URL, SUPABASE_KEY,
#               SUPABASE_JWT_SECRET, SUPABASE_BUCKET, GROQ_API_KEY
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env
# Fill in .env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_API_URL
npm run dev
```

Open `http://localhost:5173`.

**Database**

Run the SQL migrations in `backend/db/migrations/` inside your Supabase SQL editor. Create a Storage bucket named `insightai-uploads` and set it to private.

---

## Environment Variables

**Backend `.env`**

```
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_BUCKET=insightai-uploads
GROQ_API_KEY=your-groq-api-key
ALLOWED_ORIGINS=http://localhost:5173,https://your-domain.vercel.app
```

**Frontend `.env`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

---

## API Overview

All endpoints except `/api/v1/health` require a Supabase JWT in the `Authorization: Bearer` header.

| Method | Path | Description |
|---|---|---|
| GET | /api/v1/health | Health check |
| POST | /api/v1/upload | Upload CSV + preferences, returns session_id |
| GET | /api/v1/session/{id}/status | Pipeline status with live detail message |
| GET | /api/v1/session/{id}/analysis | EDA, cleaning report, anomaly, cluster results |
| GET | /api/v1/session/{id}/visualizations | Chart metadata with Supabase image URLs |
| GET | /api/v1/session/{id}/insights | Ranked AI-generated business insights |
| GET | /api/v1/session/{id}/forecast | Prophet forecast data and LLM interpretation |
| POST | /api/v1/session/{id}/qa | Ask a natural language question |
| GET | /api/v1/session/{id}/download/cleaned-csv | Cleaned CSV download |
| GET | /api/v1/session/{id}/download/notebook | Jupyter notebook download |
| GET | /api/v1/session/{id}/report | PDF report download |
| GET | /api/v1/history | Paginated analysis history |
| PATCH | /api/v1/session/{id}/label | Rename or star an analysis |
| DELETE | /api/v1/session/{id} | Delete analysis and all associated files |

Full interactive docs at `/docs` when the backend is running.

---

## Deployment

**Vercel (frontend)**

Connect the `frontend/` folder to a Vercel project. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL` as environment variables.

**Render (backend)**

Create a Web Service pointing to `backend/`. Set build command to `pip install -r requirements.txt` and start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Add all backend environment variables.

**Supabase**

Enable Google OAuth under Authentication > Providers. Set the Site URL and Redirect URLs under Authentication > URL Configuration to include your Vercel domain.

---

## Sample Datasets

Three datasets are included in `demo/` for immediate testing:

- `titanic.csv` — 891 rows, mixed types, triggers anomaly detection and clustering
- `quikr_car.csv` — 892 rows, messy string columns, demonstrates the cleaning pipeline
- `sales_timeseries.csv` — has a date column, triggers the Prophet forecasting agent

---

## Project Structure

```
datasage/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI route handlers
│   │   ├── agents/              # LangGraph nodes and orchestrator
│   │   ├── ml/                  # Cleaning, EDA, anomaly, clustering, forecasting
│   │   ├── llm/                 # Provider-agnostic LLM client and prompts
│   │   ├── services/            # Business logic layer
│   │   ├── repositories/        # Data access layer
│   │   ├── db/models.py         # SQLAlchemy ORM models
│   │   └── core/                # Config, exceptions, auth middleware
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── routes/              # TanStack file-based routes
│       ├── components/          # UI components by feature
│       ├── store/               # Zustand state management
│       ├── lib/                 # API client and TypeScript types
│       └── hooks/               # Custom React hooks
└── demo/                        # Sample CSV datasets
```
---

*Built as a full-stack ML engineering portfolio project demonstrating multi-agent LLM orchestration, production FastAPI architecture, and modern React frontend patterns.*
