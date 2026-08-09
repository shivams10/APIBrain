import type { RequestHandler } from "express";
import { z } from "zod";
import { findOwnedProject } from "../lib/ownership";
import * as projectService from "../services/project.service";
import * as ingestionService from "../services/ingestion.service";

const createProjectSchema = z.object({ name: z.string().min(1).max(200) });

export const create: RequestHandler = async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid project name" });
    return;
  }
  const project = await projectService.createProject(req.user!.id, parsed.data.name);
  res.status(201).json(project);
};

export const list: RequestHandler = async (req, res) => {
  res.json(await projectService.listProjects(req.user!.id));
};

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
    const document = await ingestionService.ingestFile(project.id, req.body.title, req.file);
    res.status(202).json(document);
    return;
  }

  const parsed = urlIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Provide either a file upload or a { title, url } JSON body" });
    return;
  }

  const document = await ingestionService.ingestUrl(project.id, parsed.data.title, parsed.data.url);
  res.status(202).json(document);
};

export const listDocuments: RequestHandler<{ projectId: string }> = async (req, res) => {
  const project = await findOwnedProject(req.params.projectId, req.user!.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(await ingestionService.listDocuments(project.id));
};
