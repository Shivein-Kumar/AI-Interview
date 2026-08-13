"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  role: string;
  content: string;
}

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const topic = searchParams.get("topic") || "General Technical";
  const difficulty = searchParams.get("difficulty") || "Medium";
  const rawFirstMessage = searchParams.get("firstMessage");
  const rawHistory = searchParams.get("conversationHistory");

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize messages and conversation history on load from search parameters
  useEffect(() => {
    let decodedFirstMessage = "";
    if (rawFirstMessage) {
      try {
        decodedFirstMessage = decodeURIComponent(rawFirstMessage);
      } catch {
        decodedFirstMessage = rawFirstMessage;
      }
    }

    let parsedHistory: Array<{ role: string; content: string }> = [];
    if (rawHistory) {
      try {
        parsedHistory = JSON.parse(decodeURIComponent(rawHistory));
      } catch {
        if (decodedFirstMessage) {
          parsedHistory = [{ role: "assistant", content: decodedFirstMessage }];
        }
      }
    } else if (decodedFirstMessage) {
      parsedHistory = [{ role: "assistant", content: decodedFirstMessage }];
    }

    if (decodedFirstMessage) {
      setMessages([{ role: "assistant", content: decodedFirstMessage }]);
    }
    setConversationHistory(parsedHistory);
  }, [rawFirstMessage, rawHistory]);

  // Automatically scroll chat to bottom when new messages arrive or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const answerText = currentInput.trim();
    if (!answerText || isLoading) return;

    setError("");

    // 2. Add the user message to messages with role "user"
    setMessages((prev) => [...prev, { role: "user", content: answerText }]);

    // 3. Set isLoading to true, clear currentInput
    setIsLoading(true);
    setCurrentInput("");

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // 4. POST request to NEXT_PUBLIC_API_URL + /api/interview/answer
      const response = await fetch(`${baseUrl}/api/interview/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          difficulty,
          user_answer: answerText,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      // 5. Add ai_message to messages with role "assistant" & update conversationHistory
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.ai_message },
      ]);
      setConversationHistory(data.conversation_history);

      // If is_complete is true, navigate to /report with params
      if (data.is_complete) {
        const encodedTopic = encodeURIComponent(topic);
        const encodedDifficulty = encodeURIComponent(difficulty);
        const encodedHistory = encodeURIComponent(
          JSON.stringify(data.conversation_history)
        );

        router.push(
          `/report?topic=${encodedTopic}&difficulty=${encodedDifficulty}&conversationHistory=${encodedHistory}`
        );
      }
    } catch (err) {
      console.error("Failed to process answer:", err);
      setError("Failed to communicate with interviewer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 animate-fade-in">
      {/* Part 1: Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Badge className="bg-slate-800 text-slate-100 hover:bg-slate-700 border-slate-700 text-xs sm:text-sm px-3 py-1 font-semibold">
            {topic}
          </Badge>
          <Badge className="bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700 text-xs sm:text-sm px-3 py-1 font-semibold">
            {difficulty}
          </Badge>
        </div>
        <div className="flex items-center space-x-2 text-slate-400 text-xs sm:text-sm font-medium">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>Interview in progress</span>
        </div>
      </header>

      {/* Part 2: Scrollable Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, index) => {
            const isAI = msg.role === "assistant";
            return (
              <div
                key={index}
                className={`flex flex-col ${
                  isAI ? "items-start" : "items-end"
                }`}
              >
                {/* Sender Label */}
                <span className="text-xs text-slate-400 font-medium mb-1.5 px-1">
                  {isAI ? "Interviewer" : "You"}
                </span>

                {/* Message Bubble */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl max-w-xl text-sm sm:text-base leading-relaxed shadow-md ${
                    isAI
                      ? "bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none"
                      : "bg-blue-600 text-white rounded-tr-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {/* AI Thinking State */}
          {isLoading && (
            <div className="flex flex-col items-start">
              <span className="text-xs text-slate-400 font-medium mb-1.5 px-1">
                Interviewer
              </span>
              <div className="bg-slate-900 border border-slate-800 text-slate-400 p-4 rounded-2xl rounded-tl-none max-w-xl text-sm flex items-center space-x-3">
                <span className="flex space-x-1">
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                </span>
                <span>AI is thinking...</span>
              </div>
            </div>
          )}

          {/* Inline Error Message */}
          {error && (
            <div className="bg-red-950/50 border border-red-900/60 text-red-300 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Part 3: Input Area at Bottom */}
      <footer className="bg-slate-900 border-t border-slate-800 p-4 sm:p-5 flex-shrink-0">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-3"
        >
          <Textarea
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer here..."
            disabled={isLoading}
            className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-700 min-h-[70px] sm:min-h-[80px] flex-1 resize-none"
          />
          <Button
            type="submit"
            disabled={isLoading || !currentInput.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-6 sm:self-end w-full sm:w-auto transition-colors disabled:opacity-50"
          >
            {isLoading ? "AI is thinking..." : "Submit Answer"}
          </Button>
        </form>
      </footer>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-slate-950 text-slate-400 flex items-center justify-center">
          Loading interview session...
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  );
}
