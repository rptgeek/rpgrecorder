import { config } from 'dotenv';
config();

import prisma from './src/lib/prisma';

async function checkDatabase() {
  try {
    const users = await prisma.user.findMany();
    const campaigns = await prisma.campaign.findMany();
    const sessions = await prisma.session.findMany();

    console.log('=== DATABASE CONTENTS ===\n');

    console.log(`Users (${users.length} total):`);
    users.forEach(u => {
      console.log(`  - ${u.id} | ${u.email} | ${u.name} | Password: ${u.password ? 'YES' : 'NO'}`);
    });

    console.log(`\nCampaigns (${campaigns.length} total):`);
    campaigns.forEach(c => {
      console.log(`  - ${c.id} | ${c.name} | User: ${c.userId}`);
    });

    console.log(`\nSessions (${sessions.length} total):`);
    sessions.forEach(s => {
      console.log(`  - ${s.id} | ${s.name} | User: ${s.userId}`);
    });
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
