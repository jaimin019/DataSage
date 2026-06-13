from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.dependencies import get_db
from app.repositories import session_repository
from app.db.models import Conversation, Analysis
from app.agents.qa_agent import QAAgent
from app.llm.client import LLMClient
from app.core.exceptions import DataSageException, DatabaseException, SessionNotFoundException
from app.core.auth import CurrentUser

router = APIRouter()


class QuestionRequest(BaseModel):
    question: str


@router.post("/session/{session_id}/qa")
async def ask_question(
    session_id: str,
    body: QuestionRequest,
    user_id: str = CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    try:
        session = await session_repository.verify_ownership(db, session_id, user_id)


        # Retrieve analysis data
        result = await db.execute(
            select(Analysis).where(Analysis.session_id == session_id)
        )
        analyses = result.scalars().all()

        eda_summary = {}
        anomaly_report = None
        cluster_report = None
        cleaning_report = None
        for a in analyses:
            if a.analysis_type == "eda_summary":
                eda_summary = a.results
            elif a.analysis_type == "anomaly_results":
                anomaly_report = a.results
            elif a.analysis_type == "cluster_results":
                cluster_report = a.results
            elif a.analysis_type == "cleaning_report":
                cleaning_report = a.results

        from app.db.models import Forecast
        forecast_res = await db.execute(select(Forecast).where(Forecast.session_id == session_id))
        forecast = forecast_res.scalars().first()
        forecast_result = forecast.forecast_data if forecast else None

        if not eda_summary:
            raise DatabaseException("Analysis not yet complete for this session")

        # Run QA agent
        llm = LLMClient()
        agent = QAAgent(llm)
        answer_data = await agent.answer(
            session_id=session_id,
            question=body.question,
            eda_summary=eda_summary,
            anomaly_report=anomaly_report,
            cluster_report=cluster_report,
            forecast_result=forecast_result,
            cleaning_report=cleaning_report,
            filename=session.original_filename if hasattr(session, 'original_filename') else "dataset"
        )

        # Save conversation
        user_msg = Conversation(
            session_id=session_id,
            role="user",
            content=body.question,
        )
        assistant_msg = Conversation(
            session_id=session_id,
            role="assistant",
            content=answer_data["answer"],
        )
        db.add(user_msg)
        db.add(assistant_msg)
        await db.commit()

        return {
            "answer": answer_data["answer"],
            "question_type": answer_data["question_type"],
            "supporting_columns": answer_data.get("supporting_columns", []),
            "conversation_id": str(assistant_msg.id),
        }
    except DataSageException:
        raise
    except Exception as e:
        raise DatabaseException(f"Unexpected error: {str(e)}")


@router.get("/session/{session_id}/conversation")
async def get_conversation(session_id: str, user_id: str = CurrentUser, db: AsyncSession = Depends(get_db)):
    try:
        session = await session_repository.verify_ownership(db, session_id, user_id)


        result = await db.execute(
            select(Conversation)
            .where(Conversation.session_id == session_id)
            .order_by(Conversation.created_at.asc())
        )
        messages = result.scalars().all()

        return [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]
    except DataSageException:
        raise
    except Exception as e:
        raise DatabaseException(f"Unexpected error: {str(e)}")
