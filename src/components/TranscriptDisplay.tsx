import React, { useRef, useEffect, useState } from "react";

interface TranscriptDisplayProps {
  transcriptJson: any; // AWS Transcribe output JSON structure can vary, using 'any' for now
  audioRef: React.RefObject<HTMLAudioElement>;
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ transcriptJson, audioRef }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [audioRef]);

  if (!transcriptJson || typeof transcriptJson !== "object") {
    return <p>Invalid or empty transcript data.</p>;
  }

  // Assuming a basic structure where 'results' contains 'transcripts' and 'items' for word-level data
  const fullTranscript = transcriptJson.results?.transcripts?.[0]?.transcript;
  const items = transcriptJson.results?.items; // Array of words with start_time, end_time, type, content
  const speakerLabels = transcriptJson.results?.speaker_labels; // Array of { start_time, speaker_label, end_time }

  if (!fullTranscript || !items) {
    return <p>No detailed transcript data available for synchronization.</p>;
  }

  // Group words into segments by speaker for display
  const segments: { speaker: string; words: { content: string; start_time?: number; end_time?: number }[] }[] = [];
  let currentSegment: { speaker: string; words: { content: string; start_time?: number; end_time?: number }[] } | null = null;
  let speakerMap: { [key: string]: string } = {};
  let speakerIndex = 0;

  if (speakerLabels?.segments) {
    speakerLabels.segments.forEach((speakerSegment: any) => {
      if (!speakerMap[speakerSegment.speaker_label]) {
        speakerMap[speakerSegment.speaker_label] = `Speaker ${speakerIndex++}`;
      }
    });
  }


  items.forEach((item: any) => {
    if (item.type === "pronunciation") {
      const startTime = parseFloat(item.start_time);
      const endTime = parseFloat(item.end_time);

      let speaker = "Unknown Speaker";
      if (speakerLabels?.segments) {
        // Find the speaker for this word's time range
        const foundSpeaker = speakerLabels.segments.find(
          (s: any) => startTime >= parseFloat(s.start_time) && endTime <= parseFloat(s.end_time)
        );
        if (foundSpeaker) {
          speaker = speakerMap[foundSpeaker.speaker_label] || foundSpeaker.speaker_label;
        }
      }

      if (!currentSegment || currentSegment.speaker !== speaker) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = { speaker, words: [] };
      }
      currentSegment.words.push({ content: item.content, start_time: startTime, end_time: endTime });
    } else if (item.type === "punctuation" && currentSegment) {
      // Append punctuation to the last word
      const lastWord = currentSegment.words[currentSegment.words.length - 1];
      if (lastWord) {
        lastWord.content += item.content;
      }
    }
  });

  if (currentSegment) {
    segments.push(currentSegment);
  }

  const handleWordClick = (startTime?: number) => {
    if (audioRef.current && startTime !== undefined) {
      audioRef.current.currentTime = startTime;
      audioRef.current.play(); // Auto-play after seeking
    }
  };

  return (
    <div ref={transcriptContainerRef} className="transcript-display text-gray-800 leading-relaxed">
      {segments.map((segment, segIndex) => (
        <p key={segIndex} className="mb-2">
          <strong>{segment.speaker}:</strong>{" "}
          {segment.words.map((word, wordIndex) => {
            const isHighlighted =
              word.start_time !== undefined &&
              word.end_time !== undefined &&
              currentTime >= word.start_time &&
              currentTime < word.end_time;
            return (
              <span
                key={`${segIndex}-${wordIndex}`}
                className={`cursor-pointer ${isHighlighted ? "bg-yellow-300 rounded px-1" : ""}`}
                onClick={() => handleWordClick(word.start_time)}
              >
                {word.content}{" "}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
};

export default TranscriptDisplay;
