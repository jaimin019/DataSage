from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
import math
from app.api.dependencies import get_db
from app.core.auth import CurrentUser
from app.schemas.history import HistoryResponse, HistoryItem, LabelUpdateRequest
from app.repositories import session_repository
from app.repositories.label_repository import label_repository
from app.services.deletion_service import DeletionService, get_deletion_service

router = APIRouter()

@router.get("/history", response_model=HistoryResponse)
async def get_history(
    page:         int  = Query(default=1, ge=1),
    limit:        int  = Query(default=20, ge=1, le=50),
    starred_only: bool = Query(default=False),
    user_id: str       = CurrentUser,
    db: AsyncSession   = Depends(get_db),
):
    items, total = await session_repository.get_history(
        db, user_id=user_id,
        page=page, limit=limit, starred_only=starred_only,
    )
    
    # We parse to dicts, but the response_model takes HistoryItem, 
    # so we should be okay passing the dicts to HistoryResponse
    return HistoryResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=math.ceil(total / limit) if total > 0 else 1,
    )

@router.patch("/session/{session_id}/label", response_model=HistoryItem)
async def update_label(
    session_id: str,
    body:       LabelUpdateRequest,
    user_id:    str          = CurrentUser,
    db:         AsyncSession = Depends(get_db),
):
    """Rename an analysis or star/unstar it."""
    await session_repository.verify_ownership(db, session_id, user_id)

    # Upsert analysis_labels row
    label = await label_repository.upsert(
        db,
        session_id=session_id,
        user_id=user_id,
        display_name=body.display_name,
        is_starred=body.is_starred,
    )
    
    # We need to return a HistoryItem for this session to match response_model.
    # We can fetch it by doing get_history for just this session.
    items, total = await session_repository.get_history(db, user_id=user_id, page=1, limit=1)
    
    # find the matching session from history items
    item_dict = next((i for i in items if i["session_id"] == session_id), None)
    if not item_dict:
        # Fallback if somehow not in history query
        return HistoryItem(
            session_id=session_id,
            status="done",
            created_at=label.created_at,
            original_name=None,
            cleaned_filename=None,
            row_count=None,
            col_count=None,
            file_size_bytes=None,
            display_name=label.display_name,
            is_starred=label.is_starred,
            insight_count=0,
            has_forecast=False,
            chart_count=0,
            preferences_summary=None
        )

    return HistoryItem(**item_dict)

@router.delete("/session/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id:       str,
    user_id:          str             = CurrentUser,
    db:               AsyncSession    = Depends(get_db),
    deletion_service: DeletionService = Depends(get_deletion_service),
):
    """
    Permanently deletes a session, all its analysis data, and all
    associated files from Supabase Storage.
    Returns 204 No Content on success.
    Returns 403 if the session belongs to a different user.
    """
    await deletion_service.delete_session(session_id, user_id)
