import { PrismaClient } from '@prisma/client';
import { parseSessionMetrics } from './src/lib/metrics/parser';

const prisma = new PrismaClient();

async function run() {
  const session = await prisma.session.findFirst({
    where: {
      transcriptJson: {
        not: Prisma.DbNull
      }
    }
  });

  if (!session || !session.transcriptJson) {
    console.log('No session with transcriptJson found.');
    return;
  }

  console.log('Found session:', session.name);
  const metrics = parseSessionMetrics(session.transcriptJson);
  console.log('Metrics:', JSON.stringify(metrics, null, 2));
}

import { Prisma } from '@prisma/client';
run().catch(console.error).finally(() => prisma.$disconnect());
