from typing import Any, Dict, List
from pydantic import BaseModel, Field


class StartInterviewRequest(BaseModel):
    topic: str = Field(..., description="The technical topic for the interview", min_length=1)
    difficulty: str = Field(..., description="Difficulty level (e.g. Easy, Medium, Hard)", min_length=1)


class AnswerRequest(BaseModel):
    topic: str = Field(..., description="The technical topic for the interview", min_length=1)
    difficulty: str = Field(..., description="Difficulty level (e.g. Easy, Medium, Hard)", min_length=1)
    user_answer: str = Field(..., description="The candidate's response text", min_length=1)
    conversation_history: List[Dict[str, Any]] = Field(
        default_factory=list, description="Prior conversation messages"
    )


class ReportRequest(BaseModel):
    topic: str = Field(..., description="The technical topic for the interview", min_length=1)
    difficulty: str = Field(..., description="Difficulty level", min_length=1)
    conversation_history: List[Dict[str, Any]] = Field(
        ..., description="Full conversation transcript messages", min_items=1
    )
