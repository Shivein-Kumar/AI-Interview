import json
import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend root is on Python path for clean imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app
from schemas import StartInterviewRequest, AnswerRequest, ReportRequest
from services.llm_service import (
    INTERVIEWER_SYSTEM_PROMPT,
    REPORT_SYSTEM_PROMPT,
    MODEL_NAME,
    get_groq_client,
    get_next_interviewer_message,
    generate_interview_report,
)

client = TestClient(app)


class TestSchemasUnit(unittest.TestCase):
    """Unit tests for Pydantic request schemas."""

    def test_start_interview_request_schema(self):
        req = StartInterviewRequest(topic="Data Structures", difficulty="Easy")
        self.assertEqual(req.topic, "Data Structures")
        self.assertEqual(req.difficulty, "Easy")

    def test_answer_request_schema(self):
        req = AnswerRequest(
            topic="Algorithms",
            difficulty="Hard",
            user_answer="O(N log N)",
            conversation_history=[{"role": "user", "content": "hello"}],
        )
        self.assertEqual(req.user_answer, "O(N log N)")
        self.assertEqual(len(req.conversation_history), 1)

    def test_report_request_schema(self):
        req = ReportRequest(
            topic="System Design",
            difficulty="Medium",
            conversation_history=[{"role": "user", "content": "test"}],
        )
        self.assertEqual(req.topic, "System Design")
        self.assertEqual(len(req.conversation_history), 1)


class TestLLMServiceUnit(unittest.TestCase):
    """Unit tests for LLM service prompt formatting, Groq API interaction, and response parsing."""

    def test_constants_and_prompts(self):
        """Verify model name and prompt template variable placeholders."""
        self.assertEqual(MODEL_NAME, "llama-3.3-70b-versatile")

        # Test INTERVIEWER_SYSTEM_PROMPT formatting
        formatted_interviewer = INTERVIEWER_SYSTEM_PROMPT.format(
            topic="Python Data Structures", difficulty="Medium"
        )
        self.assertIn("Python Data Structures", formatted_interviewer)
        self.assertIn("Medium", formatted_interviewer)
        self.assertIn("[INTERVIEW COMPLETE]", INTERVIEWER_SYSTEM_PROMPT)

        # Test REPORT_SYSTEM_PROMPT key phrases
        self.assertIn("Scoring Guide:", REPORT_SYSTEM_PROMPT)
        self.assertIn("recommendation", REPORT_SYSTEM_PROMPT)

    @patch("os.getenv")
    def test_get_groq_client_missing_key(self, mock_getenv):
        """Verify ValueError is raised when GROQ_API_KEY is missing."""
        mock_getenv.return_value = None
        with self.assertRaises(ValueError) as ctx:
            get_groq_client()
        self.assertIn(
            "GROQ_API_KEY environment variable is not set", str(ctx.exception)
        )

    @patch("services.llm_service.get_groq_client")
    def test_get_next_interviewer_message_ongoing(self, mock_get_client):
        """Verify ongoing interviewer message generation without completion tag."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content="Can you explain Python list comprehensions?"
                )
            )
        ]
        mock_client.chat.completions.create.return_value = mock_response

        history = [{"role": "assistant", "content": "Welcome!"}]
        message, is_complete = get_next_interviewer_message("Python", "Easy", history)

        self.assertEqual(message, "Can you explain Python list comprehensions?")
        self.assertFalse(is_complete)
        mock_client.chat.completions.create.assert_called_once()

    @patch("services.llm_service.get_groq_client")
    def test_get_next_interviewer_message_completion(self, mock_get_client):
        """Verify completion tag detection and stripping."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content="Thank you for your responses. Have a great day! [INTERVIEW COMPLETE]"
                )
            )
        ]
        mock_client.chat.completions.create.return_value = mock_response

        history = [{"role": "user", "content": "I am done."}]
        message, is_complete = get_next_interviewer_message("Python", "Easy", history)

        self.assertEqual(message, "Thank you for your responses. Have a great day!")
        self.assertTrue(is_complete)

    @patch("services.llm_service.get_groq_client")
    def test_generate_interview_report_clean_json(self, mock_get_client):
        """Verify report generation with clean JSON output."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        valid_report = {
            "score": 88,
            "strengths": "Demonstrated solid understanding of lists and dicts.",
            "weaknesses": "Struggled slightly with generator memory overhead.",
            "revision_areas": "Generators, Iterators, Asyncio",
            "verdict": "Candidate performed strongly on core concepts.",
            "recommendation": "Pass",
        }
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content=json.dumps(valid_report)))
        ]
        mock_client.chat.completions.create.return_value = mock_response

        history = [
            {"role": "assistant", "content": "What is a dict?"},
            {"role": "user", "content": "A hash map implementation."},
        ]
        report = generate_interview_report("Python", "Medium", history)

        self.assertEqual(report["score"], 88)
        self.assertEqual(report["recommendation"], "Pass")
        self.assertIn("Generators", report["revision_areas"])

    @patch("services.llm_service.get_groq_client")
    def test_generate_interview_report_regex_fallback(self, mock_get_client):
        """Verify regex fallback parsing when LLM output wraps JSON in markdown text."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        raw_llm_output = """Here is your evaluation report:
