/**
 * Campaign and Session Data Export Script
 *
 * Exports all Campaign and Session data from PostgreSQL for migration to DynamoDB.
 *
 * Usage:
 *   node scripts/export-campaigns-sessions.js
 *
 * Output:
 *   campaigns.json
 *   sessions.json
 */

require('dotenv').config(); // Load environment variables from .env file

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

// Temporarily log DATABASE_URL to debug
console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Revert to simple PrismaClient instantiation, assuming DATABASE_URL is now correctly in process.env
const prisma = new PrismaClient();

async function exportCampaignsAndSessions() {
  const currentDir = process.cwd();

  console.log("Starting Campaign and Session data export...");

  // Export Campaigns
  const campaigns = await prisma.campaign.findMany({
    // Include all necessary fields for migration
    include: {
      user: {
        select: {
          id: true, // Need original userId for mapping
        },
      },
    },
  });
  const campaignsOutputPath = path.join(currentDir, "campaigns.json");
  fs.writeFileSync(campaignsOutputPath, JSON.stringify(campaigns, null, 2));
  console.log(`✓ Exported ${campaigns.length} campaigns to ${campaignsOutputPath}`);

  // Export Sessions
  const sessions = await prisma.session.findMany({
    // Include all necessary fields for migration
    include: {
      user: {
        select: {
          id: true, // Need original userId for mapping
        },
      },
    },
  });
  const sessionsOutputPath = path.join(currentDir, "sessions.json");
  fs.writeFileSync(sessionsOutputPath, JSON.stringify(sessions, null, 2));
  console.log(`✓ Exported ${sessions.length} sessions to ${sessionsOutputPath}`);

  return {
    campaignsCount: campaigns.length,
    campaignsFile: campaignsOutputPath,
    sessionsCount: sessions.length,
    sessionsFile: sessionsOutputPath,
  };
}

// Run if executed directly (not imported)
if (require.main === module) {
  exportCampaignsAndSessions()
    .then((result) => {
      console.log("\n=== Export Complete ===");
      console.log(`Campaigns exported: ${result.campaignsCount}`);
      console.log(`Campaigns output file: ${result.campaignsFile}`);
      console.log(`Sessions exported: ${result.sessionsCount}`);
      console.log(`Sessions output file: ${result.sessionsFile}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n=== Export Failed ===");
      console.error("Error:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
