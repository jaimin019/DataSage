from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.dependencies import get_db
from app.schemas.upload import SessionStatusResponse
from app.repositories import session_repository
from app.db.models import Analysis, Forecast, Dataset
from app.core.exceptions import DataSageException, DatabaseException, SessionNotFoundException
from app.core.auth import CurrentUser
import uuid

router = APIRouter()

@router.get("/session/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(session_id: str, user_id: str = CurrentUser, db: AsyncSession = Depends(get_db)):
    try:
        session = await session_repository.verify_ownership(db, session_id, user_id)

        from app.schemas.preferences import UserPreferences
        prefs_summary = None
        if hasattr(session, 'preferences') and session.preferences:
            prefs_summary = UserPreferences(**session.preferences).to_summary()

        return SessionStatusResponse(
            session_id=session.id,
            status=session.status,
            error_msg=session.error_msg,
            status_detail=session.status_detail,
            preferences_summary=prefs_summary,
            updated_at=session.updated_at
        )
    except DataSageException:
        raise
    except Exception as e:
        raise DatabaseException(f"Unexpected error: {str(e)}")

@router.get("/session/{session_id}/analysis")
async def get_session_analysis(session_id: str, user_id: str = CurrentUser, db: AsyncSession = Depends(get_db)):
    try:
        session = await session_repository.verify_ownership(db, session_id, user_id)
        
            
        result = await db.execute(select(Analysis).where(Analysis.session_id == session_id))
        analyses = result.scalars().all()
        
        response = {}
        for a in analyses:
            if a.analysis_type == "cleaning_report":
                response["cleaning_report"] = a.results
            elif a.analysis_type == "eda_summary":
                response["eda_summary"] = a.results
            elif a.analysis_type == "anomaly_results":
                response["anomaly"] = a.results
            elif a.analysis_type == "cluster_results":
                response["cluster"] = a.results
            
            if hasattr(a, 'suggested_questions') and a.suggested_questions:
                response["suggested_questions"] = a.suggested_questions
                
        return response
    except DataSageException:
        raise
    except Exception as e:
        raise DatabaseException(f"Unexpected error: {str(e)}")

@router.get("/session/{session_id}/forecast")
async def get_session_forecast(session_id: str, user_id: str = CurrentUser, db: AsyncSession = Depends(get_db)):
    try:
        session = await session_repository.verify_ownership(db, session_id, user_id)
        
            
        result = await db.execute(select(Forecast).where(Forecast.session_id == session_id))
        forecast = result.scalars().first()
        
        if not forecast:
            return None
            
        return forecast.forecast_data
    except DataSageException:
        raise
    except Exception as e:
        raise DatabaseException(f"Unexpected error: {str(e)}")

@router.get("/session/{session_id}/dataset")
async def get_session_dataset(session_id: str, user_id: str = CurrentUser, db: AsyncSession = Depends(get_db)):
    try:
        session = await session_repository.verify_ownership(db, session_id, user_id)
        
            
        result = await db.execute(select(Dataset).where(Dataset.session_id == session_id))
        dataset = result.scalars().first()
        
        if not dataset:
            return None
            
        return {
            "filename": dataset.filename,
            "row_count": dataset.row_count,
            "col_count": dataset.col_count,
            "file_size_bytes": dataset.file_size_bytes,
            "columns": dataset.columns_info,
            "cleaned_filename": dataset.cleaned_filename
        }
    except DataSageException:
        raise
    except Exception as e:
        raise DatabaseException(f"Unexpected error: {str(e)}")