```json
{
  "score": 62,
  "strengths": "Understands basic syntax.",
  "weaknesses": "Needs work on algorithms.",
  "revision_areas": "Trees, Graphs, Sorting",
  "verdict": "Adequate performance but requires revision.",
  "recommendation": "Fail"
}
```
Hope this helps!"""

        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(message=MagicMock(content=raw_llm_output))
        ]
        mock_client.chat.completions.create.return_value = mock_response

        history = [
            {"role": "assistant", "content": "Question"},
            {"role": "user", "content": "Answer"},
        ]
        report = generate_interview_report("Algorithms", "Hard", history)

        self.assertEqual(report["score"], 62)
        self.assertEqual(report["recommendation"], "Fail")


class TestAPIUnit(unittest.TestCase):
    """Unit tests for FastAPI routers and request validation."""

    def test_root_endpoint(self):
        """Test health check GET / endpoint."""
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(), {"message": "AI Interview Coach API is running"}
        )

    def test_start_interview_validation_error(self):
        """Test 422 Unprocessable Entity when required fields are empty/invalid."""
        response = client.post("/api/interview/start", json={"topic": ""})
        self.assertEqual(response.status_code, 422)

    def test_answer_interview_validation_error(self):
        """Test 422 validation error when user_answer is missing."""
        response = client.post(
            "/api/interview/answer",
            json={"topic": "Python", "difficulty": "Easy", "conversation_history": []},
        )
        self.assertEqual(response.status_code, 422)

    def test_report_generate_validation_error(self):
        """Test 422 validation error when conversation_history is empty or missing."""
        response = client.post(
            "/api/report/generate",
            json={"topic": "Python", "difficulty": "Easy", "conversation_history": []},
        )
        self.assertEqual(response.status_code, 422)

    @patch("routers.interview.get_next_interviewer_message")
    def test_start_interview_endpoint_success(self, mock_get_msg):
        """Test successful start interview route handling."""
        mock_get_msg.return_value = ("What is the GIL in Python?", False)

        response = client.post(
            "/api/interview/start",
            json={"topic": "Python", "difficulty": "Hard"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["first_message"], "What is the GIL in Python?")
        self.assertEqual(
            payload["conversation_history"],
            [{"role": "assistant", "content": "What is the GIL in Python?"}],
        )

    @patch("routers.interview.get_next_interviewer_message")
    def test_answer_interview_endpoint_success(self, mock_get_msg):
        """Test successful answer interview route handling."""
        mock_get_msg.return_value = ("Good explanation of thread locks.", False)

        initial_history = [{"role": "assistant", "content": "What is the GIL?"}]
        response = client.post(
            "/api/interview/answer",
            json={
                "topic": "Python",
                "difficulty": "Hard",
                "user_answer": (
                    "Global Interpreter Lock that limits thread execution."
                ),
                "conversation_history": initial_history,
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            payload["ai_message"], "Good explanation of thread locks."
        )
        self.assertFalse(payload["is_complete"])
        self.assertEqual(len(payload["conversation_history"]), 3)

    @patch("routers.report.generate_interview_report")
    def test_report_generate_endpoint_success(self, mock_gen_report):
        """Test successful report generation route handling."""
        expected_report = {
            "score": 95,
            "strengths": "Deep knowledge of multi-threading.",
            "weaknesses": "None",
            "revision_areas": "Asyncio, Multiprocessing, CPython",
            "verdict": "Outstanding technical performance.",
            "recommendation": "Pass",
        }
        mock_gen_report.return_value = expected_report

        history = [
            {"role": "assistant", "content": "What is the GIL?"},
            {"role": "user", "content": "Global Interpreter Lock."},
        ]
        response = client.post(
            "/api/report/generate",
            json={
                "topic": "Python",
                "difficulty": "Hard",
                "conversation_history": history,
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected_report)

    @patch("routers.interview.get_next_interviewer_message")
    def test_global_exception_handler(self, mock_get_msg):
        """Test global exception handler catches unhandled exceptions and returns HTTP 500 JSON response."""
        mock_get_msg.side_effect = RuntimeError("Unexpected internal crash")

        response = client.post(
            "/api/interview/start",
            json={"topic": "Python", "difficulty": "Easy"},
        )
        self.assertEqual(response.status_code, 500)
        data = response.json()
        self.assertIn("detail", data)


if __name__ == "__main__":
    unittest.main()
