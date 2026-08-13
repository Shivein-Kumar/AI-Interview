import logging
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, status
from schemas import StartInterviewRequest, AnswerRequest
from services.llm_service import get_next_interviewer_message

logger = logging.getLogger("routers.interview")

router = APIRouter(prefix="/api/interview", tags=["interview"])


@router.post("/start")
def start_interview(request: StartInterviewRequest) -> Dict[str, Any]:
    """Endpoint to initiate an interview session and get the AI's opening question."""
    logger.info(
        f"POST /api/interview/start called with topic='{request.topic}', difficulty='{request.difficulty}'"
    )
    try:
        first_message, _ = get_next_interviewer_message(
            request.topic, request.difficulty, []
        )
        conversation_history: List[Dict[str, Any]] = [
            {"role": "assistant", "content": first_message}
        ]
        return {
            "first_message": first_message,
            "conversation_history": conversation_history,
        }
    except ValueError as ve:
        logger.warning(f"Validation error in start_interview: {ve}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Internal error in start_interview: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start interview session: {str(e)}",
        )


@router.post("/answer")
def answer_interview(request: AnswerRequest) -> Dict[str, Any]:
    """Endpoint to submit candidate answer and receive the AI's follow-up or conclusion."""
    logger.info(
        f"POST /api/interview/answer called for topic='{request.topic}', history_len={len(request.conversation_history)}"
    )
    try:
        updated_history: List[Dict[str, Any]] = list(request.conversation_history)
        updated_history.append({"role": "user", "content": request.user_answer})

        ai_message, is_complete = get_next_interviewer_message(
            request.topic, request.difficulty, updated_history
        )

        updated_history.append({"role": "assistant", "content": ai_message})

        return {
            "ai_message": ai_message,
            "is_complete": is_complete,
            "conversation_history": updated_history,
        }
    except ValueError as ve:
        logger.warning(f"Validation error in answer_interview: {ve}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Internal error in answer_interview: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process answer: {str(e)}",
        )
