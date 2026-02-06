export interface SpeakerStats {
  duration: number;
  words: number;
}

export interface SessionMetrics {
  totalDuration: number;
  totalWordCount: number;
  speakerDistribution: Record<string, SpeakerStats>;
}

export function parseSessionMetrics(transcriptJson: any): SessionMetrics {
  if (!transcriptJson || !transcriptJson.results) {
    return {
      totalDuration: 0,
      totalWordCount: 0,
      speakerDistribution: {},
    };
  }

  // AWS Transcribe speaker diarization data is in audio_segments
  const segments = transcriptJson.results.audio_segments || [];
  const speakerDistribution: Record<string, SpeakerStats> = {};
  let totalWordCount = 0;
  let maxEndTime = 0;

  segments.forEach((seg: any) => {
    const speaker = seg.speaker_label || 'unknown';
    const startTime = parseFloat(seg.start_time) || 0;
    const endTime = parseFloat(seg.end_time) || 0;
    const duration = Math.max(0, endTime - startTime);
    const words = seg.transcript ? seg.transcript.trim().split(/\s+/).filter(Boolean).length : 0;

    if (endTime > maxEndTime) {
      maxEndTime = endTime;
    }

    totalWordCount += words;

    if (!speakerDistribution[speaker]) {
      speakerDistribution[speaker] = { duration: 0, words: 0 };
    }
    speakerDistribution[speaker].duration += duration;
    speakerDistribution[speaker].words += words;
  });

  return {
    totalDuration: maxEndTime,
    totalWordCount,
    speakerDistribution,
  };
}
