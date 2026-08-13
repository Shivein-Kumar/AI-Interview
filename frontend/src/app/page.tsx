"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Backend Health Check State
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);
  const [backendError, setBackendError] = useState("");

  const checkBackendHealth = async () => {
    setIsCheckingBackend(true);
    setBackendError("");
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${baseUrl}/`, { cache: "no-store" });
      if (res.ok) {
        setIsBackendHealthy(true);
      } else {
        setIsBackendHealthy(false);
        setBackendError(
          `Backend server at ${baseUrl} returned HTTP status ${res.status}. Please verify your backend configuration.`
        );
      }
    } catch {
      setIsBackendHealthy(false);
      setBackendError(
        `Backend server is offline or unreachable at ${baseUrl}. Please start the backend server (cd backend && python main.py) before starting an interview.`
      );
    } finally {
      setIsCheckingBackend(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isBackendHealthy === false) {
      setError(
        "Cannot start interview: Backend server is offline. Please start the backend service first."
      );
      return;
    }

    // Validate both topic and difficulty
    if (!topic.trim() || !difficulty) {
      setError("Please provide both an interview topic and difficulty level.");
      return;
    }

    setIsLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/interview/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty: difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      const encodedTopic = encodeURIComponent(topic.trim());
      const encodedDifficulty = encodeURIComponent(difficulty);
      const encodedFirstMessage = encodeURIComponent(data.first_message);
      const encodedConversationHistory = encodeURIComponent(
        JSON.stringify(data.conversation_history)
      );

      router.push(
        `/interview?topic=${encodedTopic}&difficulty=${encodedDifficulty}&firstMessage=${encodedFirstMessage}&conversationHistory=${encodedConversationHistory}`
      );
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError("Something went wrong communicating with backend. Please ensure backend is running.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 animate-fade-in">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3 text-center">
          AI Interview Coach
        </h1>

        {/* Subtitle */}
        <p className="text-slate-400 text-center max-w-sm text-sm sm:text-base mb-4 leading-relaxed">
          Practice technical interviews with an AI-powered interviewer. Get real
          feedback. Improve fast.
        </p>

        {/* Backend Status Indicator */}
        {isCheckingBackend ? (
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-medium bg-slate-900 border border-slate-800 px-3 py-1 rounded-full mb-6">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />
            <span>Checking backend health...</span>
          </div>
        ) : isBackendHealthy ? (
          <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-medium bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded-full mb-6">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Backend Online & Healthy</span>
          </div>
        ) : null}

        {/* Backend Server Offline Warning Banner */}
        {isBackendHealthy === false && (
          <div className="w-full bg-red-950/80 border border-red-800 text-red-200 p-4 rounded-xl mb-6 shadow-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm leading-relaxed">
                <h3 className="font-bold text-red-100 text-base mb-1">
                  Backend Server Unavailable
                </h3>
                <p className="text-red-300 text-xs sm:text-sm mb-3">
                  {backendError}
                </p>
                <Button
                  type="button"
                  onClick={checkBackendHealth}
                  disabled={isCheckingBackend}
                  variant="outline"
                  size="sm"
                  className="bg-red-900/50 border-red-700 text-red-100 hover:bg-red-900 hover:text-white text-xs font-semibold"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isCheckingBackend ? "animate-spin" : ""}`} />
                  {isCheckingBackend ? "Checking..." : "Retry Connection"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Card Form */}
        <Card className="w-full bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl text-slate-100 font-bold">
              Start Your Session
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs sm:text-sm">
              Select a technical topic and difficulty to generate your custom interview.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {/* Topic Field */}
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-slate-200 text-sm font-medium">
                  Interview Topic
                </Label>
                <Input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Binary Trees, Sorting Algorithms, Dynamic Programming"
                  className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-700"
                  disabled={isLoading || isBackendHealthy === false}
                />
              </div>

              {/* Difficulty Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-slate-200 text-sm font-medium">
                  Difficulty Level
                </Label>
                <Select
                  value={difficulty}
                  onValueChange={setDifficulty}
                  disabled={isLoading || isBackendHealthy === false}
                >
                  <SelectTrigger
                    id="difficulty"
                    className="bg-slate-950 border-slate-800 text-slate-100 focus:ring-slate-700"
                  >
                    <SelectValue placeholder="Select difficulty level" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="Easy" className="focus:bg-slate-800 focus:text-slate-100 cursor-pointer">
                      Easy
                    </SelectItem>
                    <SelectItem value="Medium" className="focus:bg-slate-800 focus:text-slate-100 cursor-pointer">
                      Medium
                    </SelectItem>
                    <SelectItem value="Hard" className="focus:bg-slate-800 focus:text-slate-100 cursor-pointer">
                      Hard
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Inline Error Message */}
              {error && (
                <div className="text-sm font-medium text-red-400 bg-red-950/40 border border-red-900/50 rounded-md p-3 text-center">
                  {error}
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={isLoading || isBackendHealthy === false}
                className="w-full bg-slate-100 text-slate-950 hover:bg-slate-200 font-semibold py-2.5 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Starting Interview..." : "Start Interview"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Footer Note */}
        <p className="mt-6 text-xs text-slate-500 text-center font-medium">
          Powered by AI. Built for learners.
        </p>
      </div>
    </main>
  );
}
