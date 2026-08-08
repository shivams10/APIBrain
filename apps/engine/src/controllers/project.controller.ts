import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { uploadObject } from "../lib/s3";
import { ingestionQueue } from "../lib/queue";

const createProjectSchema = z.object({ name: z.string().min(1).max(200) });

export const create: RequestHandler = async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid project name" });
    return;
  }
  const project = await prisma.project.create({
    data: { name: parsed.data.name, userId: req.user!.id },
  });
  res.status(201).json(project);
};

export const list: RequestHandler = async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(projects);
};

async function findOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } });
}

const urlIngestSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
});

// POST /projects/:projectId/documents — multipart file upload OR JSON { title, url }
export const ingestDocument: RequestHandler<{ projectId: string }> = async (req, res) => {
  const project = await findOwnedProject(req.params.projectId, req.user!.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (req.file) {
    const sourceType = req.file.mimetype === "application/pdf" ? "PDF" : "MARKDOWN";
    const title = req.body.title || req.file.originalname;

    const document = await prisma.document.create({
      data: { projectId: project.id, title, sourceType, status: "PENDING" },
    });

    const storageKey = `documents/${document.id}`;
    await uploadObject(storageKey, req.file.buffer, req.file.mimetype);
    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: { storageKey },
    });

    await ingestionQueue.add("ingest", { documentId: document.id });
    res.status(202).json(updatedDocument);
    return;
  }

  const parsed = urlIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide either a file upload or a { title, url } JSON body" });
    return;
  }

  const document = await prisma.document.create({
    data: {
      projectId: project.id,
      title: parsed.data.title,
      sourceType: "URL",
      sourceUrl: parsed.data.url,
      status: "PENDING",
    },
  });

  await ingestionQueue.add("ingest", { documentId: document.id });
  res.status(202).json(document);
};

export const listDocuments: RequestHandler<{ projectId: string }> = async (req, res) => {
  const project = await findOwnedProject(req.params.projectId, req.user!.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const documents = await prisma.document.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(documents);
};
