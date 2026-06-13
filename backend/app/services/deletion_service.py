import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings

logger = logging.getLogger(__name__)

class DeletionService:
    def __init__(self, supabase_client, session_repo, db: AsyncSession):
        self.supabase = supabase_client
        self.session_repo = session_repo
        self.db = db

    async def delete_session(self, session_id: str, user_id: str) -> None:
        """
        Fully deletes a session:
          1. Verify ownership
          2. Delete ALL files from Supabase Storage under {session_id}/
          3. Delete the session DB row (CASCADE deletes all child rows)

        Storage structure that gets cleaned up:
          {session_id}/cleaned/{cleaned_filename}.csv
          {session_id}/charts/{chart_id}.png  (multiple)
          {session_id}/reports/report.pdf
          {session_id}/{original_filename}.csv (original upload)
        """
        # 1. Verify ownership first — hard stop if not owner
        await self.session_repo.verify_ownership(self.db, session_id, user_id)

        # 2. Clean up Supabase Storage
        await self._delete_storage_folder(session_id)

        # 3. Delete DB row (all child tables cascade)
        await self.session_repo.delete_session(self.db, session_id)

        logger.info(f"Session {session_id} deleted by user {user_id}")

    async def _delete_storage_folder(self, session_id: str) -> None:
        """
        Lists and deletes every file under the session folder in Supabase Storage.
        Handles missing files gracefully — never raises if a file doesn't exist.
        """
        bucket = settings.SUPABASE_BUCKET

        # Sub-folders to check and clean
        prefixes = [
            f"{session_id}/",          # root (original uploaded CSV)
            f"{session_id}/cleaned/",  # cleaned CSV
            f"{session_id}/charts/",   # Plotly PNG images
            f"{session_id}/reports/",  # PDF reports
        ]

        for prefix in prefixes:
            try:
                # List all files under this prefix
                files = self.supabase.storage.from_(bucket).list(prefix)
                if not files:
                    continue

                # Build full paths for deletion
                paths_to_delete = [
                    f"{prefix}{f['name']}"
                    for f in files
                    if f.get('name')   # filter out metadata entries
                ]

                if paths_to_delete:
                    self.supabase.storage.from_(bucket).remove(paths_to_delete)
                    logger.info(
                        f"Deleted {len(paths_to_delete)} files from {prefix}"
                    )

            except Exception as e:
                # Log but don't fail the deletion — DB cleanup is more important
                logger.warning(f"Storage cleanup failed for {prefix}: {e}")

from app.services.upload_service import supabase
import app.repositories.session_repository as session_repository
from fastapi import Depends
from app.api.dependencies import get_db

async def get_deletion_service(db: AsyncSession = Depends(get_db)) -> DeletionService:
    return DeletionService(supabase, session_repository, db)
