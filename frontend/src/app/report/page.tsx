"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, RefreshCw, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ReportData {
  score: number;
  strengths: string;
  weaknesses: string;
  revision_areas: string;
  verdict: string;
  recommendation: string;
}

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const topic = searchParams.get("topic") || "Technical Interview";
  const difficulty = searchParams.get("difficulty") || "Medium";
  const rawHistory = searchParams.get("conversationHistory");

  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError("");

    let conversationHistory: Array<{ role: string; content: string }> = [];
    if (rawHistory) {
      try {
        conversationHistory = JSON.parse(decodeURIComponent(rawHistory));
      } catch {
        console.error("Failed to parse conversationHistory from URL search params");
      }
    }

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${baseUrl}/api/report/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          difficulty,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP status ${response.status}`);
      }

      const data: ReportData = await response.json();
      setReport(data);
    } catch (err) {
      console.error("Failed to generate report:", err);
      setError("Failed to generate your evaluation report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [topic, difficulty, rawHistory]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 animate-fade-in">
        <div className="bg-slate-100 border border-slate-300 rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl max-w-[800px] w-full flex flex-col items-center my-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col items-center space-y-3 w-full max-w-sm">
            <Skeleton className="h-16 w-16 rounded-full bg-slate-300" />
            <Skeleton className="h-8 w-64 bg-slate-300" />
            <div className="flex space-x-2">
              <Skeleton className="h-6 w-24 bg-slate-300" />
              <Skeleton className="h-6 w-20 bg-slate-300" />
            </div>
          </div>

          {/* Score & Recommendation Banner Skeleton */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-around bg-white border border-slate-200 rounded-xl p-5 shadow-sm gap-4">
            <div className="flex flex-col items-center space-y-2">
              <Skeleton className="h-3 w-20 bg-slate-200" />
              <Skeleton className="h-12 w-32 rounded-xl bg-slate-200" />
            </div>
            <div className="flex flex-col items-center space-y-2">
              <Skeleton className="h-3 w-24 bg-slate-200" />
              <Skeleton className="h-10 w-24 rounded-md bg-slate-200" />
            </div>
          </div>

          {/* 4 Cards Skeleton Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-lg p-4 space-y-2">
              <Skeleton className="h-5 w-28 bg-slate-200" />
              <Skeleton className="h-4 w-full bg-slate-200" />
              <Skeleton className="h-4 w-3/4 bg-slate-200" />
            </div>
            <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 rounded-lg p-4 space-y-2">
              <Skeleton className="h-5 w-36 bg-slate-200" />
              <Skeleton className="h-4 w-full bg-slate-200" />
              <Skeleton className="h-4 w-4/5 bg-slate-200" />
            </div>
            <div className="bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded-lg p-4 space-y-2">
              <Skeleton className="h-5 w-32 bg-slate-200" />
              <Skeleton className="h-4 w-full bg-slate-200" />
              <Skeleton className="h-4 w-2/3 bg-slate-200" />
            </div>
            <div className="bg-white border border-slate-200 border-l-4 border-l-slate-400 rounded-lg p-4 space-y-2">
              <Skeleton className="h-5 w-40 bg-slate-200" />
              <Skeleton className="h-4 w-full bg-slate-200" />
              <Skeleton className="h-4 w-5/6 bg-slate-200" />
            </div>
          </div>

          {/* Loading status indicator */}
          <div className="flex items-center space-x-2 text-slate-500 text-sm font-medium pt-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span>Generating your report...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error State with Retry Button
  if (error || !report) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="bg-red-950/80 border border-red-800 text-red-200 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-red-100">
            Report Generation Failed
          </h2>
          <p className="text-red-300 text-sm leading-relaxed">
            {error || "An unexpected error occurred while fetching your evaluation report."}
          </p>
          <div className="pt-2 flex justify-center space-x-3">
            <Button
              onClick={fetchReport}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-2.5"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Generating Report
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="bg-transparent border-red-700 text-red-100 hover:bg-red-900/50"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Helper for score color styling
  const getScoreColorClass = (score: number) => {
    if (score >= 70) {
      return "bg-emerald-50 text-emerald-700 border-emerald-300";
    }
    if (score >= 50) {
      return "bg-amber-50 text-amber-700 border-amber-300";
    }
    return "bg-red-50 text-red-700 border-red-300";
  };

  const isPass = report.recommendation.trim().toLowerCase() === "pass";

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 animate-fade-in">
      {/* Light Background Report Area (Max width 800px) */}
      <div className="bg-slate-100 border border-slate-300 rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl max-w-[800px] w-full flex flex-col items-center text-slate-900 my-6">
        
        {/* Header & Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
            <Trophy className="h-9 w-9 text-emerald-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Interview Complete
          </h1>

          {/* Topic & Difficulty Badges */}
          <div className="flex items-center space-x-2.5 mt-3">
            <Badge variant="outline" className="bg-white border-slate-300 text-slate-800 font-semibold px-3 py-1 text-xs sm:text-sm">
              {topic}
            </Badge>
            <Badge variant="outline" className="bg-white border-slate-300 text-slate-800 font-semibold px-3 py-1 text-xs sm:text-sm">
              {difficulty}
            </Badge>
          </div>
        </div>

        {/* Score & Recommendation Banner */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-around bg-white border border-slate-200 rounded-xl p-5 mb-8 shadow-sm gap-4">
          {/* Prominent Score Element */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Overall Score
            </span>
            <div
              className={`px-6 py-2 rounded-xl border-2 font-black text-3xl sm:text-4xl shadow-sm ${getScoreColorClass(
                report.score
              )}`}
            >
              {report.score} <span className="text-lg font-medium text-slate-500">/ 100</span>
            </div>
          </div>

          {/* Recommendation Badge */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Recommendation
            </span>
            <Badge
              className={`text-sm sm:text-base px-6 py-2 font-extrabold tracking-wider shadow-sm uppercase ${
                isPass
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {isPass ? "PASS" : "FAIL"}
            </Badge>
          </div>
        </div>

        {/* 4 Cards in Responsive 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
          {/* Card 1: Strengths */}
          <Card className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mr-2" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 leading-relaxed">
              {report.strengths}
            </CardContent>
          </Card>

          {/* Card 2: Areas for Improvement */}
          <Card className="bg-white border border-slate-200 border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 leading-relaxed">
              {report.weaknesses}
            </CardContent>
          </Card>

          {/* Card 3: Topics to Revise */}
          <Card className="bg-white border border-slate-200 border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                <RefreshCw className="h-4 w-4 text-blue-600 mr-2" />
                Topics to Revise
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 leading-relaxed">
              {report.revision_areas}
            </CardContent>
          </Card>

          {/* Card 4: Interviewer's Verdict */}
          <Card className="bg-white border border-slate-200 border-l-4 border-l-slate-400 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">
                Interviewer&apos;s Verdict
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700 leading-relaxed">
              {report.verdict}
            </CardContent>
          </Card>
        </div>

        {/* Start New Interview Button */}
        <Button
          onClick={() => router.push("/")}
          className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 font-semibold px-8 py-3 text-base shadow-lg transition-colors"
        >
          Start New Interview
        </Button>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-slate-950 text-slate-400 flex items-center justify-center">
          Loading report session...
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}
