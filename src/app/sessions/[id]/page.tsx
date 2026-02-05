"use client"; // Add use client directive

import { getSessionById, updateSession } from "@/lib/actions/session"; // Import updateSession
import { generatePresignedGetObject } from "@/lib/aws/s3";
import { notFound } from "next/navigation";
import TranscriptDisplay from "@/components/TranscriptDisplay";
import React, { useRef, useState, useEffect } from "react";
import NotesEditor from "@/components/NotesEditor";
import AudioRecorder from "@/components/AudioRecorder"; // Import AudioRecorder

interface SessionDetailPageProps {
  params: {
    id: string;
  };
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { id } = params;
  const [sessionData, setSessionData] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
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

  if (!sessionData) {
    return <div>Loading session...</div>;
  }

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

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-2xl font-semibold mb-2">Transcript</h2>
        {sessionData.transcriptJson ? (
          <TranscriptDisplay
            transcriptJson={sessionData.transcriptJson}
            audioRef={audioRef}
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
