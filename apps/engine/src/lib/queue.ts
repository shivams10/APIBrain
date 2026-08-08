import { Queue } from "bullmq";
import IORedis from "ioredis";

export const redisConnection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // required by BullMQ's blocking connection model
});

export type IngestionJobData = { documentId: string };

export const ingestionQueue = new Queue<IngestionJobData>("ingestion", {
  connection: redisConnection,
});