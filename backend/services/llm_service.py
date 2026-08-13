import json
import logging
import os
import re
from typing import Any, Dict, List, Tuple
from dotenv import load_dotenv
from groq import Groq

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("llm_service")

# Load environment variables from .env file
load_dotenv()

MODEL_NAME: str = "llama-3.3-70b-versatile"

INTERVIEWER_SYSTEM_PROMPT: str = """You are an expert technical interviewer conducting an interview on the topic: {topic} at {difficulty} difficulty level.

Guidelines:
- Ask one clear focused question at a time appropriate to the topic ({topic}) and difficulty ({difficulty}).
- At Easy difficulty: ask basic recall and definition questions.
- At Medium difficulty: ask applied understanding and problem-solving questions.
- At Hard difficulty: ask deep expertise, trade-off, and system-thinking questions.
- Evaluate each answer, and after each response decide one of three things:
  a. If the answer is strong: acknowledge briefly in one sentence, then ask a question on a different aspect of the topic.
  b. If the answer is partially correct: probe deeper with one specific follow-up, do not reveal the correct answer.
  c. If the answer is incorrect: note the gap in one sentence, then move to a different question.
- Monitor overall performance throughout:
  - If the candidate is clearly struggling across multiple topics, naturally conclude the interview early with a kind note.
  - If the candidate is performing very well, feel free to wrap up after covering the key areas rather than continuing unnecessarily.
- When concluding the interview early or naturally, end your message with the exact phrase: [INTERVIEW COMPLETE]
- Never teach, never give hints, never reveal answers.
- Keep tone professional, neutral, and encouraging.
- Ask only one question per message."""


REPORT_SYSTEM_PROMPT: str = """You are an expert interview evaluator. Read the full technical interview conversation transcript provided.

Scoring Guide:
- 85 to 100 is excellent performance
- 70 to 84 is good performance
- 55 to 69 is adequate performance
- Below 55 is weak performance

Return ONLY a valid JSON object with no extra text, explanations, or markdown formatting (do not wrap in ```json or any code blocks).

The JSON must have exactly these fields:
{
  "score": <integer from 0 to 100 based on the scoring guide>,
  "strengths": "<string, 2 to 4 specific sentences referencing actual answers>",
  "weaknesses": "<string, 2 to 4 specific sentences referencing gaps>",
  "revision_areas": "<string, comma-separated list of 3 to 5 specific topics>",
  "verdict": "<string, 2 to 3 sentences of overall direct assessment>",
  "recommendation": "<exactly the word Pass or the word Fail>"
}"""


def get_groq_client() -> Groq:
    """Helper to initialize Groq client using GROQ_API_KEY environment variable.

    Raises:
        ValueError: If GROQ_API_KEY environment variable is missing.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY environment variable is not set.")
        raise ValueError("GROQ_API_KEY environment variable is not set.")
    return Groq(api_key=api_key)


def get_next_interviewer_message(
    topic: str, difficulty: str, conversation_history: List[Dict[str, Any]]
) -> Tuple[str, bool]:
    """Generates the next interviewer message from the LLM.

    Args:
        topic: The technical topic for the interview.
        difficulty: The target difficulty level (Easy/Medium/Hard).
        conversation_history: List of prior message objects.

    Returns:
        Tuple[str, bool]: (response_text, is_complete)
    """
    logger.info(f"Generating next interviewer message for topic='{topic}', difficulty='{difficulty}', history_len={len(conversation_history)}")
    
    try:
        client = get_groq_client()
        system_message = {
            "role": "system",
            "content": INTERVIEWER_SYSTEM_PROMPT.format(
                topic=topic, difficulty=difficulty
            ),
        }
        messages = [system_message] + conversation_history

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.7,
            max_tokens=500,
        )

        content: str = response.choices[0].message.content or ""
        is_complete: bool = "[INTERVIEW COMPLETE]" in content

        if is_complete:
            content = content.replace("[INTERVIEW COMPLETE]", "").strip()
            logger.info("Interview conclusion tag [INTERVIEW COMPLETE] detected.")

        return content, is_complete
    except Exception as e:
        logger.error(f"Error in get_next_interviewer_message: {e}", exc_info=True)
        raise RuntimeError(f"LLM interviewer service error: {str(e)}") from e


def generate_interview_report(
    topic: str, difficulty: str, conversation_history: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Generates an evaluation report from the interview conversation history.

    Args:
        topic: The technical topic for the interview.
        difficulty: The target difficulty level.
        conversation_history: Complete list of conversation messages.

    Returns:
        Dict[str, Any]: Parsed report dictionary containing score, strengths, weaknesses, revision_areas, verdict, recommendation.
    """
    logger.info(f"Generating interview report for topic='{topic}', difficulty='{difficulty}', history_len={len(conversation_history)}")
    
    try:
        client = get_groq_client()

        transcript_lines = [
            f"Interview Topic: {topic}",
            f"Difficulty: {difficulty}",
            "\n--- Conversation Transcript ---",
        ]
        for msg in conversation_history:
            role = str(msg.get("role", "user")).capitalize()
            text = str(msg.get("content", ""))
            transcript_lines.append(f"{role}: {text}")

        transcript = "\n".join(transcript_lines)

        messages = [
            {"role": "system", "content": REPORT_SYSTEM_PROMPT},
            {"role": "user", "content": transcript},
        ]

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.3,
            max_tokens=1000,
        )

        raw_content: str = response.choices[0].message.content or ""

        try:
            report_data: Dict[str, Any] = json.loads(raw_content)
        except json.JSONDecodeError as json_err:
            logger.warning(f"Direct JSON parsing failed ({json_err}). Attempting regex extraction fallback.")
            match = re.search(r"\{.*\}", raw_content, re.DOTALL)
            if match:
                report_data = json.loads(match.group(0))
            else:
                logger.error(f"Regex extraction failed to parse JSON from LLM response: {raw_content}")
                raise ValueError(
                    f"Failed to parse JSON report from LLM response: {raw_content}"
                ) from json_err

        return report_data
    except Exception as e:
        logger.error(f"Error in generate_interview_report: {e}", exc_info=True)
        raise RuntimeError(f"LLM report service error: {str(e)}") from e
