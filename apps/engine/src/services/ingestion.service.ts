import { prisma } from "../lib/prisma";
import { uploadObject } from "../lib/s3";
import { ingestionQueue } from "../lib/queue";

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

export async function ingestFile(projectId: string, title: string | undefined, file: UploadedFile) {
  const sourceType = file.mimetype === "application/pdf" ? "PDF" : "MARKDOWN";

  const document = await prisma.document.create({
    data: { projectId, title: title || file.originalname, sourceType, status: "PENDING" },
  });

  const storageKey = `documents/${document.id}`;
  await uploadObject(storageKey, file.buffer, file.mimetype);
  const updatedDocument = await prisma.document.update({
    where: { id: document.id },
    data: { storageKey },
  });

  await ingestionQueue.add("ingest", { documentId: document.id });
  return updatedDocument;
}

export async function ingestUrl(projectId: string, title: string, url: string) {
  const document = await prisma.document.create({
    data: { projectId, title, sourceType: "URL", sourceUrl: url, status: "PENDING" },
  });

  await ingestionQueue.add("ingest", { documentId: document.id });
  return document;
}

export function listDocuments(projectId: string) {
  return prisma.document.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
}
