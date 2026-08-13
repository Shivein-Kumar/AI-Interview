import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ReportPage from "../page";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

describe("Report Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders loading state initially and then displays report components on successful API response", async () => {
    const history = [
      { role: "assistant", content: "What is OOP?" },
      { role: "user", content: "Object Oriented Programming." },
    ];

    mockSearchParams.set("topic", "Python");
    mockSearchParams.set("difficulty", "Medium");
    mockSearchParams.set("conversationHistory", encodeURIComponent(JSON.stringify(history)));

    const mockReportData = {
      score: 85,
      strengths: "Great explanation of classes and objects.",
      weaknesses: "Could elaborate on multiple inheritance.",
      revision_areas: "Multiple Inheritance, MRO, Mixins",
      verdict: "Strong technical knowledge.",
      recommendation: "Pass",
    };

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData,
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<ReportPage />);

    // Verify loading state
    expect(screen.getByText("Generating your report...")).toBeInTheDocument();

    // Verify API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/report/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: "Python",
            difficulty: "Medium",
            conversation_history: history,
          }),
        }
      );
    });

    // Verify header, badges, score, recommendation, and 4 cards
    await waitFor(() => {
      expect(screen.getByText("Interview Complete")).toBeInTheDocument();
    });

    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();

    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("PASS")).toBeInTheDocument();

    expect(screen.getByText("Strengths")).toBeInTheDocument();
    expect(screen.getByText("Great explanation of classes and objects.")).toBeInTheDocument();

    expect(screen.getByText("Areas for Improvement")).toBeInTheDocument();
    expect(screen.getByText("Could elaborate on multiple inheritance.")).toBeInTheDocument();

    expect(screen.getByText("Topics to Revise")).toBeInTheDocument();
    expect(screen.getByText("Multiple Inheritance, MRO, Mixins")).toBeInTheDocument();

    expect(screen.getByText("Interviewer's Verdict")).toBeInTheDocument();
    expect(screen.getByText("Strong technical knowledge.")).toBeInTheDocument();

    // Test Start New Interview button
    const startNewBtn = screen.getByRole("button", { name: /Start New Interview/i });
    fireEvent.click(startNewBtn);
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("displays error message with retry button when API fails, and retries on click", async () => {
    mockSearchParams.set("topic", "Algorithms");
    mockSearchParams.set("difficulty", "Hard");

    // First fetch fails
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Server error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          score: 45,
          strengths: "Basic recall",
          weaknesses: "Weak problem solving",
          revision_areas: "DP, Graphs",
          verdict: "Needs practice",
          recommendation: "Fail",
        }),
      });
    vi.stubGlobal("fetch", mockFetch);

    render(<ReportPage />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText("Report Generation Failed")).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /Retry Generating Report/i });
    fireEvent.click(retryBtn);

    // Verify retry succeeds
    await waitFor(() => {
      expect(screen.getByText("FAIL")).toBeInTheDocument();
    });
  });
});
