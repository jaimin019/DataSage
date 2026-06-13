from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from app.db.models import Session
from app.core.exceptions import DatabaseException, SessionNotFoundException
from typing import List, Optional, Tuple
from fastapi import HTTPException

async def create_session(db: AsyncSession, user_id: str, preferences: dict = None) -> Session:
    try:
        new_session = Session(status="pending", user_id=user_id, preferences=preferences or {})
        db.add(new_session)
        await db.flush()
        return new_session
    except SQLAlchemyError as e:
        await db.rollback()
        raise DatabaseException(str(e))

async def get_session(db: AsyncSession, session_id: str) -> Optional[Session]:
    try:
        result = await db.execute(select(Session).where(Session.id == session_id))
        return result.scalars().first()
    except SQLAlchemyError as e:
        raise DatabaseException(str(e))

from sqlalchemy import update
from sqlalchemy.sql import func

async def update_status(
    db: AsyncSession,
    session_id: str,
    status: str,
    error_msg: Optional[str] = None,
    detail: Optional[str] = None
) -> None:
    try:
        stmt = (
            update(Session)
            .where(Session.id == session_id)
            .values(
                status=status,
                updated_at=func.now(),
                error_msg=error_msg,
                status_detail=detail
            )
        )
        await db.execute(stmt)
        await db.commit()
    except SQLAlchemyError as e:
        await db.rollback()
        raise DatabaseException(str(e))

async def get_all_sessions(db: AsyncSession, limit: int = 50) -> List[Session]:
    try:
        result = await db.execute(select(Session).order_by(Session.created_at.desc()).limit(limit))
        return list(result.scalars().all())
    except SQLAlchemyError as e:
        raise DatabaseException(str(e))

async def count_by_user(db: AsyncSession, user_id: str) -> int:
    try:
        result = await db.execute(
            select(func.count(Session.id)).where(Session.user_id == user_id)
        )
        return result.scalar_one()
    except SQLAlchemyError as e:
        raise DatabaseException(str(e))

async def get_history(
    db: AsyncSession,
    user_id: str,
    page: int = 1,
    limit: int = 20,
    starred_only: bool = False,
) -> Tuple[List[dict], int]:
    from app.db.models import Dataset, AnalysisLabel, Insight, Forecast, Visualization
    from sqlalchemy.orm import aliased
    from sqlalchemy import String, Integer, cast

    try:
        # Count total query
        count_stmt = select(func.count(Session.id)).where(Session.user_id == user_id)
        if starred_only:
            count_stmt = count_stmt.outerjoin(AnalysisLabel, AnalysisLabel.session_id == Session.id).where(AnalysisLabel.is_starred == True)
        
        total_result = await db.execute(count_stmt)
        total_count = total_result.scalar_one()

        # Data query
        offset = (page - 1) * limit
        stmt = (
            select(
                Session.id.label("session_id"),
                Session.status,
                Session.created_at,
                Session.preferences.label("preferences"),
                Dataset.filename.label("original_name"),
                Dataset.cleaned_filename,
                Dataset.row_count,
                Dataset.col_count,
                Dataset.file_size_bytes,
                AnalysisLabel.display_name,
                AnalysisLabel.is_starred,
                func.count(Insight.id.distinct()).label("insight_count"),
                func.count(Forecast.id.distinct()).label("has_forecast"),
                func.count(Visualization.id.distinct()).label("chart_count")
            )
            .outerjoin(Dataset, Dataset.session_id == Session.id)
            .outerjoin(AnalysisLabel, AnalysisLabel.session_id == Session.id)
            .outerjoin(Insight, Insight.session_id == Session.id)
            .outerjoin(Forecast, Forecast.session_id == Session.id)
            .outerjoin(Visualization, Visualization.session_id == Session.id)
            .where(Session.user_id == user_id)
        )

        if starred_only:
            stmt = stmt.where(AnalysisLabel.is_starred == True)

        stmt = (
            stmt.group_by(Session.id, Dataset.id, AnalysisLabel.id)
            .order_by(Session.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        result = await db.execute(stmt)
        rows = result.all()

        items = []
        for row in rows:
            import json
            prefs_summary = None
            if row.preferences:
                from app.schemas.preferences import UserPreferences
                prefs_summary = UserPreferences(**row.preferences).to_summary()

            items.append({
                "session_id": str(row.session_id),
                "status": row.status,
                "created_at": row.created_at,
                "original_name": row.original_name,
                "cleaned_filename": row.cleaned_filename,
                "row_count": row.row_count,
                "col_count": row.col_count,
                "file_size_bytes": row.file_size_bytes,
                "display_name": row.display_name,
                "is_starred": bool(row.is_starred),
                "insight_count": row.insight_count,
                "has_forecast": row.has_forecast > 0,
                "chart_count": row.chart_count,
                "preferences_summary": prefs_summary
            })

        return items, total_count
    except SQLAlchemyError as e:
        raise DatabaseException(str(e))

async def verify_ownership(db: AsyncSession, session_id: str, user_id: str) -> Session:
    try:
        result = await db.execute(select(Session).where(Session.id == session_id))
        session = result.scalar_one_or_none()

        if not session:
            raise SessionNotFoundException(session_id)
        if str(session.user_id) != user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access this analysis.",
            )
        return session
    except SessionNotFoundException:
        raise
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise DatabaseException(str(e))

from sqlalchemy import delete

async def delete_session(db: AsyncSession, session_id: str) -> None:
    try:
        await db.execute(delete(Session).where(Session.id == session_id))
        await db.commit()
    except SQLAlchemyError as e:
        await db.rollback()
        raise DatabaseException(str(e))

