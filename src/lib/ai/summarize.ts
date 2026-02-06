import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export async function summarizeSession(transcriptText: string, campaignDescription?: string) {
  if (!transcriptText) return "No transcript available for summarization.";

  const systemPrompt = `
    You are an expert TTRPG Archivist and Game Master's Assistant.
    Your task is to provide a comprehensive, structured summary of a gaming session transcript.
    
    ${campaignDescription ? `Campaign Context: ${campaignDescription}` : ""}

    Please structure the summary exactly as follows:
    
    # Executive Summary
    (2-3 paragraphs covering the main events and outcomes of the session)
    
    # Key NPCs Met & Their Roles
    (List NPCs and a brief description of their involvement this session)
    
    # Important Items & Loot
    (List any notable items, treasure, or quest objects obtained or discovered)
    
    # Significant Plot Hooks & Unresolved Threads
    (Identify potential story leads or mysteries that remain open)
    
    # Notable Quotes & Memorable Moments
    (Capture 3-5 high-impact quotes or particularly funny/dramatic moments)
    
    Use professional but engaging language suitable for a fantasy setting.
  `;

  const { text } = await generateText({
    model: anthropic("claude-3-5-sonnet-latest"),
    system: systemPrompt,
    prompt: `Transcript:
${transcriptText}`,
  });

  return text;
}
