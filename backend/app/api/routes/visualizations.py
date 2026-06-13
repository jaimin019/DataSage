from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.dependencies import get_db
from app.repositories import session_repository
from app.db.models import Visualization
from app.core.exceptions import DataSageException, DatabaseException, SessionNotFoundException
from app.core.auth import CurrentUser

router = APIRouter()


@router.get("/session/{session_id}/visualizations")
async def get_visualizations(session_id: str, user_id: str = CurrentUser, db: AsyncSession = Depends(get_db)):
    try:
        session = await session_repository.verify_ownership(db, session_id, user_id)


        result = await db.execute(
            select(Visualization)
            .where(Visualization.session_id == session_id)
            .where(Visualization.image_url.is_not(None))
            .where(Visualization.image_url != "")
            .order_by(Visualization.sort_order.asc())
        )
        vizs = result.scalars().all()

        from app.schemas.visualizations import VisualizationsResponse, ChartResponse
        charts = []
        for v in vizs:
            # Reconstruct the description from config or fallback, since it's not directly in Visualization
            # Wait, Visualization has chart_id, title, chart_type, config... 
            # Where did we store description? Usually in config or we should store it in Visualization.
            # Actually, looking at the instruction, "The old chart_data and chart_config columns remain (backward compatibility — do not drop them)."
            # We can extract description from v.config if available.
            description = v.config.get("description", "") if isinstance(v.config, dict) else ""
            charts.append(ChartResponse(
                chart_id=v.chart_id or str(v.id),
                type=v.chart_type,
                title=v.title,
                description=description,
                image_url=v.image_url,
                sort_order=v.sort_order
            ))
            
        return VisualizationsResponse(session_id=session_id, charts=charts)
    except DataSageException:
        raise
    except Exception as e:
        raise DatabaseException(f"Unexpected error: {str(e)}")
