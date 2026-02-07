const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'test@example.com';
  const password = 'password123';
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email: email },
      update: {},
      create: {
        email: email,
        name: 'Test User',
        password: hashedPassword,
      },
    });
    console.log(`User created/found: ${user.email}`);
    console.log(`Password: ${password}`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();