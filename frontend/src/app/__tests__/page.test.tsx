import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Home from "../page";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Landing Page (Home Component)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title, subtitle, card components, and checks healthy backend status", async () => {
    const mockFetch = vi.fn().mockImplementation((url) => {
      if (url === "http://localhost:8000/") {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<Home />);

    expect(screen.getByRole("heading", { name: /AI Interview Coach/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Practice technical interviews with an AI-powered interviewer\. Get real feedback\. Improve fast\./i
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Start Your Session")).toBeInTheDocument();
    expect(screen.getByLabelText(/Interview Topic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Difficulty Level/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start Interview/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Backend Online & Healthy")).toBeInTheDocument();
    });
  });

  it("displays prominent warning banner when backend server is offline", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Connection Refused"));
    vi.stubGlobal("fetch", mockFetch);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Backend Server Unavailable")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Backend server is offline or unreachable at http:\/\/localhost:8000\./i)
    ).toBeInTheDocument();

    // Verify retry connection button exists
    expect(screen.getByRole("button", { name: /Retry Connection/i })).toBeInTheDocument();
  });

  it("shows validation error when submitting with empty topic or difficulty", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Backend Online & Healthy")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /Start Interview/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Please provide both an interview topic and difficulty level\./i)
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("submits form successfully and navigates when backend is healthy", async () => {
    const mockApiResponse = {
      first_message: "Welcome! What is a Binary Search Tree?",
      conversation_history: [{ role: "assistant", content: "Welcome! What is a Binary Search Tree?" }],
    };

    const mockFetch = vi.fn().mockImplementation((url) => {
      if (url === "http://localhost:8000/") {
        return Promise.resolve({ ok: true });
      }
      if (url === "http://localhost:8000/api/interview/start") {
        return Promise.resolve({
          ok: true,
          json: async () => mockApiResponse,
        });
      }
      return Promise.reject(new Error("Unknown route"));
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Backend Online & Healthy")).toBeInTheDocument();
    });

    const topicInput = screen.getByLabelText(/Interview Topic/i);
    fireEvent.change(topicInput, { target: { value: "Binary Trees" } });

    const selectTrigger = screen.getByLabelText(/Difficulty Level/i);
    fireEvent.keyDown(selectTrigger, { key: "ArrowDown", code: "ArrowDown" });

    const mediumItem = await screen.findByRole("option", { name: "Medium" });
    fireEvent.click(mediumItem);

    const submitBtn = screen.getByRole("button", { name: /Start Interview/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/interview/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: "Binary Trees", difficulty: "Medium" }),
        }
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/interview?topic=Binary%20Trees&difficulty=Medium&firstMessage=")
      );
    });
  });
});
