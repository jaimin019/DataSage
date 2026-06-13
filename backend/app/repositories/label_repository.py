from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.sql import func
from app.db.models import AnalysisLabel
from app.core.exceptions import DatabaseException
from typing import Optional

class LabelRepository:

    async def upsert(
        self,
        db:           AsyncSession,
        session_id:   str,
        user_id:      str,
        display_name: Optional[str],
        is_starred:   Optional[bool],
    ) -> AnalysisLabel:
        """
        Creates or updates the label for a session.
        Uses manual upsert pattern.
        Only updates fields that are not None.
        """
        try:
            existing = await self._get_by_session(db, session_id)

            if existing:
                if display_name is not None:
                    existing.display_name = display_name
                if is_starred is not None:
                    existing.is_starred = is_starred
                existing.updated_at = func.now()
                await db.flush()
                return existing
            else:
                label = AnalysisLabel(
                    session_id=session_id,
                    user_id=user_id,
                    display_name=display_name,
                    is_starred=is_starred if is_starred is not None else False,
                )
                db.add(label)
                await db.flush()
                return label
        except SQLAlchemyError as e:
            raise DatabaseException(str(e))

    async def _get_by_session(
        self, db: AsyncSession, session_id: str
    ) -> Optional[AnalysisLabel]:
        try:
            result = await db.execute(
                select(AnalysisLabel).where(AnalysisLabel.session_id == session_id)
            )
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            raise DatabaseException(str(e))

# Module-level instance for easier import
label_repository = LabelRepository()
