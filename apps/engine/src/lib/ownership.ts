import { prisma } from "./prisma";

export function findOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } });
}

export function findOwnedDocument(documentId: string, userId: string) {
  return prisma.document.findFirst({ where: { id: documentId, project: { userId } } });
}