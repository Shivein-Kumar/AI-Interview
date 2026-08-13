import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InterviewPage from "../page";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

describe("Interview Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders header badges, first AI message, and input form on load", () => {
    const firstMsg = "What is a Binary Search Tree?";
    const history = [{ role: "assistant", content: firstMsg }];

    mockSearchParams.set("topic", "Binary Trees");
    mockSearchParams.set("difficulty", "Medium");
    mockSearchParams.set("firstMessage", encodeURIComponent(firstMsg));
    mockSearchParams.set("conversationHistory", encodeURIComponent(JSON.stringify(history)));

    render(<InterviewPage />);

    expect(screen.getByText("Binary Trees")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Interview in progress")).toBeInTheDocument();

    expect(screen.getByText("Interviewer")).toBeInTheDocument();
    expect(screen.getByText(firstMsg)).toBeInTheDocument();

    expect(screen.getByPlaceholderText("Type your answer here...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit Answer" })).toBeInTheDocument();
  });

  it("submits user answer and renders AI response", async () => {
    const firstMsg = "What is a BST?";
    const initialHistory = [{ role: "assistant", content: firstMsg }];

    mockSearchParams.set("topic", "Binary Trees");
    mockSearchParams.set("difficulty", "Medium");
    mockSearchParams.set("firstMessage", encodeURIComponent(firstMsg));
    mockSearchParams.set("conversationHistory", encodeURIComponent(JSON.stringify(initialHistory)));

    const mockAnswerResponse = {
      ai_message: "Good job! Now explain tree traversal.",
      is_complete: false,
      conversation_history: [
        ...initialHistory,
        { role: "user", content: "A BST is a node-based binary tree structure." },
        { role: "assistant", content: "Good job! Now explain tree traversal." },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnswerResponse,
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<InterviewPage />);

    const textarea = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(textarea, {
      target: { value: "A BST is a node-based binary tree structure." },
    });

    const submitBtn = screen.getByRole("button", { name: "Submit Answer" });
    fireEvent.click(submitBtn);

    // Verify user message appears immediately
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("A BST is a node-based binary tree structure.")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/interview/answer",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: "Binary Trees",
            difficulty: "Medium",
            user_answer: "A BST is a node-based binary tree structure.",
            conversation_history: initialHistory,
          }),
        }
      );
    });

    // Verify AI response renders
    await waitFor(() => {
      expect(screen.getByText("Good job! Now explain tree traversal.")).toBeInTheDocument();
    });
  });

  it("navigates to /report when is_complete is true", async () => {
    const firstMsg = "Final question.";
    const initialHistory = [{ role: "assistant", content: firstMsg }];

    mockSearchParams.set("topic", "Binary Trees");
    mockSearchParams.set("difficulty", "Medium");
    mockSearchParams.set("firstMessage", encodeURIComponent(firstMsg));
    mockSearchParams.set("conversationHistory", encodeURIComponent(JSON.stringify(initialHistory)));

    const mockCompleteResponse = {
      ai_message: "Interview complete. Thank you!",
      is_complete: true,
      conversation_history: [
        ...initialHistory,
        { role: "user", content: "Answer" },
        { role: "assistant", content: "Interview complete. Thank you!" },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockCompleteResponse,
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<InterviewPage />);

    const textarea = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(textarea, { target: { value: "Answer" } });

    const submitBtn = screen.getByRole("button", { name: "Submit Answer" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/report?topic=Binary%20Trees&difficulty=Medium&conversationHistory=")
      );
    });
  });
});
