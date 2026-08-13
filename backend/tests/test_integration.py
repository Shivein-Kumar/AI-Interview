import sys
import os
import unittest
from unittest.mock import patch, MagicMock
from dotenv import load_dotenv

# Ensure backend root is on Python path for clean imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app

load_dotenv()

client = TestClient(app)


class TestAPIIntegration(unittest.TestCase):
    """Integration test suite covering multi-turn interview workflow and report generation."""

    def setUp(self):
        self.api_key = os.getenv("GROQ_API_KEY")

    def test_mocked_end_to_end_http_workflow(self):
        """Tests the full HTTP multi-step workflow integration: /start -> /answer -> /generate."""
        with patch("services.llm_service.Groq") as mock_groq, patch("os.getenv") as mock_env:
            mock_env.return_value = "mock_key_for_integration"
            mock_client = MagicMock()
            mock_groq.return_value = mock_client

            # 1. Start Interview
            start_response = MagicMock()
            start_response.choices = [MagicMock(message=MagicMock(content="Welcome to the Python interview! What is a list?"))]
            mock_client.chat.completions.create.return_value = start_response

            res1 = client.post("/api/interview/start", json={"topic": "Python", "difficulty": "Easy"})
            self.assertEqual(res1.status_code, 200)
            data1 = res1.json()
            self.assertEqual(data1["first_message"], "Welcome to the Python interview! What is a list?")
            self.assertEqual(len(data1["conversation_history"]), 1)

            # 2. Answer Interview Question
            answer_response = MagicMock()
            answer_response.choices = [MagicMock(message=MagicMock(content="Correct! Now what is a dictionary?"))]
            mock_client.chat.completions.create.return_value = answer_response

            res2 = client.post(
                "/api/interview/answer",
                json={
                    "topic": "Python",
                    "difficulty": "Easy",
                    "user_answer": "A list is an ordered mutable sequence.",
                    "conversation_history": data1["conversation_history"],
                }
            )
            self.assertEqual(res2.status_code, 200)
            data2 = res2.json()
            self.assertEqual(data2["ai_message"], "Correct! Now what is a dictionary?")
            self.assertFalse(data2["is_complete"])
            self.assertEqual(len(data2["conversation_history"]), 3)

            # 3. Generate Report
            report_dict = {
                "score": 90,
                "strengths": "Accurate definition of lists.",
                "weaknesses": "None",
                "revision_areas": "Tuples, Sets, Dicts",
                "verdict": "Great job on Python basics.",
                "recommendation": "Pass",
            }
            report_response = MagicMock()
            report_response.choices = [MagicMock(message=MagicMock(content=str(report_dict).replace("'", '"')))]
            mock_client.chat.completions.create.return_value = report_response

            res3 = client.post(
                "/api/report/generate",
                json={
                    "topic": "Python",
                    "difficulty": "Easy",
                    "conversation_history": data2["conversation_history"],
                }
            )
            self.assertEqual(res3.status_code, 200)
            data3 = res3.json()
            self.assertEqual(data3["score"], 90)
            self.assertEqual(data3["recommendation"], "Pass")

    def test_live_interview_workflow_integration(self):
        """Tests live Groq API end-to-end integration if GROQ_API_KEY is configured."""
        if not self.api_key or self.api_key.startswith("your_"):
            self.skipTest("GROQ_API_KEY is not configured in .env. Skipping live Groq API test.")

        # 1. Start Interview Session
        start_res = client.post("/api/interview/start", json={"topic": "Python Fundamentals", "difficulty": "Easy"})
        self.assertEqual(start_res.status_code, 200)
        start_data = start_res.json()
        history = start_data["conversation_history"]

        # 2. Candidate Submits Answer
        answer_payload = {
            "topic": "Python Fundamentals",
            "difficulty": "Easy",
            "user_answer": "Python is an interpreted, high-level programming language.",
            "conversation_history": history
        }
        answer_res = client.post("/api/interview/answer", json=answer_payload)
        self.assertEqual(answer_res.status_code, 200)
        answer_data = answer_res.json()
        updated_history = answer_data["conversation_history"]

        # 3. Generate Final Report
        report_payload = {
            "topic": "Python Fundamentals",
            "difficulty": "Easy",
            "conversation_history": updated_history
        }
        report_res = client.post("/api/report/generate", json=report_payload)
        self.assertEqual(report_res.status_code, 200)
        report_data = report_res.json()
        self.assertIn("score", report_data)
        self.assertIsInstance(report_data["score"], int)


if __name__ == "__main__":
    unittest.main()
