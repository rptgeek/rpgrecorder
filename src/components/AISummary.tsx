"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface AISummaryProps {
  sessionId: string;
  initialSummary?: string | null;
}

export function AISummary({ sessionId, initialSummary }: AISummaryProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/inngest/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "session/transcription.completed",
          data: { sessionId },
        }),
      });

      if (!res.ok) {
        // Fallback to old path if events endpoint fails
        await fetch("/api/inngest", {
          method: "POST",
          body: JSON.stringify({
            name: "session/transcription.completed",
            data: { sessionId },
          }),
        });
      }

      alert("Regeneration triggered! Please refresh in a few moments.");
    } catch (error) {
      console.error("Error regenerating summary:", error);
      alert("Error regenerating summary.");
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!summary) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-bold mb-4">AI Summary</h2>
        <p className="text-gray-600 mb-4">No summary available yet. It may be processing.</p>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isRegenerating ? "Triggering..." : "Generate Summary"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">AI Summary</h2>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
        >
          {isRegenerating ? "Triggering..." : "Regenerate"}
        </button>
      </div>
      <div className="prose max-w-none">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    </div>
  );
}
