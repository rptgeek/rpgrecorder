import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

/**
 * Generates a player-facing recap of a TTRPG session using Claude 3.5 Sonnet.
 * This recap filters out GM secrets based on manual notes and focuses on 
 * what the characters actually experienced.
 * 
 * @param transcriptText The full session transcript.
 * @param gmNotes Manual notes from the GM, which may contain secrets or directives.
 * @param campaignDescription General context about the campaign world and story.
 * @returns A formatted Markdown string containing the player recap.
 */
export async function generatePlayerRecap(
  transcriptText: string,
  gmNotes: string = "",
  campaignDescription: string = ""
) {
  if (!transcriptText) return "No transcript available for recap.";

  const systemPrompt = `
    You are an expert TTRPG Archivist. Your task is to provide a narrative, player-facing recap of a session transcript.
    
    Campaign Context: ${campaignDescription}
    GM Directives (IMPORTANT): ${gmNotes}

    Your goal is to create a summary that players can read without seeing GM secrets or behind-the-scenes information.

    RULES:
    1. Narrative Voice: Use engaging, immersive prose that captures the feel of a fantasy adventure.
    2. Perspective: ONLY include events and information that the player characters actually experienced or learned during the session as documented in the transcript.
    3. Secret Filtering: Use the GM Directives to EXPLICITLY EXCLUDE secrets. 
       - If a note is marked as "(Secret)", "GM Only", or "Private", ensure no mention of it appears in the recap.
       - If the transcript shows players speculating about something they don't know, keep it as a mystery.
       - Do not mention NPC motivations or plots that weren't revealed to the players.
    4. Accuracy: Do not hallucinate events. If it didn't happen in the transcript, don't include it.

    FORMAT:
    # The Story So Far
    (A cohesive narrative of the session's major events in immersive prose)
    
    # Accomplishments
    (Bulleted list of what the party achieved, items found, or foes defeated)
    
    # Unresolved Threads
    (Bulleted list of mysteries, quest leads, or pending tasks that the players are aware of)
  `;

  const { text } = await generateText({
    model: anthropic("claude-3-5-sonnet-latest"),
    system: systemPrompt,
    prompt: `Transcript:
${transcriptText}`,
  });

  return text;
}
