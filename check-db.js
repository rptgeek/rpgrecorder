require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function checkDatabase() {
  console.log('Connecting to database...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany();
    const campaigns = await prisma.campaign.findMany();
    const sessions = await prisma.session.findMany();

    console.log('\n=== DATABASE CONTENTS ===\n');

    console.log(`Users (${users.length} total):`);
    users.forEach(u => {
      console.log(`  - ID: ${u.id}`);
      console.log(`    Email: ${u.email}`);
      console.log(`    Name: ${u.name}`);
      console.log(`    Password: ${u.password ? 'YES (legacy)' : 'NO (Cognito)'}`);
      console.log(`    Created: ${u.createdAt}`);
      console.log('');
    });

    console.log(`Campaigns (${campaigns.length} total):`);
    campaigns.forEach(c => {
      console.log(`  - ${c.name} (${c.id}) - User: ${c.userId}`);
    });

    console.log(`\nSessions (${sessions.length} total):`);
    sessions.forEach(s => {
      console.log(`  - ${s.name} (${s.id}) - User: ${s.userId}`);
    });
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkDatabase();
