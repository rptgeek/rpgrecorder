import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT "search_vector" FROM "Session" LIMIT 1`;
    console.log('FTS Check Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('FTS Check Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
