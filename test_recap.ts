import { generatePlayerRecap } from "./src/lib/ai/recap";

async function test() {
  const transcript = `
    GM: You arrive at the gates of Eldoria. The guard looks at you suspiciously.
    Player 1: I try to bribe him with 5 gold.
    GM: (Rolls) He takes the gold and lets you in. 
    GM: (Aside to himself) They don't know he's actually a cultist spy.
  `;
  const notes = `The guard is a cultist spy. (Secret)`;
  const campaign = `A world where cultists are infiltrating high positions.`;

  console.log("Testing generatePlayerRecap...");
  const recap = await generatePlayerRecap(transcript, notes, campaign);
  console.log("--- RECAP START ---");
  console.log(recap);
  console.log("--- RECAP END ---");

  if (recap.toLowerCase().includes("spy") || recap.toLowerCase().includes("cultist")) {
    console.log("WARNING: Secret might have leaked!");
  } else {
    console.log("SUCCESS: Secret seems to be filtered out.");
  }
}

test().catch(console.error);
