import type { RequestHandler } from "express";
import { z } from "zod";
import { findOwnedProject } from "../lib/ownership";
import { answerQuestion } from "../services/query.service";

const askSchema = z.object({
  question: z.string().min(1).max(2000),
  documentId: z.string().optional(),
});

export const ask: RequestHandler<{ projectId: string }> = async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid question" });
    return;
  }
  const { question, documentId } = parsed.data;

  const project = await findOwnedProject(req.params.projectId, req.user!.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    await answerQuestion(
      project.id,
      question,
      documentId,
      {
        onSources: (sources) => res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`),
        onToken: (token) => res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`),
      },
      controller.signal,
    );
    res.write(`event: done\ndata: {}\n\n`);
  } catch (error) {
    if (!controller.signal.aborted) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    }
  } finally {
    res.end();
  }
};
