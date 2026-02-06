import { prisma } from "@/lib/prisma";

export async function searchSessions(query: string, userId: string) {
  if (!query) return [];

  // websearch_to_tsquery allows for a more natural search syntax (e.g., "word1 word2", "word1 -word2", "word1 OR word2")
  const results = await prisma.$queryRaw`
    SELECT 
      id, 
      name, 
      description, 
      "createdAt",
      "campaignId",
      ts_rank(search_vector, websearch_to_tsquery('english', ${query})) as rank,
      ts_headline('english', transcriptText, websearch_to_tsquery('english', ${query}), 'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15') as snippet
    FROM "Session"
    WHERE 
      search_vector @@ websearch_to_tsquery('english', ${query})
      AND "userId" = ${userId}
    ORDER BY rank DESC
    LIMIT 20;
  `;

  return results;
}
