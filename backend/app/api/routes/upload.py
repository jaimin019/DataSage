from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks
import json
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_db
from app.schemas.upload import UploadResponse, SessionStatusResponse
from app.schemas.preferences import UserPreferences
from app.services import upload_service
from app.repositories import session_repository
from app.db.models import Dataset
from app.core.exceptions import DataSageException, DatabaseException, SessionNotFoundException
from app.ml.pipeline_runner import pipeline_runner
from app.core.auth import CurrentUser
from fastapi import HTTPException, status
import uuid

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    preferences: str = Form(default="{}"),
    user_id: str = CurrentUser,
    db: AsyncSession = Depends(get_db)
):
    try:
        try:
            pref_dict = json.loads(preferences)
            user_prefs = UserPreferences(**pref_dict)
        except Exception:
            pref_dict = {}
            user_prefs = UserPreferences()

        await upload_service.validate_file(file)
        
        async with db.begin_nested():
            existing_count = await session_repository.count_by_user(db, user_id)
            if existing_count >= 50:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"You have reached the 50-analysis limit. "
                        f"Please delete old analyses to upload new ones."
                    ),
                )
            session = await session_repository.create_session(
                db, user_id=user_id, preferences=user_prefs.model_dump()
            )
        
        session_id_str = str(session.id)
        
        file_path = await upload_service.save_to_supabase(file, session_id_str)
        
        metadata = await upload_service.get_csv_metadata(file)
        
        dataset = Dataset(
            session_id=session.id,
            filename=metadata.filename,
            cleaned_filename=metadata.cleaned_filename,
            row_count=metadata.row_count,
            col_count=metadata.col_count,
            file_size_bytes=metadata.file_size_bytes,
            columns_info=[c.model_dump() for c in metadata.columns]
        )
        db.add(dataset)
        await db.commit()
        
        background_tasks.add_task(pipeline_runner.run, session_id_str, file_path, db, user_prefs.model_dump())
        
        return UploadResponse(
            session_id=session.id,
            status=session.status,
            message="File uploaded successfully",
            dataset_info=metadata
        )
    except DataSageException:
        raise
    except HTTPException:
        raise
    except Exception as e:
        raise DatabaseException(f"Unexpected error: {str(e)}")

