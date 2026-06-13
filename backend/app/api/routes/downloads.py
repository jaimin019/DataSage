from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.dependencies import get_db
from app.db.models import Dataset, Analysis, Forecast
from app.core.exceptions import DatabaseException
from app.services.upload_service import supabase
from app.core.config import settings
from app.services.notebook_generator import NotebookGenerator
import io
import json
from app.core.auth import CurrentUser
from app.repositories import session_repository

router = APIRouter()

@router.get("/session/{session_id}/download/cleaned-csv")
async def download_cleaned_csv(session_id: str, user_id: str = CurrentUser, db: AsyncSession = Depends(get_db)):
    try:
        await session_repository.verify_ownership(db, session_id, user_id)
        res = await db.execute(select(Dataset).where(Dataset.session_id == session_id))
        dataset = res.scalars().first()
        
        if not dataset:
            raise DatabaseException("Dataset not found")
            
        if not dataset.cleaned_path:
            raise HTTPException(status_code=404, detail="Cleaning not yet complete")
            
        file_bytes = supabase.storage.from_(settings.SUPABASE_BUCKET).download(dataset.cleaned_path)
        
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{dataset.cleaned_filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise DatabaseException(f"Failed to download cleaned CSV: {str(e)}")

@router.get("/session/{session_id}/download/notebook")
async def download_notebook(session_id: str, user_id: str = CurrentUser, db: AsyncSession = Depends(get_db)):
    try:
        await session_repository.verify_ownership(db, session_id, user_id)
        res = await db.execute(select(Dataset).where(Dataset.session_id == session_id))
        dataset = res.scalars().first()
        
        if not dataset:
            raise DatabaseException("Dataset not found")
            
        res = await db.execute(select(Analysis).where(Analysis.session_id == session_id))
        analyses = res.scalars().all()
        
        cleaning_report = {}
        eda_summary = {}
        anomaly_report = {}
        cluster_report = {}
        
        for a in analyses:
            if a.analysis_type == "cleaning_report":
                cleaning_report = a.results
            elif a.analysis_type == "eda_summary":
                eda_summary = a.results
            elif a.analysis_type == "anomaly_results":
                anomaly_report = a.results
            elif a.analysis_type == "cluster_results":
                cluster_report = a.results
                
        res = await db.execute(select(Forecast).where(Forecast.session_id == session_id))
        forecast = res.scalars().first()
        forecast_result = forecast.forecast_data if forecast else None
        
        dataset_info = {
            "original_name": dataset.filename,
            "row_count": dataset.row_count,
            "col_count": dataset.col_count
        }
        
        cleaned_filename = f"cleaned_{dataset.filename}"
        notebook_data = NotebookGenerator().generate(
            dataset_info=dataset_info,
            cleaning_report=cleaning_report,
            eda_summary=eda_summary,
            anomaly_report=anomaly_report,
            cluster_report=cluster_report,
            forecast_result=forecast_result,
            cleaned_filename=cleaned_filename
        )
        
        notebook_bytes = json.dumps(notebook_data, indent=2).encode('utf-8')
        dataset_name = dataset.filename.rsplit('.', 1)[0]
        notebook_filename = f"{dataset_name}_analysis.ipynb"
        
        return StreamingResponse(
            io.BytesIO(notebook_bytes),
            media_type="application/x-ipynb+json",
            headers={
                "Content-Disposition": f'attachment; filename="{notebook_filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            }
        )
    except Exception as e:
        raise DatabaseException(f"Failed to generate notebook: {str(e)}")
