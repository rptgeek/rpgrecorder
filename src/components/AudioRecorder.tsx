"use client";

import React, { useState, useRef } from "react";
import { updateSession } from "@/lib/actions/session"; // Import updateSession

interface AudioRecorderProps {
  sessionId: string;
  onUploadSuccess?: (s3Key: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ sessionId, onUploadSuccess }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null); // Store blob for upload
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        setRecordedAudioBlob(audioBlob); // Save the blob
        audioChunksRef.current = []; // Clear chunks for next recording
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordedAudioUrl(null); // Clear previous recording on new start
      setRecordedAudioBlob(null);
      setUploadMessage(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure it's connected and permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop()); // Stop microphone access
      setIsRecording(false);
    }
  };

  const playRecordedAudio = () => {
    if (audioRef.current && recordedAudioUrl) {
      audioRef.current.play();
    }
  };

  const uploadAudio = async () => {
    if (!recordedAudioBlob || isUploading) return;

    setIsUploading(true);
    setUploadMessage("Uploading...");

    try {
      // 1. Get presigned URL from our API
      const filename = `session-${sessionId}-${Date.now()}.webm`;
      const contentType = "audio/webm";

      const presignedResponse = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename, contentType }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.message || "Failed to get presigned URL.");
      }

      const { url, fields, key: s3Key } = await presignedResponse.json();

      // 2. Upload directly to S3 using the presigned URL and fields
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append("file", recordedAudioBlob); // Actual audio file should be last

      const s3UploadResponse = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!s3UploadResponse.ok) {
        throw new Error("Failed to upload audio to S3.");
      }

      // 3. Update session in database with S3 object key
      await updateSession(sessionId, { audioStorageKey: s3Key });

      setUploadMessage("Upload successful!");
      if (onUploadSuccess) {
        onUploadSuccess(s3Key);
      }
    } catch (error: any) {
      console.error("Error during audio upload:", error);
      setUploadMessage(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadMessage(null), 5000);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-3">Audio Recorder</h2>
      <div className="flex space-x-2 mb-4">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isRecording ? "Recording..." : "Start Recording"}
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400"
        >
          Stop Recording
        </button>
        <button
          onClick={playRecordedAudio}
          disabled={!recordedAudioUrl || isRecording}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
        >
          Play
        </button>
        <button
          onClick={uploadAudio}
          disabled={!recordedAudioBlob || isUploading || isRecording}
          className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400"
        >
          {isUploading ? "Uploading..." : "Upload to S3"}
        </button>
      </div>

      {recordedAudioUrl && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Recorded Audio:</h3>
          <audio ref={audioRef} src={recordedAudioUrl} controls className="w-full" />
        </div>
      )}

      {uploadMessage && (
        <p className={`mt-2 text-sm ${uploadMessage.includes("successful") ? "text-green-600" : "text-red-600"}`}>
          {uploadMessage}
        </p>
      )}
    </div>
  );
};

export default AudioRecorder;

