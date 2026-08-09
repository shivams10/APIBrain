import { prisma } from "./prisma";
import { Prisma } from "../generated/prisma/client";
import { embedTexts } from "./embeddings";

const TOP_K = 6;

export type RetrievedChunk = {
  id: string;
  documentId: string;
  title: string;
  chunkIndex: number;
  content: string;
  distance: number;
};

export async function retrieveRelevantChunks(
  projectId: string,
  question: string,
  documentId?: string,
): Promise<RetrievedChunk[]> {
  const [queryEmbedding] = await embedTexts([question]);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const documentFilter = documentId ? Prisma.sql`AND d.id = ${documentId}` : Prisma.empty;

  return prisma.$queryRaw<RetrievedChunk[]>(Prisma.sql`
    SELECT c.id, c.content, c."chunkIndex", d.id as "documentId", d.title,
           c.embedding <=> ${vectorLiteral}::vector AS distance
    FROM chunks c
    JOIN documents d ON d.id = c."documentId"
    WHERE d."projectId" = ${projectId}
      AND d.status = 'READY'
      ${documentFilter}
    ORDER BY distance ASC
    LIMIT ${TOP_K}
  `);
}