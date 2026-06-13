from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import DataSageException, datasage_exception_handler
from app.core.logging_config import logger
from app.api.routes import health, upload, session, insights, visualizations, qa, report, downloads, history

app = FastAPI(title="DataSage API", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Token-Expired"],
)

app.add_exception_handler(DataSageException, datasage_exception_handler)

app.include_router(health.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(session.router, prefix="/api/v1")
app.include_router(insights.router, prefix="/api/v1")
app.include_router(visualizations.router, prefix="/api/v1")
app.include_router(qa.router, prefix="/api/v1")
app.include_router(report.router, prefix="/api/v1")
app.include_router(downloads.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    logger.info("DataSage API started")

@app.get("/")
async def root():
    return {"message": "DataSage API", "docs": "/docs"}
