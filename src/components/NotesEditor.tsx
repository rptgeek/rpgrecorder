"use client";

import React, { useState, useEffect } from "react";

interface NotesEditorProps {
  initialNotes: string | null;
  onSave: (notes: string) => Promise<void>;
  sessionId: string; // Needed for optimistic updates or specific session context
}

const NotesEditor: React.FC<NotesEditorProps> = ({ initialNotes, onSave, sessionId }) => {
  const [notes, setNotes] = useState(initialNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Update notes if initialNotes prop changes
  useEffect(() => {
    setNotes(initialNotes || "");
  }, [initialNotes]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await onSave(notes);
      setSaveStatus("Notes saved successfully!");
    } catch (error) {
      console.error("Failed to save notes:", error);
      setSaveStatus("Failed to save notes.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000); // Clear status after 3 seconds
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white">
      <h3 className="text-xl font-semibold mb-3">Session Notes</h3>
      <textarea
        className="w-full p-2 border rounded-md resize-y min-h-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add your session notes here..."
      />
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isSaving ? "Saving..." : "Save Notes"}
        </button>
        {saveStatus && (
          <p className={`text-sm ${saveStatus.includes("successfully") ? "text-green-600" : "text-red-600"}`}>
            {saveStatus}
          </p>
        )}
      </div>
    </div>
  );
};

export default NotesEditor;
