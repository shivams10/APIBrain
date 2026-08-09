import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { findOwnedDocument } from "../lib/ownership";

export const getById: RequestHandler<{ documentId: string }> = async (req, res) => {
  const document = await findOwnedDocument(req.params.documentId, req.user!.id)

  if (!document) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(document);
};
