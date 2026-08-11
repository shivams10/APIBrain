import "dotenv/config";
import crypto from "node:crypto";
import { Worker, type Job } from "bullmq";
import { prisma } from "./lib/prisma";
import { redisConnection, type IngestionJobData } from "./lib/queue";
import { downloadObject } from "./lib/s3";
import { extractText } from "./lib/extract";
import { chunkText } from "./lib/chunking";
import { embedTexts } from "./lib/embeddings";

async function processIngestionJob(job: Job<IngestionJobData>) {
  const document = await prisma.document.findUniqueOrThrow({
    where: { id: job.data.documentId },
  });

  await prisma.document.update({ where: { id: document.id }, data: { status: "PROCESSING" } });

  const source =
    document.sourceType === "URL" ? document.sourceUrl! : await downloadObject(document.storageKey!);

  const text = await extractText(document.sourceType, source);
  const chunks = await chunkText(text);

  // OpenAI's embeddings endpoint caps total tokens *per request* across the whole batch, not
  // per chunk — a large document (thousands of chunks) sent in one call can blow past that
  // ceiling. Batch in fixed-size groups so document size can't crash the embedding call.
  const EMBEDDING_BATCH_SIZE = 100;
  for (let batchStart = 0; batchStart < chunks.length; batchStart += EMBEDDING_BATCH_SIZE) {
    const batchChunks = chunks.slice(batchStart, batchStart + EMBEDDING_BATCH_SIZE);
    const batchEmbeddings = await embedTexts(batchChunks);

    for (let i = 0; i < batchChunks.length; i++) {
      const vectorLiteral = `[${batchEmbeddings[i].join(",")}]`;
      await prisma.$executeRaw`
        INSERT INTO chunks (id, "documentId", content, embedding, "chunkIndex", "createdAt")
        VALUES (${crypto.randomUUID()}, ${document.id}, ${batchChunks[i]}, ${vectorLiteral}::vector, ${batchStart + i}, now())
      `;
    }
  }

  await prisma.document.update({ where: { id: document.id }, data: { status: "READY" } });
}

const worker = new Worker<IngestionJobData>(
  "ingestion",
  async (job) => {
    try {
      await processIngestionJob(job);
    } catch (error) {
      await prisma.document.update({
        where: { id: job.data.documentId },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      });
      throw error; // still let BullMQ record the job as failed
    }
  },
  { connection: redisConnection },
);

worker.on("completed", (job) => console.log(`Ingestion complete: ${job.id}`));
worker.on("failed", (job, err) => console.error(`Ingestion failed: ${job?.id}`, err.message));

console.log("Ingestion worker started");