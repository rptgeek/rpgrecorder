"use client";

import React, { useState } from 'react';

interface SpeakerStatsProps {
  distribution: Record<string, { duration: number; words: number }>;
  speakerNames?: Record<string, string>;
  onRename: (speakerId: string, newName: string) => Promise<void>;
}

export default function SpeakerStats({ distribution, speakerNames = {}, onRename }: SpeakerStatsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const totalWords = Object.values(distribution).reduce((acc, curr) => acc + curr.words, 0);
  const speakers = Object.entries(distribution).sort((a, b) => b[1].words - a[1].words);

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setNewName(currentName);
  };

  const handleSave = async (id: string) => {
    await onRename(id, newName);
    setEditingId(null);
  };

  if (speakers.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold mb-4">Speaker Distribution</h3>
      <div className="space-y-4">
        {speakers.map(([id, stats]) => {
          const name = speakerNames[id] || id;
          const percentage = totalWords > 0 ? (stats.words / totalWords) * 100 : 0;

          return (
            <div key={id} className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                {editingId === id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSave(id)}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{name}</span>
                    <button
                      onClick={() => handleStartEdit(id, name)}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Rename
                    </button>
                  </div>
                )}
                <span className="text-sm text-gray-500">
                  {stats.words} words ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {Math.floor(stats.duration / 60)}m {Math.floor(stats.duration % 60)}s talking time
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
