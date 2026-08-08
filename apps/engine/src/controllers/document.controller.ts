import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";

export const getById: RequestHandler<{ documentId: string }> = async (req, res) => {
  const document = await prisma.document.findFirst({
    where: { id: req.params.documentId, project: { userId: req.user!.id } },
  });
  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(document);
};
