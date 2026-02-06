/**
 * User Data Export Script
 *
 * Exports all user data from PostgreSQL as backup before Cognito migration (AUTH-06).
 *
 * Security: Excludes password hashes from export to prevent credential exposure.
 *
 * Usage:
 *   npx ts-node scripts/export-users.ts
 *
 * Output:
 *   backups/users-{timestamp}.json
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

export async function exportUsers() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups");
  const filename = `users-${timestamp}.json`;
  const filepath = path.join(backupDir, filename);

  console.log("Starting user data export...");

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`Created backup directory: ${backupDir}`);
  }

  // Export users WITHOUT password hashes (security risk if backup is compromised)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      // SECURITY: Exclude password field from export
      // password: false (explicit exclusion via omission from select)
    },
  });

  // Write to JSON file with pretty formatting
  fs.writeFileSync(filepath, JSON.stringify(users, null, 2));

  console.log(`✓ Exported ${users.length} users to ${filepath}`);
  console.log(`✓ Backup size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);

  return { count: users.length, filepath };
}

// Run if executed directly (not imported)
if (require.main === module) {
  exportUsers()
    .then((result) => {
      console.log("\n=== Export Complete ===");
      console.log(`Users exported: ${result.count}`);
      console.log(`Output file: ${result.filepath}`);
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
