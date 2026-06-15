# DataSage 🧠📊

[![Live Demo](https://img.shields.io/badge/Demo-Live-green.svg)](https://datasage.demo.app)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![TanStack Start](https://img.shields.io/badge/TanStack_Start-Beta-black.svg)](https://tanstack.com/router)

DataSage is an autonomous AI data analyst that instantly cleans, explores, and explains your tabular datasets. Simply upload a CSV file to automatically generate statistical distributions, machine learning clusters, anomaly detection, time-series forecasting, and an interactive chat interface to ask questions directly to your data.

## 📸 Dashboard Preview
*(Insert screenshot of dashboard here)*
![DataSage Dashboard](https://via.placeholder.com/1200x800.png?text=DataSage+Dashboard+Screenshot)

## 🏗 Architecture
DataSage uses a modern decoupled architecture. The frontend handles interactive visualizations while the backend orchestrates a LangGraph-based agentic pipeline combining Python's powerful data science ecosystem (Pandas, Scikit-Learn, Prophet) with Large Language Models.

![Architecture Diagram](https://via.placeholder.com/800x400.png?text=Architecture+Diagram+from+Excalidraw)

## 💻 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | TanStack Start, Vite, React, TailwindCSS v4 | UI Framework and Styling |
| **Components** | ShadCN UI, Framer Motion, Recharts | Accessible UI elements, smooth animations, and data visualizations |
| **Backend** | FastAPI, Python 3.11 | High-performance async API server |
| **ML/Data** | Pandas, Scikit-Learn, Prophet | Data manipulation, clustering, and forecasting |
| **AI Agents** | LangGraph, LangChain, Groq (Llama 3) | Agentic orchestration and LLM reasoning |
| **Database** | Supabase (PostgreSQL + Storage) | Relational data persistence and secure file storage |

## 🚀 Quick Start (Local Setup)

1. **Clone the repository**
   ```bash
   git clone https://github.com/jaimin019/DataSage.git
   cd DataSage
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Copy .env.example to .env and fill in your keys
   cp .env.example .env
   
   # Run the FastAPI server
   uvicorn app.main:app --reload --port 8000
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   
   # Copy .env.example to .env.local
   cp .env.example .env.local
   
   # Run the development server
   npm run dev
   ```

4. **Access the Application**
   Open [http://localhost:3000](http://localhost:3000) (or the port specified by Vite) in your browser.

## 🔐 Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase service role key |
| `DATABASE_URL` | PostgreSQL connection string |
| `GROQ_API_KEY` | API key for LLM inference |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | URL to FastAPI backend (e.g., `http://localhost:8000`) |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 🧪 Demo Data
Check out the `frontend/demo/` folder for sample datasets to try out immediately:
- `sales_data.csv`: Great for testing time-series forecasting.
- `titanic.csv`: Perfect for clustering and anomaly detection.
- `iris.csv`: Classic clean dataset for classification boundaries.
