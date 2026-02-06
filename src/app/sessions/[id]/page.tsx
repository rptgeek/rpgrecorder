"use client"; // Add use client directive

import { getSessionById, updateSession, refreshSessionTranscription } from "@/lib/actions/session"; 
import { generatePresignedGetObject } from "@/lib/aws/s3";
import { notFound } from "next/navigation";
import TranscriptDisplay from "@/components/TranscriptDisplay";
import React, { useRef, useState, useEffect, use } from "react";
import NotesEditor from "@/components/NotesEditor";
import AudioRecorder from "@/components/AudioRecorder"; 
import { AISummary } from "@/components/AISummary";
import { parseSessionMetrics } from "@/lib/metrics/parser";
import SpeakerStats from "@/components/SpeakerStats";

interface SessionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { id } = use(params);
  const [sessionData, setSessionData] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    async function loadSession() {
      let session;
      try {
        session = await getSessionById(id);
        setSessionData(session);
        if (session.audioStorageKey) {
          const url = await generatePresignedGetObject(session.audioStorageKey);
          setAudioUrl(url);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        if (error instanceof Error && (error.message.includes("not found") || error.message.includes("unauthorized"))) {
          notFound();
        }
        throw error;
      }
    }
    loadSession();
  }, [id]);

  const handleRefreshStatus = async () => {
    if (!sessionData?.id) return;
    setIsRefreshing(true);
    try {
      const result = await refreshSessionTranscription(sessionData.id);
      if (result && typeof result === 'object' && 'id' in result) {
        setSessionData(result);
      } else if (result && 'status' in result) {
        alert(`Transcription status: ${result.status}`);
      }
    } catch (error) {
      console.error("Failed to refresh transcription status:", error);
      alert("Error checking transcription status.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNotesSave = async (newNotes: string) => {
    if (sessionData) {
      try {
        setSessionData((prev: any) => ({ ...prev, notes: newNotes }));
        await updateSession(sessionData.id, { notes: newNotes });
      } catch (error) {
        console.error("Failed to save notes:", error);
        throw error;
      }
    }
  };

  const handleAudioUploadSuccess = async (s3Key: string) => {
    if (sessionData) {
      // Refresh the audio URL so the player picks up the new audio
      try {
        const url = await generatePresignedGetObject(s3Key);
        setAudioUrl(url);
        setSessionData((prev: any) => ({ ...prev, audioStorageKey: s3Key }));
      } catch (error) {
        console.error("Error generating presigned audio URL after upload:", error);
      }
    }
  };

  const handleRenameSpeaker = async (speakerId: string, newName: string) => {
    if (!sessionData) return;
    const currentNames = (sessionData.speakerNames as Record<string, string>) || {};
    const updatedNames = { ...currentNames, [speakerId]: newName };
    
    try {
      setSessionData((prev: any) => ({ ...prev, speakerNames: updatedNames }));
      await updateSession(sessionData.id, { speakerNames: updatedNames });
    } catch (error) {
      console.error("Failed to rename speaker:", error);
      alert("Failed to rename speaker.");
    }
  };

  if (!sessionData) {
    return <div>Loading session...</div>;
  }

  const metrics = sessionData.transcriptJson ? parseSessionMetrics(sessionData.transcriptJson) : null;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{sessionData.name}</h1>
      {sessionData.description && (
        <p className="text-lg text-gray-700 mb-6">{sessionData.description}</p>
      )}

      {audioUrl && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Session Audio</h2>
          <audio ref={audioRef} controls src={audioUrl} className="w-full"></audio>
        </div>
      )}

      <div className="mb-6">
        <AudioRecorder sessionId={sessionData.id} onUploadSuccess={handleAudioUploadSuccess} />
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Session Length</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {Math.floor(metrics.totalDuration / 60)}m {Math.floor(metrics.totalDuration % 60)}s
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Words</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.totalWordCount.toLocaleString()}</p>
          </div>
          <SpeakerStats 
            distribution={metrics.speakerDistribution} 
            speakerNames={sessionData.speakerNames as Record<string, string>}
            onRename={handleRenameSpeaker}
          />
        </div>
      )}

      <AISummary sessionId={sessionData.id} initialSummary={sessionData.summary} />

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Transcript</h2>
          {sessionData.transcriptionJobId && !sessionData.transcriptJson && (
            <button
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {isRefreshing ? "Checking..." : "Refresh Transcription Status"}
            </button>
          )}
        </div>
        {sessionData.transcriptJson ? (
          <TranscriptDisplay
            transcriptJson={sessionData.transcriptJson}
            audioRef={audioRef}
            speakerNames={sessionData.speakerNames as Record<string, string>}
          />
        ) : (
          <p className="text-gray-500">No transcript available yet.</p>
        )}
      </div>

      <div className="mt-8">
        <NotesEditor
          initialNotes={sessionData.notes}
          onSave={handleNotesSave}
          sessionId={sessionData.id}
        />
      </div>
    </div>
  );
}
