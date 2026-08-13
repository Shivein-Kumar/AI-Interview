import logging
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status
from schemas import ReportRequest
from services.llm_service import generate_interview_report

logger = logging.getLogger("routers.report")

router = APIRouter(prefix="/api/report", tags=["report"])


@router.post("/generate")
def generate_report(request: ReportRequest) -> Dict[str, Any]:
    """Endpoint to generate evaluation report from interview conversation history."""
    logger.info(
        f"POST /api/report/generate called for topic='{request.topic}', history_len={len(request.conversation_history)}"
    )
    try:
        report: Dict[str, Any] = generate_interview_report(
            request.topic, request.difficulty, request.conversation_history
        )
        return report
    except ValueError as ve:
        logger.warning(f"Validation error in generate_report: {ve}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Internal error in generate_report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate evaluation report: {str(e)}",
        )
