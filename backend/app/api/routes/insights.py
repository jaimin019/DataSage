from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.dependencies import get_db
from app.repositories import session_repository
from app.db.models import Insight
from app.core.exceptions import DataSageException, DatabaseException, SessionNotFoundException
from app.core.auth import CurrentUser

router = APIRouter()


@router.get("/session/{session_id}/insights")
async def get_insights(session_id: str, user_id: str = CurrentUser, db: AsyncSession = Depends(get_db)):
    try:
        session = await session_repository.verify_ownership(db, session_id, user_id)


        result = await db.execute(
            select(Insight)
            .where(Insight.session_id == session_id)
            .order_by(Insight.rank.asc().nullsfirst())
        )
        insights = result.scalars().all()

        return [
            {
                "id": str(i.id),
                "rank": i.rank,
                "category": i.category,
                "title": i.content[:80] if i.content else "",
                "body": i.content,
                "confidence": i.confidence,
                "importance": i.importance,
                "supporting_columns": i.supporting_columns or [],
            }
            for i in insights
        ]
    except DataSageException:
        raise
    except Exception as e:
        raise DatabaseException(f"Unexpected error: {str(e)}")
